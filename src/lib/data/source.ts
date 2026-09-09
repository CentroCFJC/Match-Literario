/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  FUENTE DE DATOS — ESTE ES EL ÚNICO ARCHIVO QUE HAY QUE TOCAR EN LA FASE 2 ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * Las cuatro funciones exportadas aquí son la frontera entre la app y Google
 * Sheets. Todo lo demás (motor de match, pantallas, store, API) las consume y no
 * sabe de dónde salen los datos.
 *
 * Hay DOS spreadsheets, como en Drive:
 *   · "Base Autores"     (SHEET_AUTORES_ID)     — la app solo LEE
 *   · "Respuestas Match" (SHEET_RESPUESTAS_ID)  — la app solo ESCRIBE
 *
 * Este archivo es la frontera entre la app y los datos. Hoy está a medias a
 * propósito:
 *   · LECTURA  (autores/actividades) → mock: la base de autores aún no está lista.
 *   · ESCRITURA (respuestas)         → Google Sheets real (POST append + PATCH upsert).
 *
 * Cuando la base de autores esté lista, solo hay que rellenar `getAutores` y
 * `getActividades` con `values.get` + `filaAAutor`/`filaAActividad`.
 *
 * Ver `HANDOFF.md` para el contrato completo.
 */

import 'server-only';

import { fusionarFilaRespuestas, indiceFilaPorSessionId } from './actualizacion';
import { conReintento, getSheets } from './googleSheets';
import { ACTIVIDADES_MOCK, AUTORES_MOCK } from './mock';
import { conVozDeOrigen } from './parseo';
import { aFilaRespuestas, dispositivoDesdeUserAgent, ENCABEZADOS_RESPUESTAS } from './serializacion';
import type { Actividad, Autor, Respuesta, RespuestaEntrante } from './types';

/**
 * El parseo de las filas que se leen y la serialización de las que se escriben
 * viven en módulos aparte para poder probarlos sin `server-only`. Se reexportan
 * aquí porque conceptualmente son parte de esta capa: quien conecte Sheets solo
 * necesita mirar este archivo.
 */
export { conVozDeOrigen, filaAActividad, filaAAutor, normalizarFotoUrl } from './parseo';
export {
  aFilaRespuestas,
  dispositivoDesdeUserAgent,
  ENCABEZADOS_RESPUESTAS,
} from './serializacion';
export { fusionarFilaRespuestas, indiceFilaPorSessionId } from './actualizacion';

// ===========================================================================
// Geometría de las hojas
// ===========================================================================

/**
 * Rangos A1 de cada pestaña, con la fila de encabezados ya descontada.
 *
 * Las hojas empiezan con bloques de instrucciones para la curaduría, por eso los
 * datos no arrancan en la fila 2:
 *
 *   Autores       filas 1-2 instrucciones · fila 3 encabezados · datos desde la 4
 *   Actividades   fila 1 instrucciones    · fila 2 encabezados · datos desde la 3
 *   Respuestas    fila 1 aviso            · fila 2 encabezados · fila 3 descripciones · datos desde la 4
 *
 * Si la curaduría inserta o borra filas ahí arriba, esto es lo primero que hay
 * que revisar.
 */
export const RANGOS = {
  /** Lectura: 18 columnas, A..R, desde la fila 4. */
  autores: 'Autores!A4:R',
  /** Lectura: 10 columnas, A..J, desde la fila 3. */
  actividades: 'Actividades!A3:J',
  /** Escritura (append): 28 columnas, A..AB. */
  respuestas: 'Respuestas!A:AB',
  /** Lectura para localizar la fila a actualizar: 28 columnas, datos desde la fila 4. */
  respuestasDatos: 'Respuestas!A4:AB',
} as const;

/** Primera fila con datos reales en la pestaña `Respuestas` (ver geometría arriba). */
const FILA_DATOS_RESPUESTAS = 4;

/** Simula la latencia de red de Google Sheets para poder probar la UI de carga. */
const LATENCIA_MOCK_MS = 350;

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ===========================================================================
// Lectura
// ===========================================================================

/**
 * Devuelve todos los autores ACTIVOS de la feria.
 *
 * Contrato:
 *   - Solo `activo === true`.
 *   - Descarta filas sin `id` (la hoja viene con 1000 filas en blanco).
 *   - Descarta la fila de ejemplo `AUT000` mientras la curaduría no la borre.
 *   - Los campos multivaluados llegan canonizados contra `vocabulario.ts`.
 *   - Nunca lanza por una fila mal formada: la descarta y sigue.
 *   - Lanza SOLO si no puede leer la hoja; la UI lo traduce a la pantalla
 *     "No pudimos cargar los autores".
 *
 * TODO (lectura diferida): cuando la base de autores esté lista, reemplazar el
 *       mock por `sheets.spreadsheets.values.get({ spreadsheetId: SHEET_AUTORES_ID,
 *       range: RANGOS.autores })` y pasar cada fila por `filaAAutor`.
 *       Cachear con `revalidate = SHEETS_CACHE_TTL_SECONDS`.
 */
export async function getAutores(): Promise<Autor[]> {
  await esperar(LATENCIA_MOCK_MS);
  return AUTORES_MOCK.filter((autor) => autor.activo).map(conVozDeOrigen);
}

/**
 * Devuelve todas las actividades ACTIVAS y ya programadas.
 *
 * Contrato:
 *   - Solo `activo === true`.
 *   - Descarta las plantillas que crea el Apps Script al añadir un autor
 *     (título `[Actividad de …]`, sin `fecha` ni `hora_inicio`): todavía no son
 *     programación real y romperían la agenda.
 *   - Descarta las que no referencian ningún autor existente.
 *   - `inicioMin`/`finMin` en minutos desde medianoche; si `hora_fin` va vacía,
 *     se asume una hora de duración.
 *
 * TODO (lectura diferida): cuando la base esté lista, reemplazar el mock por
 *       `values.get({ spreadsheetId: SHEET_AUTORES_ID,
 *       range: RANGOS.actividades })` y pasar cada fila por `filaAActividad`.
 */
export async function getActividades(): Promise<Actividad[]> {
  await esperar(LATENCIA_MOCK_MS);
  const idsAutores = new Set(AUTORES_MOCK.filter((a) => a.activo).map((a) => a.id));
  return ACTIVIDADES_MOCK.filter(
    (actividad) =>
      actividad.activo && actividad.autorIds.some((autorId) => idsAutores.has(autorId)),
  );
}

// ===========================================================================
// Escritura
// ===========================================================================

/**
 * Escribe UNA fila en la pestaña `Respuestas`.
 *
 * Contrato:
 *   - Recibe la respuesta YA validada por `src/app/api/respuestas/route.ts`.
 *   - `timestamp`, `dispositivo` y `versionApp` los pone el servidor: son las
 *     columnas que la hoja marca como "(auto)".
 *   - Devuelve la fila persistida, o lanza si la escritura falla (la API lo
 *     traduce a un 502).
 */
export async function saveRespuesta(
  entrada: RespuestaEntrante,
  contexto: { userAgent?: string | null } = {},
): Promise<Respuesta> {
  const respuesta = construirRespuesta(entrada, contexto);
  const fila = aFilaRespuestas(respuesta);

  const resultado = await conReintento(() =>
    getSheets().spreadsheets.values.append({
      spreadsheetId: idRespuestas(),
      range: RANGOS.respuestas,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [fila] },
    }),
  );

  registrarEscritura(
    'CREATE',
    respuesta.sessionId,
    fila,
    filaDesdeRango(resultado.data.updates?.updatedRange) ?? 0,
  );

  return respuesta;
}

/**
 * Actualiza la fila de `Respuestas` de este `session_id` (upsert).
 *
 * Contrato:
 *   - Si el `session_id` ya existe en la hoja, se actualiza ESA fila; si no, se
 *     crea (mismo camino que `saveRespuesta`). Nunca se duplica una sesión.
 *   - El cuerpo es el completo (`RespuestaEntrante`), pero `timestamp`,
 *     `dispositivo` y `version_app` se conservan de la fila original: solo se
 *     escriben al crear.
 *   - Devuelve la fila persistida, o lanza si falla (la API lo traduce a 502).
 */
export async function updateRespuesta(
  entrada: RespuestaEntrante,
  contexto: { userAgent?: string | null } = {},
): Promise<Respuesta> {
  // 1) Localiza la fila por `session_id` (columna B), solo sobre los datos.
  const lectura = await conReintento(() =>
    getSheets().spreadsheets.values.get({
      spreadsheetId: idRespuestas(),
      range: RANGOS.respuestasDatos,
    }),
  );
  const filas = lectura.data.values ?? [];
  const indice = indiceFilaPorSessionId(filas, entrada.sessionId);

  const respuesta = construirRespuesta(entrada, contexto);

  if (indice === -1) {
    // 2a) No existía → se crea (mismo camino que el POST).
    const fila = aFilaRespuestas(respuesta);
    const resultado = await conReintento(() =>
      getSheets().spreadsheets.values.append({
        spreadsheetId: idRespuestas(),
        range: RANGOS.respuestas,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [fila] },
      }),
    );
    registrarEscritura(
      'CREATE (upsert: no existía)',
      respuesta.sessionId,
      fila,
      filaDesdeRango(resultado.data.updates?.updatedRange) ?? 0,
    );
    return respuesta;
  }

  // 2b) Existe → se actualiza esa fila, conservando las columnas "(auto)".
  const filaAnterior = filas[indice] as string[];
  const fusionada = fusionarFilaRespuestas(filaAnterior, respuesta);
  const filaHoja = FILA_DATOS_RESPUESTAS + indice;

  await conReintento(() =>
    getSheets().spreadsheets.values.update({
      spreadsheetId: idRespuestas(),
      range: `Respuestas!A${filaHoja}:AB${filaHoja}`,
      valueInputOption: 'RAW',
      requestBody: { values: [fusionada] },
    }),
  );

  registrarEscritura('UPDATE', respuesta.sessionId, fusionada, filaHoja, filaAnterior);

  // Devuelve la respuesta con el `timestamp` conservado de la fila original,
  // para que la firma refleje lo que realmente quedó guardado.
  return { ...respuesta, timestamp: fusionada[0] ?? respuesta.timestamp };
}

// ===========================================================================
// Utilidades
// ===========================================================================

/**
 * Arma la `Respuesta` completa a partir de lo que manda el cliente, poniendo
 * las columnas "(auto)" que solo escribe el servidor: `timestamp`, `dispositivo`
 * y `version_app`.
 */
function construirRespuesta(
  entrada: RespuestaEntrante,
  contexto: { userAgent?: string | null },
): Respuesta {
  return {
    ...entrada,
    timestamp: ahoraUTC(),
    dispositivo: dispositivoDesdeUserAgent(contexto.userAgent),
    versionApp: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
  };
}

/** ISO 8601 en UTC, que es lo que pide el encabezado de la hoja. */
function ahoraUTC(): string {
  return new Date().toISOString();
}

/** Id del spreadsheet "Respuestas Match" (SHEET_RESPUESTAS_ID), validado. */
function idRespuestas(): string {
  const id = process.env.SHEET_RESPUESTAS_ID;
  if (!id) throw new Error('[data] falta la variable SHEET_RESPUESTAS_ID.');
  return id;
}

/** Extrae el número de fila de un rango A1 tipo "Respuestas!A5:AB5" → 5. */
function filaDesdeRango(rango?: string | null): number | null {
  if (!rango) return null;
  const match = rango.match(/!([A-Z]+)(\d+)/);
  return match ? Number(match[2]) : null;
}

/**
 * Convierte una fila serializada (27 celdas) en un objeto legible
 * `{ nombre_columna: valor }`, para que el log muestre qué se escribió sin tener
 * que contar columnas.
 */
function filaAObjeto(fila: readonly string[]): Record<string, string> {
  const objeto: Record<string, string> = {};
  ENCABEZADOS_RESPUESTAS.forEach((encabezado, i) => {
    objeto[encabezado] = fila[i] ?? '';
  });
  return objeto;
}

/**
 * Registra en consola la escritura (create o update) con su contenido completo
 * y, en las actualizaciones, un `cambios` con solo las columnas que cambiaron.
 *
 * Es el detalle que permite ver qué llega a `Respuestas` en el log del servidor;
 * `posición` es la fila real de la hoja (o 0 si no se pudo derivar).
 */
function registrarEscritura(
  accion: string,
  sessionId: string,
  fila: readonly string[],
  posicion: number,
  filaAnterior?: readonly string[],
): void {
  const actual = filaAObjeto(fila);

  if (filaAnterior) {
    const anterior = filaAObjeto(filaAnterior);
    const cambios: Record<string, { de: string; a: string }> = {};
    for (const [columna, valor] of Object.entries(actual)) {
      if (anterior[columna] !== valor) cambios[columna] = { de: anterior[columna], a: valor };
    }
    console.info(
      `[data] ${accion} Respuestas · session ${sessionId} · posición #${posicion}`,
      { cambios, fila: actual },
    );
    return;
  }

  console.info(
    `[data] ${accion} Respuestas · session ${sessionId} · posición #${posicion}`,
    { fila: actual },
  );
}

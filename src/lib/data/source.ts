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
 * Este archivo es la frontera entre la app y los datos:
 *   · LECTURA  (autores/actividades) → Google Sheets real, con cacheo y fallback
 *                                      al mock cuando no hay configuración.
 *   · ESCRITURA (respuestas)         → Google Sheets real (POST append + PATCH upsert).
 *
 * Ver `HANDOFF.md` para el contrato completo.
 */

import 'server-only';

import { unstable_cache } from 'next/cache';

import { fusionarFilaRespuestas, indiceFilaPorSessionId } from './actualizacion';
import { conReintento, getSheets, haySheets } from './googleSheets';
import { ACTIVIDADES_MOCK, AUTORES_MOCK } from './mock';
import { conVozDeOrigen, filaAActividad, filaAAutor } from './parseo';
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
  /** Lectura: 19 columnas, A..S, desde la fila 4. */
  autores: 'Autores!A4:S',
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
 *   - Descarta filas sin `id` (la hoja viene con filas en blanco al final).
 *   - Descarta la fila de ejemplo `AUT000` mientras la curaduría no la borre.
 *   - Los campos multivaluados llegan canonizados contra `vocabulario.ts`.
 *   - Nunca lanza por una fila mal formada: la descarta y sigue.
 *   - Lanza SOLO si no puede leer la hoja; la UI lo traduce a la pantalla
 *     "No pudimos cargar los autores".
 *
 * Si no hay configuración de Google Sheets, cae al mock de desarrollo.
 */
export async function getAutores(): Promise<Autor[]> {
  if (!hayConfiguracionLectura()) {
    avisarLecturaMock();
    await esperar(LATENCIA_MOCK_MS);
    return AUTORES_MOCK.filter((autor) => autor.activo).map(conVozDeOrigen);
  }
  return getAutoresReales();
}

/**
 * Devuelve todas las actividades ACTIVAS y ya programadas.
 *
 * Contrato:
 *   - Solo `activo === true`.
 *   - Descarta las plantillas que crea el Apps Script al añadir un autor
 *     (título `[Actividad de …]`, sin `fecha` ni `hora_inicio`): todavía no son
 *     programación real y romperían la agenda.
 *   - `inicioMin`/`finMin` en minutos desde medianoche; si `hora_fin` va vacía,
 *     se asume una hora de duración.
 *
 * El cruce con autores activos se hace en `/api/catalogo` para no leer la hoja
 * de autores dos veces.
 *
 * Si no hay configuración de Google Sheets, cae al mock de desarrollo.
 */
export async function getActividades(): Promise<Actividad[]> {
  if (!hayConfiguracionLectura()) {
    avisarLecturaMock();
    await esperar(LATENCIA_MOCK_MS);
    return ACTIVIDADES_MOCK.filter((actividad) => actividad.activo);
  }
  return getActividadesReales();
}

/** Lectura real de autores, cacheada con `unstable_cache` y tag `catalogo`. */
const getAutoresReales = unstable_cache(
  async (): Promise<Autor[]> => {
    // Se lee con `spreadsheets.get` + `includeGridData` porque la API de Values
    // (`values.get`) no expone `textFormatRuns`, que es donde la hoja guarda las
    // cursivas de las bios. La máscara de campos limita la respuesta a lo que
    // usa el parseo: el valor visible de cada celda y los tramos en cursiva.
    const { data } = await getSheets().spreadsheets.get({
      spreadsheetId: idAutores(),
      ranges: [RANGOS.autores],
      includeGridData: true,
      fields:
        'sheets(data(rowData(values(formattedValue,textFormatRuns(startIndex,format(italic))))))',
    });
    const filas = data.sheets?.[0]?.data?.[0]?.rowData ?? [];
    return filas
      .map((fila) => {
        const celdas = fila.values ?? [];
        return filaAAutor(
          celdas.map((celda) => celda?.formattedValue ?? ''),
          {
            bioCorta: celdas[6]?.textFormatRuns ?? null,
            bioLarga: celdas[7]?.textFormatRuns ?? null,
          },
        );
      })
      .filter((a): a is Autor => a !== null)
      .map(conVozDeOrigen);
  },
  ['autores'],
  { revalidate: cacheTTL(), tags: ['catalogo'] },
);

/** Lectura real de actividades, cacheada con `unstable_cache` y tag `catalogo`. */
const getActividadesReales = unstable_cache(
  async (): Promise<Actividad[]> => {
    const { data } = await getSheets().spreadsheets.values.get({
      spreadsheetId: idAutores(),
      range: RANGOS.actividades,
    });
    return (data.values ?? [])
      .map(filaAActividad)
      .filter((a): a is Actividad => a !== null);
  },
  ['actividades'],
  { revalidate: cacheTTL(), tags: ['catalogo'] },
);

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

/** Id del spreadsheet "Base Autores" (SHEET_AUTORES_ID), validado. */
function idAutores(): string {
  const id = process.env.SHEET_AUTORES_ID;
  if (!id) throw new Error('[data] falta la variable SHEET_AUTORES_ID.');
  return id;
}

/** `true` si tenemos credenciales de Google y el ID de la hoja de autores. */
function hayConfiguracionLectura(): boolean {
  return haySheets() && Boolean(process.env.SHEET_AUTORES_ID);
}

/** TTL del cache de lectura, en segundos. */
function cacheTTL(): number {
  const ttl = Number(process.env.SHEETS_CACHE_TTL_SECONDS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 300;
}

let yaAvisadoMock = false;

/** Avisa UNA sola vez por proceso de que la lectura está usando el mock. */
function avisarLecturaMock(): void {
  if (yaAvisadoMock) return;
  yaAvisadoMock = true;
  console.warn(
    '[data] Lectura de autores/actividades usando el mock de desarrollo. ' +
      'Define GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY y SHEET_AUTORES_ID en .env ' +
      'para conectar con Google Sheets real.',
  );
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

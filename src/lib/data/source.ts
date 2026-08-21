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
 * Este archivo ya trae hecho lo aburrido y propenso a errores: los rangos con
 * las filas de encabezado correctas, el orden exacto de columnas al escribir, el
 * parseo de las celdas multivaluadas, la normalización de las URLs de Drive y el
 * descarte de las filas plantilla que crea el Apps Script. Lo único que falta es
 * la llamada a `googleapis`.
 *
 * Ver `HANDOFF.md` para el contrato completo.
 */

import 'server-only';

import { ACTIVIDADES_MOCK, AUTORES_MOCK } from './mock';
import { conVozDeOrigen } from './parseo';
import { aFilaFeedback, aFilaRespuestas, dispositivoDesdeUserAgent } from './serializacion';
import type { Actividad, Autor, FilaFeedback, Respuesta, RespuestaEntrante } from './types';

/**
 * El parseo de las filas que se leen y la serialización de las que se escriben
 * viven en módulos aparte para poder probarlos sin `server-only`. Se reexportan
 * aquí porque conceptualmente son parte de esta capa: quien conecte Sheets solo
 * necesita mirar este archivo.
 */
export { conVozDeOrigen, filaAActividad, filaAAutor, normalizarFotoUrl } from './parseo';
export {
  aFilaFeedback,
  aFilaRespuestas,
  dispositivoDesdeUserAgent,
  ENCABEZADOS_FEEDBACK,
  ENCABEZADOS_RESPUESTAS,
} from './serializacion';

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
 *   Feedback      igual que Respuestas
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
  /** Escritura (append): 6 columnas, A..F. */
  feedback: 'Feedback!A:F',
} as const;

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
 * TODO: reemplazar con lectura/escritura real de Google Sheets
 *       → `sheets.spreadsheets.values.get({ spreadsheetId: SHEET_AUTORES_ID,
 *          range: RANGOS.autores })` y pasar cada fila por `filaAAutor`.
 *          Cachear con `revalidate = SHEETS_CACHE_TTL_SECONDS`.
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
 * TODO: reemplazar con lectura/escritura real de Google Sheets
 *       → `values.get({ spreadsheetId: SHEET_AUTORES_ID,
 *          range: RANGOS.actividades })` y pasar cada fila por `filaAActividad`.
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
 *
 * TODO: reemplazar con lectura/escritura real de Google Sheets
 *       → `sheets.spreadsheets.values.append({ spreadsheetId: SHEET_RESPUESTAS_ID,
 *          range: RANGOS.respuestas, valueInputOption: 'RAW',
 *          insertDataOption: 'INSERT_ROWS',
 *          requestBody: { values: [aFilaRespuestas(respuesta)] } })`
 *          con reintentos y backoff.
 */
export async function saveRespuesta(
  entrada: RespuestaEntrante,
  contexto: { userAgent?: string | null } = {},
): Promise<Respuesta> {
  const respuesta: Respuesta = {
    ...entrada,
    timestamp: ahoraUTC(),
    dispositivo: dispositivoDesdeUserAgent(contexto.userAgent),
    versionApp: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
  };

  await esperar(LATENCIA_MOCK_MS);

  // TODO: reemplazar con lectura/escritura real de Google Sheets
  console.info('[saveRespuesta] mock — fila que se añadiría a `Respuestas`:', {
    rango: RANGOS.respuestas,
    fila: aFilaRespuestas(respuesta),
  });

  return respuesta;
}

/**
 * Escribe UNA fila en la pestaña `Feedback`.
 *
 * Solo se llama si la persona respondió algo abierto; si lo salta todo no se
 * crea la fila. Los mismos datos van también en las columnas de `Respuestas`:
 * esta pestaña es el detalle cómodo de leer para la curaduría.
 *
 * TODO: reemplazar con lectura/escritura real de Google Sheets
 *       → `values.append({ spreadsheetId: SHEET_RESPUESTAS_ID,
 *          range: RANGOS.feedback, ... })`
 */
export async function saveFeedback(fila: Omit<FilaFeedback, 'timestamp'>): Promise<FilaFeedback> {
  const completa: FilaFeedback = { ...fila, timestamp: ahoraUTC() };

  await esperar(LATENCIA_MOCK_MS);

  // TODO: reemplazar con lectura/escritura real de Google Sheets
  console.info('[saveFeedback] mock — fila que se añadiría a `Feedback`:', {
    rango: RANGOS.feedback,
    fila: aFilaFeedback(completa),
  });

  return completa;
}

// ===========================================================================
// Utilidades
// ===========================================================================

/** ISO 8601 en UTC, que es lo que pide el encabezado de la hoja. */
function ahoraUTC(): string {
  return new Date().toISOString();
}

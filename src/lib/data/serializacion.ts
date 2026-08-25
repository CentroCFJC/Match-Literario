/**
 * Serialización de las filas que la app escribe en "Respuestas Match".
 *
 * Separado de `source.ts` (que es `server-only`) para poder probarlo: el orden
 * de columnas es lo que más silenciosamente se puede desalinear, y un test lo
 * caza al instante. `source.ts` lo reexporta.
 *
 * EL ORDEN DE ESTOS ARREGLOS ES EL ORDEN DE LAS COLUMNAS DE LA HOJA. Si se
 * cambia uno, hay que cambiar el otro.
 */

import type { Dispositivo, Respuesta } from './types';

/** Une una lista en una celda. La hoja pide punto y coma como separador. */
const lista = (valores: readonly string[]) => valores.join('; ');

/** `TRUE`/`FALSE`, como en la hoja. */
const booleano = (valor: boolean) => (valor ? 'TRUE' : 'FALSE');

/**
 * Serializa una `Respuesta` a las 27 celdas de la fila, EN EL ORDEN EXACTO de
 * los encabezados de la hoja. Pásalo tal cual a `values.append`.
 */
export function aFilaRespuestas(respuesta: Respuesta): string[] {
  return [
    respuesta.timestamp,
    respuesta.sessionId,
    respuesta.dispositivo,
    respuesta.edad ?? '',
    lista(respuesta.generosSel),
    lista(respuesta.tematicasSel),
    lista(respuesta.moodSel),
    respuesta.estiloSel ?? '',
    lista(respuesta.vocesSel),
    lista(respuesta.actividadesInteresSel),
    lista(respuesta.diasAsistenciaSel),
    lista(respuesta.franjasSel),
    respuesta.origenVisitante ?? '',
    lista(respuesta.dondeConsigueLibros),
    lista(respuesta.comoSeEntero),
    lista(respuesta.matchTopIds),
    lista(respuesta.autoresClickIds),
    lista(respuesta.autoresRutaIds),
    String(respuesta.nAutoresRuta),
    String(respuesta.conflictosDetectados),
    respuesta.feedbackUtil === null ? '' : String(respuesta.feedbackUtil),
    respuesta.autorFaltante,
    lista(respuesta.temaFaltante),
    String(respuesta.tiempoTotalSeg),
    respuesta.pasoAbandono === null ? '' : String(respuesta.pasoAbandono),
    booleano(respuesta.completado),
    respuesta.versionApp,
  ];
}

/**
 * Encabezados de `Respuestas` (fila 2), en el mismo orden que `aFilaRespuestas`.
 *
 * OJO: este orden NO es el del prompt maestro §7.4 (allí `origen_visitante` va
 * cuarto). Manda la hoja real.
 */
export const ENCABEZADOS_RESPUESTAS = [
  'timestamp',
  'session_id',
  'dispositivo',
  'edad',
  'generos_sel',
  'tematicas_sel',
  'mood_sel',
  'estilo_sel',
  'voces_sel',
  'actividades_interes_sel',
  'dias_asistencia_sel',
  'franjas_sel',
  'origen_visitante',
  'donde_consigue_libros',
  'como_se_entero',
  'match_top_ids',
  'autores_click_ids',
  'autores_ruta_ids',
  'n_autores_ruta',
  'conflictos_detectados',
  'feedback_util',
  'autor_faltante',
  'tema_faltante',
  'tiempo_total_seg',
  'paso_abandono',
  'completado',
  'version_app',
] as const;

/**
 * Columna `dispositivo`. Se deriva del user agent EN EL SERVIDOR y solo se
 * guarda la categoría: nunca el user agent completo, que sería un fingerprint
 * (el prompt maestro lo prohíbe explícitamente, §7.4).
 */
export function dispositivoDesdeUserAgent(userAgent: string | null | undefined): Dispositivo {
  if (!userAgent) return 'escritorio';
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return 'movil';
  return 'escritorio';
}

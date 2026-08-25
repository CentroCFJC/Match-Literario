/**
 * Lógica de actualización de `Respuestas` (el PATCH / upsert).
 *
 * Separada de `source.ts` (que es `server-only`) para poder probarla: es la
 * pieza que garantiza que un `PATCH` con un `session_id` ya existente NO crea
 * una fila nueva, y que las columnas que solo escribe el servidor en el POST
 * inicial (`timestamp`, `dispositivo`, `version_app`) no se pisan al actualizar.
 *
 * `source.ts` lo reexporta.
 */

import { aFilaRespuestas, ENCABEZADOS_RESPUESTAS } from './serializacion';
import type { Respuesta } from './types';

/**
 * Índice (base 0) de la fila cuyo `session_id` coincide.
 *
 * `session_id` es la columna 2 (B). Devuelve `-1` si no está; con eso el
 * llamador distingue "actualizar" de "crear" (upsert).
 */
export function indiceFilaPorSessionId(
  filas: readonly unknown[][],
  sessionId: string,
): number {
  return filas.findIndex((fila) => {
    const celda = fila[1];
    return celda != null && String(celda).trim() === sessionId;
  });
}

/**
 * Fusiona la fila existente con la respuesta parcheada.
 *
 * El PATCH manda el cuerpo completo, pero `timestamp`, `dispositivo` y
 * `version_app` son columnas "(auto)" que solo se escriben al crear la fila.
 * Aquí se conservan las de la fila original y se actualiza el resto, para que
 * una actualización de agenda o de feedback no mueva la marca de creación.
 */
export function fusionarFilaRespuestas(
  filaExistente: readonly string[],
  respuesta: Respuesta,
): string[] {
  const nueva = aFilaRespuestas(respuesta);

  // `timestamp` (0) y `dispositivo` (2) son las dos primeras columnas;
  // `version_app` es la última. Se conservan de la fila original (si faltaran,
  // se conserva lo que ya trae `respuesta`). La posición de `version_app` se
  // resuelve contra los encabezados para no desalinearse si cambian las columnas.
  nueva[0] = filaExistente[0] ?? nueva[0];
  nueva[2] = filaExistente[2] ?? nueva[2];
  const colVersion = ENCABEZADOS_RESPUESTAS.indexOf('version_app');
  nueva[colVersion] = filaExistente[colVersion] ?? nueva[colVersion];

  return nueva;
}

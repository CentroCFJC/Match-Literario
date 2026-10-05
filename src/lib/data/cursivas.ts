/**
 * Cursivas del texto enriquecido de la hoja.
 *
 * Google Sheets guarda el formato por caracteres de una celda en `textFormatRuns`:
 * una lista de tramos donde cada uno dice en qué índice empieza y qué formato
 * tiene (el formato de un tramo corre hasta el inicio del siguiente). La API de
 * Values no los devuelve, por eso la lectura de autores usa `spreadsheets.get`
 * con `includeGridData` y este módulo convierte esos tramos en algo que la UI
 * puede renderizar: `SegmentoBio[]`.
 *
 * Solo se mira `italic`: si la curaduría usara negritas o subrayados, aquí se
 * ignoran a propósito (la app no los necesita).
 *
 * Las funciones son puras y no dependen de `googleapis`: `RunDeCursivas` es
 * estructuralmente compatible con `Schema$TextFormatRun`, así que los runs que
 * devuelve la API se pasan tal cual y este archivo se puede probar sin servidor.
 */

import type { SegmentoBio } from './types';

export type { SegmentoBio };

/**
 * Tramo de formato de Google Sheets, con solo lo que interesa: dónde empieza y
 * si es cursiva. Compatible con `sheets_v4.Schema$TextFormatRun`.
 */
export interface RunDeCursivas {
  startIndex?: number | null;
  format?: { italic?: boolean | null } | null;
}

/** Los runs de las dos columnas de bio de un autor. */
export interface CursivasDeFila {
  bioCorta?: RunDeCursivas[] | null;
  bioLarga?: RunDeCursivas[] | null;
}

/**
 * Convierte el texto de una celda y sus `textFormatRuns` en segmentos listos
 * para renderizar.
 *
 * - `valor` es el texto crudo de la celda (se recorta aquí, igual que en el
 *   resto del parseo); los `startIndex` de los runs se realinean tras el
 *   recorte.
 * - Sin runs (celda sin formato parcial) devuelve un único segmento plano.
 * - El primer run suele venir sin formato y marca el tramo normal inicial; un
 *   run con `italic: true` aplica hasta el inicio del siguiente run o el final.
 * - Devuelve `[]` si el texto queda vacío.
 */
export function runsASegmentos(
  valor: string,
  runs?: readonly RunDeCursivas[] | null,
): SegmentoBio[] {
  const texto = valor.trim();
  if (!texto) return [];

  if (!runs || runs.length === 0) {
    return [{ texto, cursiva: false }];
  }

  // Los `startIndex` refieren al texto sin recortar: se desplazan tanto como
  // le quitó el recorte inicial (y se acotan a 0, por si un run empezaba dentro
  // del espacio eliminado).
  const desplazamiento = valor.length - valor.trimStart().length;
  const tramos = runs
    .map((run) => ({
      cursiva: run.format?.italic === true,
      inicio: Math.min(
        texto.length,
        Math.max(0, (run.startIndex ?? 0) - desplazamiento),
      ),
    }))
    .sort((a, b) => a.inicio - b.inicio);

  // Bordes de corte: 0, el inicio de cada tramo y el final del texto. Los
  // tramos vacíos (p. ej. un run que caía en el espacio final recortado) se
  // saltan solos en el bucle.
  const bordes = [...new Set([0, ...tramos.map((t) => t.inicio), texto.length])].sort(
    (a, b) => a - b,
  );

  const segmentos: SegmentoBio[] = [];
  for (let i = 0; i < bordes.length - 1; i += 1) {
    const fragmento = texto.slice(bordes[i], bordes[i + 1]);
    if (!fragmento) continue;

    // Gobierna el fragmento el último tramo que empieza en o antes de su borde.
    let cursiva = false;
    for (const tramo of tramos) {
      if (tramo.inicio > bordes[i]) break;
      cursiva = tramo.cursiva;
    }
    segmentos.push({ texto: fragmento, cursiva });
  }
  return segmentos;
}

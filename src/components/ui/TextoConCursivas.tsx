/**
 * Renderiza una bio con sus segmentos de cursiva.
 *
 * Las bios llegan de la hoja con formato enriquecido: `SegmentoBio[]` dice qué
 * tramos escribió la curaduría en cursiva. Cuando no hay segmentos (datos
 * viejos en el store, o un autor sin bio) se cae al texto plano, así que el
 * componente es seguro con cualquier `Autor`.
 */

import type { SegmentoBio } from '@/lib/data/cursivas';

interface TextoConCursivasProps {
  /** Segmentos con formato; opcional para tolerar datos sin él. */
  segmentos?: SegmentoBio[] | null;
  /** Texto plano de respaldo, para cuando no hay segmentos. */
  texto: string;
}

export function TextoConCursivas({ segmentos, texto }: TextoConCursivasProps) {
  const utiles = segmentos?.filter((segmento) => segmento.texto);
  if (!utiles || utiles.length === 0) return <>{texto}</>;

  return (
    <>
      {utiles.map((segmento, i) =>
        segmento.cursiva ? (
          <em key={i}>{segmento.texto}</em>
        ) : (
          <span key={i}>{segmento.texto}</span>
        ),
      )}
    </>
  );
}

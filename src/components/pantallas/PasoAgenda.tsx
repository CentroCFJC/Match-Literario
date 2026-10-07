'use client';

import { BotonPrincipal } from '@/components/ui/BotonPrincipal';
import { CabeceraPaso } from '@/components/ui/CabeceraPaso';
import { Chip } from '@/components/ui/Chip';
import { useCalcularMatch } from '@/hooks/useCalcularMatch';
import { TOTAL_PASOS } from '@/lib/pasos';
import { DIAS_POR_DEFECTO, etiquetaDia, FRANJAS } from '@/lib/vocabulario';
import { useMatchStore } from '@/store/useMatchStore';

/**
 * Paso 6: "Arma tu agenda".
 *
 * Tiene pantalla propia porque agrupa dos preguntas (días y franja) bajo un
 * único número de paso, y porque su CTA no avanza sino que dispara el cálculo.
 *
 * Los días NO están codificados: salen de las fechas de la programación
 * (`Actividades.fecha`), como pide el prompt maestro §3.1. Si la curaduría aún
 * no ha programado nada, se muestran los siete días de la feria.
 */
export function PasoAgenda() {
  const seleccion = useMatchStore((e) => e.seleccion);
  const diasEvento = useMatchStore((e) => e.diasEvento);
  const alternarEnLista = useMatchStore((e) => e.alternarEnLista);
  const pasoAnterior = useMatchStore((e) => e.pasoAnterior);
  const calcular = useCalcularMatch();

  const dias = diasEvento.length > 0 ? diasEvento : DIAS_POR_DEFECTO;

  // Basta con responder una de las dos preguntas para continuar.
  const sinRespuesta = seleccion.dias.length === 0 && seleccion.franjas.length === 0;

  return (
    <div className="flex h-full flex-col">
      <CabeceraPaso numero={TOTAL_PASOS} titulo="Arma tu agenda" onVolver={pasoAnterior} />

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-2 pt-4">
        <div className="mb-1 font-display text-[14px] font-bold text-burgundy">
          ¿Qué días te gustaría o estás dispuesto/a a venir?
        </div>
        <p className="m-0 mb-3 font-body text-[12px] leading-[1.4] text-text-muted">
          Es solo una previsión para ayudarnos a organizar la Feria.
        </p>
        <div className="mb-[26px] flex flex-wrap gap-[10px]" role="group" aria-label="Días">
          {dias.map((fecha) => (
            <Chip
              key={fecha}
              label={etiquetaDia(fecha)}
              seleccionado={seleccion.dias.includes(fecha)}
              onClick={() => alternarEnLista('dias', fecha)}
            />
          ))}
        </div>

        <div className="mb-[10px] font-display text-[14px] font-bold text-burgundy">
          Franja horaria que prefieres
        </div>
        <div className="flex flex-wrap gap-[10px]" role="group" aria-label="Franja horaria">
          {FRANJAS.map((franja) => (
            <Chip
              key={franja}
              label={franja}
              seleccionado={seleccion.franjas.includes(franja)}
              onClick={() => alternarEnLista('franjas', franja)}
            />
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 bg-surface-page px-6 pb-[22px] pt-[14px]">
        <BotonPrincipal deshabilitado={sinRespuesta} onClick={() => void calcular()}>
          Ver mi match
        </BotonPrincipal>
      </div>
    </div>
  );
}

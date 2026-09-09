'use client';

import { HojaInferior } from '@/components/ui/HojaInferior';
import { IconoAdvertencia } from '@/components/ui/iconos';
import { useMatchStore } from '@/store/useMatchStore';

/**
 * Confirmación antes de reiniciar: avisa de que se descarta la agenda y el
 * match guardados en el dispositivo. `reiniciarEIniciar` distingue si al
 * confirmar hay que arrancar el wizard (botón INICIAR) o solo volver a la
 * bienvenida (botón "Reiniciar el test").
 */
export function HojaConfirmarReinicio() {
  const reiniciar = useMatchStore((e) => e.reiniciar);
  const empezarWizard = useMatchStore((e) => e.empezarWizard);
  const reiniciarEIniciar = useMatchStore((e) => e.reiniciarEIniciar);
  const cerrarConfirmarReinicio = useMatchStore((e) => e.cerrarConfirmarReinicio);

  const confirmar = () => {
    reiniciar();
    if (reiniciarEIniciar) empezarWizard();
    cerrarConfirmarReinicio();
  };

  return (
    <HojaInferior
      onCerrar={cerrarConfirmarReinicio}
      zIndex={30}
      etiqueta="Reiniciar el test"
    >
      <div className="px-6 pb-[26px] pt-[22px] text-center">
        <div className="mb-3 flex justify-center text-coral-2">
          <IconoAdvertencia tamano={42} />
        </div>
        <h2 className="m-0 mb-3 text-balance font-display text-[21px] font-extrabold text-ink">
          ¿Reiniciar el test?
        </h2>
        <p className="m-0 mb-[22px] text-pretty font-body text-[14px] leading-[1.5] text-text-muted">
          Se eliminará la agenda y el match que tienes guardados en este dispositivo.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={cerrarConfirmarReinicio}
            className="min-h-[50px] flex-1 rounded-pill border-none bg-transparent font-display text-[16px] font-bold text-burgundy shadow-[inset_0_0_0_2px_var(--color-burgundy)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            className="min-h-[50px] flex-1 rounded-pill border-none bg-magenta font-display text-[16px] font-bold text-cream-white"
          >
            Sí, reiniciar
          </button>
        </div>
      </div>
    </HojaInferior>
  );
}

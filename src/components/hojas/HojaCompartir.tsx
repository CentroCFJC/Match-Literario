'use client';

import { HojaInferior, ManijaHoja } from '@/components/ui/HojaInferior';
import { construirAgenda, enlaceCorreo, enlaceWhatsApp } from '@/lib/agenda';
import { useMatchStore } from '@/store/useMatchStore';

/** Hoja de compartir: envía la ruta por WhatsApp o por correo. */
export function HojaCompartir() {
  const idsAgenda = useMatchStore((e) => e.agenda);
  const actividades = useMatchStore((e) => e.actividades);
  const autores = useMatchStore((e) => e.autores);
  const abrirHojaCompartir = useMatchStore((e) => e.abrirHojaCompartir);

  const cerrar = () => abrirHojaCompartir(false);
  const agenda = construirAgenda(idsAgenda, actividades, autores);

  return (
    <HojaInferior onCerrar={cerrar} zIndex={24} altoMaximo="100%" etiqueta="Compartir mi agenda">
      <div className="px-6 pb-7 pt-[22px]">
        <ManijaHoja />
        <h2 className="m-0 mb-1 text-center font-display text-[20px] font-extrabold text-ink">
          Compartir mi agenda
        </h2>
        <p className="m-0 mb-[22px] text-center font-body text-[13px] text-text-muted">
          Envía tu ruta por la feria a quien quieras.
        </p>

        <div className="flex flex-col gap-3">
          <a
            href={enlaceWhatsApp(agenda)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={cerrar}
            className="flex items-center gap-4 rounded-[16px] bg-surface-card px-[18px] py-[14px] no-underline shadow-card"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-pill bg-[#25D366]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.5A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.8.8 1.9.1.1.1.3 0 .5-.1.2-.2.4-.3.5l-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.5.7 1.7.9.3.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
              </svg>
            </span>
            <span>
              <span className="block font-display text-[15px] font-bold text-ink">WhatsApp</span>
              <span className="font-body text-[12px] text-text-muted">Abrir chat para enviar</span>
            </span>
          </a>

          <a
            href={enlaceCorreo(agenda)}
            onClick={cerrar}
            className="flex items-center gap-4 rounded-[16px] bg-surface-card px-[18px] py-[14px] no-underline shadow-card"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-pill bg-burgundy">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>
            <span>
              <span className="block font-display text-[15px] font-bold text-ink">Correo</span>
              <span className="font-body text-[12px] text-text-muted">Enviar por email</span>
            </span>
          </a>
        </div>

        <button
          type="button"
          onClick={cerrar}
          className="mt-[18px] min-h-[48px] w-full rounded-pill border-none bg-transparent font-display text-[15px] font-bold text-burgundy shadow-[inset_0_0_0_2px_var(--color-burgundy)]"
        >
          Cancelar
        </button>
      </div>
    </HojaInferior>
  );
}

'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { construirAgenda, contarItems, tieneConflictos } from '@/lib/agenda';
import { useMatchStore } from '@/store/useMatchStore';

/** Pantalla 14: la ruta por la feria, agrupada por día y con los cruces marcados. */
export function Agenda() {
  const idsAgenda = useMatchStore((e) => e.agenda);
  const actividades = useMatchStore((e) => e.actividades);
  const autores = useMatchStore((e) => e.autores);
  const irA = useMatchStore((e) => e.irA);
  const quitarActividad = useMatchStore((e) => e.quitarActividad);
  const abrirHojaCompartir = useMatchStore((e) => e.abrirHojaCompartir);

  const dias = construirAgenda(idsAgenda, actividades, autores);
  const total = contarItems(dias);
  const hayConflictos = tieneConflictos(dias);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-shrink-0 items-center gap-[14px] px-6 pb-[14px] pt-[10px]">
        <button
          type="button"
          onClick={() => irA('resultado')}
          aria-label="Volver a mi match"
          className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-pill border-none bg-surface-card text-[20px] text-burgundy shadow-card"
        >
          ←
        </button>
        <h2 className="m-0 font-display text-[22px] font-extrabold text-ink">Mi agenda</h2>
      </div>

      <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto px-6 pb-5">
        {total === 0 ? (
          <AgendaVacia onVolver={() => irA('resultado')} />
        ) : (
          <>
            {hayConflictos ? (
              <div
                role="alert"
                className="mb-[18px] flex items-center gap-[10px] rounded-[14px] border-[1.5px] border-coral-2 bg-[#fbe3c9] px-[14px] py-3"
              >
                <span className="flex-shrink-0 text-[18px]" aria-hidden="true">
                  ⚠
                </span>
                <span className="font-body text-[13px] leading-[1.4] text-burgundy">
                  Tienes actividades que se cruzan en horario. Revisa las marcadas.
                </span>
              </div>
            ) : null}

            {dias.map((dia) => (
              <div key={dia.fecha} className="mb-[22px]">
                <div className="mb-[10px] font-display text-[14px] font-extrabold uppercase tracking-[.04em] text-magenta">
                  {dia.etiqueta}
                </div>
                <div className="flex flex-col gap-[10px]">
                  <AnimatePresence initial={false}>
                    {dia.items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 0.9, 0.32, 1] }}
                        className="flex items-start gap-[10px] rounded-[16px] bg-surface-card px-3 py-[14px] shadow-card"
                        style={{
                          border: item.conflicto
                            ? '1.5px solid var(--color-coral-2)'
                            : '1.5px solid transparent',
                        }}
                      >
                        {/* 66px y sin salto: "11:00 am" no cabe en los 58px del
                            diseño, cuya maqueta solo tenía horas de la tarde. */}
                        <div className="w-[66px] flex-shrink-0 whitespace-nowrap text-center font-display text-[14px] font-bold text-burgundy">
                          {item.horaTexto}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-[15px] font-bold leading-[1.2] text-ink">
                            {item.titulo}
                          </div>
                          <div className="mt-[3px] font-body text-[12px] text-text-muted">
                            {item.autoresNombres.join(', ')} · {item.lugar}
                          </div>
                          {item.conflicto ? (
                            <div className="mt-[6px] inline-flex items-center gap-[5px] font-body text-[11px] font-semibold text-coral-2">
                              <span aria-hidden="true">⚠</span>
                              Se cruza con otra actividad
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => quitarActividad(item.id)}
                          aria-label={`Quitar ${item.titulo} de mi agenda`}
                          className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-pill border-none bg-cream text-[16px] text-burgundy"
                        >
                          ×
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {total > 0 ? (
        <div className="flex flex-shrink-0 gap-[10px] border-t border-[var(--border-soft)] px-5 pb-5 pt-3">
          <button
            type="button"
            onClick={() => abrirHojaCompartir(true)}
            aria-label="Compartir mi agenda"
            className="flex min-h-[48px] w-[52px] flex-shrink-0 items-center justify-center rounded-pill border-none bg-transparent text-burgundy shadow-[inset_0_0_0_2px_var(--color-burgundy)]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
              <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
            </svg>
          </button>
          {/*
            "Programación" enlaza al programa completo de la feria. La URL
            todavía no está definida, así que el botón queda deshabilitado en
            lugar de llevar a ninguna parte.
            TODO: enlazar a la programación oficial cuando exista la URL.
          */}
          <button
            type="button"
            disabled
            className="min-h-[48px] flex-1 cursor-not-allowed rounded-pill border-none bg-coral px-[6px] font-display text-[14px] font-bold text-burgundy opacity-60"
          >
            Programación
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AgendaVacia({ onVolver }: { onVolver: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-[30px] pt-10 text-center">
      <div className="mb-[22px] flex h-24 w-24 items-center justify-center rounded-pill bg-cream font-script text-[44px] italic text-magenta">
        ✦
      </div>
      <h3 className="m-0 mb-2 font-display text-[19px] font-extrabold text-burgundy">
        Aún no has añadido autores
      </h3>
      <p className="m-0 max-w-[250px] font-body text-[14px] leading-[1.5] text-text-muted">
        Vuelve a tu match y toca + en los que quieras ver.
      </p>
      <button
        type="button"
        onClick={onVolver}
        className="mt-6 min-h-[48px] rounded-pill border-none bg-magenta px-7 font-display text-[15px] font-bold text-cream-white"
      >
        Volver a mi match
      </button>
    </div>
  );
}

'use client';

import { Chip } from '@/components/ui/Chip';
import { HojaInferior, ManijaHoja } from '@/components/ui/HojaInferior';
import { IconoPulgar } from '@/components/ui/iconos';
import { useActualizarRespuesta } from '@/hooks/useEnviarRespuesta';
import { TEMATICAS } from '@/lib/vocabulario';
import { useMatchStore } from '@/store/useMatchStore';

/**
 * Pantalla 13: ¿te sirvió tu match?
 *
 * Alimenta las columnas `feedback_util` (1 = 👍, 0 = 👎), `autor_faltante` y
 * `tema_faltante` de la hoja `Respuestas`. Es un PATCH a la misma fila de la
 * sesión, no una fila nueva.
 */
export function HojaFeedback() {
  const feedback = useMatchStore((e) => e.feedback);
  const fijarFeedback = useMatchStore((e) => e.fijarFeedback);
  const abrirHojaFeedback = useMatchStore((e) => e.abrirHojaFeedback);
  const mostrarToast = useMatchStore((e) => e.mostrarToast);
  const actualizarRespuesta = useActualizarRespuesta();

  const cerrar = () => abrirHojaFeedback(false);

  const enviar = () => {
    cerrar();
    mostrarToast('¡Gracias por tu opinión!');
    void actualizarRespuesta();
  };

  const estiloPulgar = (activo: boolean, fondo: string) => ({
    border: activo ? '3px solid var(--color-burgundy)' : '2px solid var(--border-soft)',
    background: activo ? fondo : 'var(--surface-card)',
    color: activo ? 'var(--color-burgundy)' : 'var(--text-muted)',
  });

  return (
    <HojaInferior onCerrar={cerrar} zIndex={22} etiqueta="¿Te sirvió tu match?">
      <div className="px-6 pb-[26px] pt-[22px]">
        <ManijaHoja />
        <h2 className="m-0 mb-[18px] text-center font-display text-[22px] font-extrabold text-ink">
          ¿Te sirvió tu match?
        </h2>

        <div className="mb-6 flex justify-center gap-[14px]">
          <button
            type="button"
            aria-label="Sí, me sirvió"
            aria-pressed={feedback.util === 1}
            onClick={() => fijarFeedback({ util: feedback.util === 1 ? null : 1 })}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] transition-all duration-150"
            style={estiloPulgar(feedback.util === 1, 'var(--color-yellow)')}
          >
            <IconoPulgar direccion="arriba" tamano={32} />
          </button>
          <button
            type="button"
            aria-label="No me sirvió"
            aria-pressed={feedback.util === 0}
            onClick={() => fijarFeedback({ util: feedback.util === 0 ? null : 0 })}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] transition-all duration-150"
            style={estiloPulgar(feedback.util === 0, 'var(--color-pink-light)')}
          >
            <IconoPulgar direccion="abajo" tamano={32} />
          </button>
        </div>

        <label
          htmlFor="autor-faltante"
          className="mb-2 block font-body text-[14px] font-semibold text-burgundy"
        >
          ¿Qué autor o autora te hubiera gustado ver?
        </label>
        <input
          id="autor-faltante"
          type="text"
          maxLength={200}
          value={feedback.autorFaltante}
          onChange={(evento) => fijarFeedback({ autorFaltante: evento.target.value })}
          placeholder="Escribe un nombre…"
          className="mb-[22px] box-border w-full rounded-[14px] border-2 border-[var(--border-soft)] bg-surface-card px-4 py-[13px] font-body text-[15px] text-ink outline-none"
        />

        <div className="mb-[10px] font-body text-[14px] font-semibold text-burgundy">
          ¿Qué temática sientes que falta?
        </div>
        <div
          className="mb-[26px] flex flex-wrap gap-2"
          role="group"
          aria-label="Temáticas que faltan"
        >
          {TEMATICAS.map((tematica) => (
            <Chip
              key={tematica}
              label={tematica}
              seleccionado={feedback.temaFaltante.includes(tematica)}
              onClick={() =>
                fijarFeedback({
                  temaFaltante: feedback.temaFaltante.includes(tematica)
                    ? feedback.temaFaltante.filter((x) => x !== tematica)
                    : [...feedback.temaFaltante, tematica],
                })
              }
            />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={enviar}
            className="min-h-[50px] flex-1 rounded-pill border-none bg-magenta font-display text-[16px] font-bold text-cream-white"
          >
            Enviar
          </button>
          <button
            type="button"
            onClick={cerrar}
            className="min-h-[50px] flex-1 rounded-pill border-none bg-transparent font-display text-[16px] font-bold text-burgundy shadow-[inset_0_0_0_2px_var(--color-burgundy)]"
          >
            Omitir
          </button>
        </div>
      </div>
    </HojaInferior>
  );
}

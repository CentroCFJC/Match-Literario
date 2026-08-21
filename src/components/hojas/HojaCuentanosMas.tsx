'use client';

import { Chip } from '@/components/ui/Chip';
import { HojaInferior, ManijaHoja } from '@/components/ui/HojaInferior';
import { useEnviarRespuesta } from '@/hooks/useEnviarRespuesta';
import { COMO_SE_ENTERO, DONDE_LIBROS, ORIGENES_VISITANTE } from '@/lib/vocabulario';
import { useMatchStore } from '@/store/useMatchStore';

/**
 * Pantalla 12: las tres preguntas opcionales de perfil.
 * Alimentan las columnas `origen_visitante`, `donde_consigue_libros` y
 * `como_se_entero` de la hoja `Respuestas`.
 */
export function HojaCuentanosMas() {
  const extra = useMatchStore((e) => e.extra);
  const fijarExtra = useMatchStore((e) => e.fijarExtra);
  const abrirHojaExtra = useMatchStore((e) => e.abrirHojaExtra);
  const mostrarToast = useMatchStore((e) => e.mostrarToast);
  const enviarRespuesta = useEnviarRespuesta();

  const cerrar = () => abrirHojaExtra(false);

  const enviar = () => {
    cerrar();
    mostrarToast('¡Gracias! Nos ayudas a mejorar.');
    // El envío no bloquea el cierre de la hoja: si falla, la persona ni se entera.
    void enviarRespuesta();
  };

  return (
    <HojaInferior onCerrar={cerrar} zIndex={22} etiqueta="Cuéntanos más">
      <div className="px-6 pb-[26px] pt-[22px]">
        <ManijaHoja />
        <h2 className="m-0 mb-5 text-balance font-display text-[21px] font-extrabold text-ink">
          Dos preguntas rápidas para mejorar la feria
        </h2>

        <div className="mb-[10px] font-display text-[15px] font-bold text-burgundy">
          ¿De dónde nos visitas?
        </div>
        <div className="mb-[22px] flex flex-wrap gap-[9px]" role="radiogroup" aria-label="Origen">
          {ORIGENES_VISITANTE.map((origen) => (
            <Chip
              key={origen}
              label={origen}
              seleccionado={extra.origenVisitante === origen}
              onClick={() =>
                fijarExtra({
                  origenVisitante: extra.origenVisitante === origen ? null : origen,
                })
              }
            />
          ))}
        </div>

        <div className="mb-[10px] font-display text-[15px] font-bold text-burgundy">
          ¿Dónde consigues tus libros?
        </div>
        <div
          className="mb-[22px] flex flex-wrap gap-[9px]"
          role="group"
          aria-label="Dónde consigues tus libros"
        >
          {DONDE_LIBROS.map((donde) => (
            <Chip
              key={donde}
              label={donde}
              seleccionado={extra.dondeConsigueLibros.includes(donde)}
              onClick={() =>
                fijarExtra({
                  dondeConsigueLibros: extra.dondeConsigueLibros.includes(donde)
                    ? extra.dondeConsigueLibros.filter((x) => x !== donde)
                    : [...extra.dondeConsigueLibros, donde],
                })
              }
            />
          ))}
        </div>

        <div className="mb-[10px] font-display text-[15px] font-bold text-burgundy">
          ¿Cómo te enteraste de la feria?
        </div>
        <div
          className="mb-[26px] flex flex-wrap gap-[9px]"
          role="radiogroup"
          aria-label="Cómo te enteraste"
        >
          {COMO_SE_ENTERO.map((como) => (
            <Chip
              key={como}
              label={como}
              seleccionado={extra.comoSeEntero.includes(como)}
              // La columna admite lista, pero el diseño pregunta por una sola vía.
              onClick={() =>
                fijarExtra({ comoSeEntero: extra.comoSeEntero.includes(como) ? [] : [como] })
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

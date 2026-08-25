'use client';

/* eslint-disable @next/next/no-img-element -- el identificador es un PNG de
   tamaño fijo servido desde /public; `next/image` no aporta aquí y complica el
   layout exacto del diseño. */

import { BotonPrincipal } from '@/components/ui/BotonPrincipal';
import { useMatchStore } from '@/store/useMatchStore';

/** Pantalla 0 del diseño: identificador de la feria, claim y dos acciones. */
export function Bienvenida() {
  const irA = useMatchStore((estado) => estado.irA);
  const empezarWizard = useMatchStore((estado) => estado.empezarWizard);
  const reiniciar = useMatchStore((estado) => estado.reiniciar);
  const pedirReinicio = useMatchStore((estado) => estado.pedirReinicio);
  const tieneMatch = useMatchStore((estado) => estado.tieneMatch);
  const agenda = useMatchStore((estado) => estado.agenda);

  // "Iniciar" siempre empieza de cero: si quedan respuestas o un match de una
  // sesión anterior, se descartan aquí. Quien quiera verlas usa "Mi último
  // match" en vez de este botón. Si hay agenda guardada, se pide confirmación
  // antes de descartarla.
  const iniciar = () => {
    if (agenda.length > 0) {
      pedirReinicio(true);
      return;
    }
    reiniciar();
    empezarWizard();
  };

  return (
    <div className="no-scrollbar box-border flex h-full flex-col overflow-y-auto px-7 pb-[26px]">
      <div className="flex flex-1 flex-col items-center justify-center py-[14px] text-center">
        <img
          src="/Identificador 2.png"
          alt="17 Feria del Libro de Manizales"
          className="block h-auto w-[236px]"
        />

        <div className="relative my-[22px] mb-4 flex h-[76px] w-[76px] items-center justify-center">
          <div className="flm-pulse absolute inset-0 rounded-pill bg-magenta opacity-[0.16]" />
          <div className="flex h-[62px] w-[62px] items-center justify-center rounded-pill bg-magenta shadow-card">
            <span className="text-[30px] leading-none" aria-hidden="true">
              ❤
            </span>
          </div>
        </div>

        <h1 className="m-0 text-balance font-display text-[40px] font-extrabold leading-[.98] tracking-[.01em] text-burgundy">
          MATCH
          <br />
          LITERARIO
        </h1>
        <div className="mt-[6px] font-script text-[19px] italic text-magenta">
          encuentra a tu autor/a afín
        </div>
        <p className="m-0 mt-4 max-w-[290px] text-pretty font-body text-[15px] leading-[1.5] text-text-muted">
          Responde unas preguntas rápidas sobre lo que te gusta leer y te armamos una ruta a tu
          medida por la feria.
        </p>
      </div>

      <div className="flex flex-col items-center gap-[14px]">
        <BotonPrincipal
          onClick={iniciar}
          className="!min-h-[54px] tracking-[.04em] !font-extrabold"
        >
          INICIAR
        </BotonPrincipal>

        {/* "Mi último match" solo tiene sentido si hay uno guardado. */}
        <BotonPrincipal
          variante="contorno"
          deshabilitado={!tieneMatch}
          onClick={() => irA('resultado')}
          className="!min-h-[50px] !text-[15px]"
        >
          Mi último match
        </BotonPrincipal>

        <p className="m-0 mt-1 text-center font-body text-[12px] leading-[1.4] text-text-muted">
          Tus respuestas son anónimas y se usan solo con fines estadísticos.
        </p>
      </div>
    </div>
  );
}

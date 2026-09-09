'use client';

/* eslint-disable @next/next/no-img-element -- el identificador y las plantas son
   recursos de tamaño fijo servidos desde /public, ya optimizados; `next/image`
   no aporta aquí y complica el layout exacto del diseño. */

import { BotonPrincipal } from '@/components/ui/BotonPrincipal';
import { Estampilla } from '@/components/ui/iconos';
import { useMatchStore } from '@/store/useMatchStore';

/** Pantalla 0 del diseño: identificador de la Feria, claim y dos acciones. */
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
    <div className="relative h-full overflow-hidden">
      <FondoBienvenida />

      <div className="no-scrollbar relative z-10 box-border flex h-full flex-col overflow-y-auto px-7 pb-[26px]">
        <div className="flex flex-1 flex-col items-center justify-center py-[14px] text-center">
          {/*
            La flor va anclada AL LOGO y no al borde de la pantalla: el logo se
            centra dentro de un flex que crece, así que su altura cambia con la
            del dispositivo. Colgada del propio bloque, el roce se mantiene igual
            en un iPhone SE que en un Pro Max.
          */}
          <div className="relative">
            <img
              src="/flor.webp"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-[86px] -top-[104px] block w-[232px] max-w-none select-none"
              style={{ opacity: 0.92, transform: 'rotate(8deg)' }}
            />
            <img
              src="/Identificador 2.png"
              alt="17 Feria del Libro de Manizales"
              className="relative block h-auto w-[236px]"
            />
          </div>

          <MarcaDeLatido />

          <h1 className="m-0 text-balance font-display text-[40px] font-extrabold leading-[.98] tracking-[.01em] text-burgundy">
            MATCH
            <br />
            LITERARIO
          </h1>
          {/*
            El claim va en burdeos y no en magenta: sobre el amarillo el magenta
            se queda en 3:1 de contraste, por debajo del mínimo legible, y además
            competía con el identificador, que ya es magenta. Así el magenta
            queda reservado para los dos acentos que importan: el corazón y el
            botón de iniciar.
          */}
          <div className="mt-[6px] font-script text-[19px] italic text-burgundy">
            encuentra a tu autor/a afín
          </div>
          <p className="m-0 mt-4 max-w-[290px] text-pretty font-body text-[15px] leading-[1.5] text-text-muted">
            Responde unas preguntas rápidas sobre lo que te gusta leer y te armamos una ruta a tu
            medida por la Feria.
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
          <p className="m-0 mt-2 text-center font-body text-[11px] leading-[1.4] text-text-muted opacity-70">
            Desarrollado por el Centro de Ciencia Francisco José de Caldas
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * El emblema de la bienvenida.
 *
 * El latido no es un escalado sinusoidal —eso se lee como respiración— sino el
 * doble golpe del corazón seguido de una pausa. Se conserva sobre la estampilla
 * porque es lo que la mantiene viva; las ondas circulares que lo acompañaban se
 * quitaron, porque rodear de círculos un objeto rectangular no se leía como
 * pulso sino como error de encuadre.
 */
function MarcaDeLatido() {
  return (
    <div className="my-[18px] mb-3 flex items-center justify-center" aria-hidden="true">
      <span className="flm-latido block">
        <Estampilla tamano={86} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * Perfil de Manizales al fondo: la Catedral y la Torre del Cable, dos de sus
 * hitos más reconocibles, recortadas de los grabados de `Nativos/` y reducidas
 * a su silueta plana en burdeos (ver el script de proceso; el color sale del
 * propio contorno de tinta del grabado, no de un filtro).
 *
 * Reemplaza a la versión anterior con plantas en las cuatro esquinas: aquí la
 * postal es "estás en Manizales, en la Feria" en vez de un jardín, y con dos
 * piezas —no cuatro— hay aire de sobra para que no compitan con el CTA.
 */
interface Hito {
  src: string;
  alto: number;
  left?: string;
  right?: string;
  opacidad: number;
}

/**
 * El horizonte, de izquierda a derecha.
 *
 * Solo la Catedral y la Torre del Cable son reconocibles: sus grabados traen el
 * recorte pegado al edificio (las agujas, la celosía de la torre), así que la
 * silueta conserva el perfil. Los otros tres vienen recortados en bloque y su
 * silueta es un volumen anónimo — que es exactamente para lo que sirven aquí:
 * hacen de tejido urbano entre los dos hitos, más bajos y más tenues, para que
 * la fila se lea como una ciudad y no como dos monumentos sueltos.
 */
const HITOS: Hito[] = [
  { src: '/edificio-banco.webp', alto: 40, left: '-2%', opacidad: 0.09 },
  { src: '/catedral.webp', alto: 62, left: '11%', opacidad: 0.16 },
  { src: '/edificio-gobernacion.webp', alto: 30, left: '34%', opacidad: 0.08 },
  { src: '/edificio-05.webp', alto: 44, right: '27%', opacidad: 0.1 },
  { src: '/torre-cable.webp', alto: 80, right: '8%', opacidad: 0.13 },
];

function FondoBienvenida() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/*
        Un solo degradado, y solo desde abajo: asienta la pantalla sobre una base
        más cálida y deja el amarillo limpio en los dos tercios de arriba, que es
        donde va el identificador.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(214, 182, 74, 0.38) 0%, rgba(214, 182, 74, 0) 62%)',
        }}
      />

      {/* Los edificios se paran justo en el borde inferior, como un horizonte real. */}
      <div className="absolute inset-x-0 bottom-0">
        {HITOS.map((hito) => (
          <img
            key={hito.src}
            src={hito.src}
            alt=""
            className="absolute bottom-0 block w-auto select-none"
            style={{ height: hito.alto, left: hito.left, right: hito.right, opacity: hito.opacidad }}
          />
        ))}
      </div>
    </div>
  );
}

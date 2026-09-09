'use client';

/* eslint-disable @next/next/no-img-element -- el aro es un WebP de tamaño fijo
   ya optimizado (160 KB) servido desde /public; `next/image` no aportaría nada y
   añadiría una capa de procesamiento en una pantalla que dura dos segundos. */

/**
 * Pantalla 9: la espera mientras corre el match.
 *
 * En vez de un indicador que gira, la pantalla muestra algo que se está
 * haciendo: dentro de un aro de bordado —una de las piezas de la identidad
 * gráfica de la 17ª Feria— aparece un corazón bordado en punto de cruz, puntada
 * a puntada. El avance de las puntadas ES la barra de progreso, y lo que se está
 * tejiendo es exactamente lo que la app está calculando.
 *
 * Sin emojis y sin tipografías de sistema: el aro es una imagen y las puntadas
 * son SVG, así que se ve igual en cualquier teléfono.
 *
 * Los tiempos están coordinados con `MINIMO_CALCULANDO_MS` en
 * `useCalcularMatch.ts`: la última puntada cae antes de que la pantalla se vaya.
 */
export function Calculando() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center px-10 text-center"
      role="status"
      aria-live="polite"
    >
      <AroBordando />

      <h2 className="m-0 mb-[10px] mt-[26px] text-balance font-display text-[23px] font-extrabold text-burgundy">
        Calculando tu match…
      </h2>
      <p className="m-0 font-body text-[15px] leading-[1.5] text-text-muted">
        Cruzando tus gustos con los autores de la Feria…
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * El corazón, dibujado como una rejilla de punto de cruz.
 *
 * Se declara como mapa de caracteres y no como trazado vectorial porque el punto
 * de cruz ES una rejilla: cada `X` es una puntada real, y de ahí sale sola la
 * cadencia con la que van apareciendo.
 */
const REJILLA_CORAZON = [
  '.XX.....XX.',
  'XXXX...XXXX',
  'XXXXX.XXXXX',
  'XXXXXXXXXXX',
  'XXXXXXXXXXX',
  '.XXXXXXXXX.',
  '..XXXXXXX..',
  '...XXXXX...',
  '....XXX....',
  '.....X.....',
] as const;

/** Lado del lienzo y de cada casilla, en unidades del viewBox. */
const LADO = 260;
const CASILLA = 13;
/** Medio brazo de la cruz. Deja aire entre puntadas, como en la tela de bordar. */
const BRAZO = 4.6;

/** Segundos que se retrasa cada puntada respecto de la anterior. */
const CADENCIA = 0.021;
/** El aro entra primero; las puntadas empiezan cuando ya está asentado. */
const RETRASO_PRIMERA_PUNTADA = 0.3;

interface Puntada {
  x: number;
  y: number;
  giro: number;
  retraso: number;
  hilo: string;
}

/** Recorre la rejilla en el orden en que se bordaría: por filas, de arriba abajo. */
function construirPuntadas(): Puntada[] {
  const anchoRejilla = REJILLA_CORAZON[0].length * CASILLA;
  const altoRejilla = REJILLA_CORAZON.length * CASILLA;
  const x0 = (LADO - anchoRejilla) / 2;
  const y0 = (LADO - altoRejilla) / 2;

  const puntadas: Puntada[] = [];
  REJILLA_CORAZON.forEach((fila, indiceFila) => {
    [...fila].forEach((celda, indiceColumna) => {
      if (celda !== 'X') return;
      const orden = puntadas.length;
      puntadas.push({
        x: x0 + indiceColumna * CASILLA + CASILLA / 2,
        y: y0 + indiceFila * CASILLA + CASILLA / 2,
        // Un poco de desvío por puntada: bordado a mano, no impreso.
        giro: ((indiceColumna * 7 + indiceFila * 3) % 5) - 2,
        retraso: RETRASO_PRIMERA_PUNTADA + orden * CADENCIA,
        // Dos tonos de hilo, repartidos de forma regular pero no alineada, para
        // que la madeja no se lea como un degradado ni como un tablero.
        hilo:
          (indiceColumna * 3 + indiceFila * 5) % 3 === 0
            ? 'var(--color-magenta-2)'
            : 'var(--color-magenta)',
      });
    });
  });
  return puntadas;
}

const PUNTADAS = construirPuntadas();

/** Cuándo termina la última puntada: a partir de ahí el corazón late. */
const FIN_DEL_BORDADO = RETRASO_PRIMERA_PUNTADA + PUNTADAS.length * CADENCIA + 0.26;

function AroBordando() {
  return (
    <div className="relative h-[248px] w-[248px]">
      <div className="flm-aro-entra absolute inset-0">
        <img
          src="/aro-bordado.webp"
          alt=""
          aria-hidden="true"
          width={248}
          height={248}
          className="h-full w-full select-none"
        />
      </div>

      <svg
        viewBox={`0 0 ${LADO} ${LADO}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
        role="presentation"
      >
        <g className="flm-latido flm-svg-anim" style={{ animationDelay: `${FIN_DEL_BORDADO}s` }}>
          {PUNTADAS.map((puntada) => (
            <g
              key={`${puntada.x}-${puntada.y}`}
              transform={`translate(${puntada.x} ${puntada.y}) rotate(${puntada.giro})`}
            >
              <g
                className="flm-puntada flm-svg-anim"
                style={{ animationDelay: `${puntada.retraso.toFixed(3)}s` }}
              >
                <path
                  d={`M-${BRAZO} -${BRAZO}L${BRAZO} ${BRAZO}M${BRAZO} -${BRAZO}L-${BRAZO} ${BRAZO}`}
                  stroke={puntada.hilo}
                  strokeWidth="2.7"
                  strokeLinecap="round"
                />
              </g>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

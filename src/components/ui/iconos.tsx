/**
 * Iconos de la interfaz y corazón de la marca, en SVG.
 *
 * Sustituyen a los caracteres que se usaban antes (`👍`, `👎`, `⚠`, `✓`, `×`,
 * `←`, `→`, `↻`). Aunque varios de ellos no son emoji sino signos tipográficos,
 * todos dependían de la fuente del sistema: cada plataforma los dibujaba con
 * otro grosor, otro tamaño óptico y, en el caso de los pulgares, a todo color
 * con el estilo de Apple o de Google. Dibujados aquí se ven igual en todas
 * partes y heredan el color del texto.
 *
 * Todos son decorativos (`aria-hidden`): el texto accesible lo pone el botón que
 * los contiene, que es donde vive el significado.
 */


/** Contorno del corazón, en un lienzo propio de 32 × 30 y centrado en (16, 15.3). */
const TRAZO_CORAZON =
  'M16 27.6C16 27.6 2.6 19.7 2.6 10.9C2.6 6.4 6.1 3 10.3 3C13 3 15.1 4.5 16 6.6C16.9 4.5 19 3 21.7 3C25.9 3 29.4 6.4 29.4 10.9C29.4 19.7 16 27.6 16 27.6Z';

/** Huecos del borde dentado de la estampilla, calculados en vez de escritos a mano. */
function dentadoEstampilla() {
  const huecos: { cx: number; cy: number }[] = [];
  for (let x = 12; x <= 60; x += 8) {
    huecos.push({ cx: x, cy: 4 }, { cx: x, cy: 80 });
  }
  for (let y = 12; y <= 72; y += 8) {
    huecos.push({ cx: 4, cy: y }, { cx: 68, cy: y });
  }
  return huecos;
}

/**
 * Estampilla franqueada: el emblema de la bienvenida.
 *
 * Sustituye al corazón, que en una app de recomendaciones se lee antes como
 * "cita a ciegas" que como encuentro literario. La idea es otra: tu match es
 * algo que te mandaron desde Manizales —una estampilla con la Catedral, con su
 * matasellos encima—, y el matasellos es justo la marca de que ya salió hacia
 * ti. Viene del mundo de la correspondencia de los gráficos de la Feria (el
 * sobre y la carta de `Nativos/`), sin repetir el bordado del cálculo.
 *
 * El dentado se recorta con una máscara, no se dibuja como contorno, para que
 * los huecos dejen ver el fondo real que haya detrás.
 */
export function Estampilla({ tamano = 82, className = '' }: { tamano?: number; className?: string }) {
  return (
    <svg
      width={tamano}
      height={tamano * (94 / 82)}
      viewBox="0 0 82 94"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <mask id="dentadoEstampilla">
          <rect x="4" y="4" width="64" height="76" fill="white" />
          {dentadoEstampilla().map((hueco) => (
            <circle key={`${hueco.cx}-${hueco.cy}`} cx={hueco.cx} cy={hueco.cy} r="3.1" fill="black" />
          ))}
        </mask>
      </defs>

      <g transform="translate(3 6) rotate(-4 36 42)">
        <rect
          x="4"
          y="4"
          width="64"
          height="76"
          fill="var(--color-cream-white)"
          mask="url(#dentadoEstampilla)"
        />
        <rect x="10" y="10" width="52" height="63" fill="var(--color-cream)" />
        <image
          href="/catedral.webp"
          x="19"
          y="15"
          width="34"
          height="44"
          preserveAspectRatio="xMidYMax meet"
        />
        <text
          x="36"
          y="70"
          textAnchor="middle"
          fill="var(--color-burgundy)"
          fontFamily="var(--font-display)"
          fontSize="7.5"
          fontWeight="800"
          letterSpacing="0.5"
        >
          17 FLM
        </text>
      </g>

      {/*
        Matasellos: pisa la esquina de la estampilla, que es lo que la deja
        franqueada. En un matasellos real el centro lleva la ciudad y la fecha;
        aquí lleva el corazón, que es lo que esta oficina despacha.

        Va DENTRO del grupo, y por tanto con su misma tinta, su misma opacidad y
        su mismo giro: un sello se estampa de un golpe, así que el corazón tiene
        que estar torcido lo mismo que los aros. Sacarlo del grupo para que se
        viera más nítido lo delataría como una calcomanía pegada encima.
      */}
      <g transform="translate(56 26) rotate(-14)" opacity="0.62">
        <circle r="19" fill="none" stroke="var(--color-burgundy)" strokeWidth="1.7" />
        <circle
          r="14"
          fill="none"
          stroke="var(--color-burgundy)"
          strokeWidth="1"
          strokeDasharray="2 3.2"
        />
        <path
          d={TRAZO_CORAZON}
          transform="scale(0.6) translate(-16 -15.3)"
          fill="var(--color-burgundy)"
        />
      </g>
    </svg>
  );
}

interface IconoProps {
  /** Lado del icono en píxeles. */
  tamano?: number;
  /** Grosor del trazo, para los iconos de línea. */
  grosor?: number;
  className?: string;
}

function Lienzo({
  tamano = 24,
  className = '',
  children,
}: {
  tamano?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Trazo compartido por los iconos de línea. */
const trazo = (grosor: number) => ({
  stroke: 'currentColor',
  strokeWidth: grosor,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function IconoCheck({ tamano, grosor = 2.6, className }: IconoProps) {
  return (
    <Lienzo tamano={tamano} className={className}>
      <path d="M4.8 12.6 9.6 17.4 19.2 6.8" {...trazo(grosor)} />
    </Lienzo>
  );
}

export function IconoMas({ tamano, grosor = 2.6, className }: IconoProps) {
  return (
    <Lienzo tamano={tamano} className={className}>
      <path d="M12 5.2v13.6M5.2 12h13.6" {...trazo(grosor)} />
    </Lienzo>
  );
}

export function IconoCerrar({ tamano, grosor = 2.2, className }: IconoProps) {
  return (
    <Lienzo tamano={tamano} className={className}>
      <path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" {...trazo(grosor)} />
    </Lienzo>
  );
}

export function IconoFlechaIzquierda({ tamano, grosor = 2.2, className }: IconoProps) {
  return (
    <Lienzo tamano={tamano} className={className}>
      <path d="M14.8 5.2 8 12l6.8 6.8" {...trazo(grosor)} />
    </Lienzo>
  );
}

export function IconoFlechaDerecha({ tamano, grosor = 2.2, className }: IconoProps) {
  return (
    <Lienzo tamano={tamano} className={className}>
      <path d="M9.2 5.2 16 12l-6.8 6.8" {...trazo(grosor)} />
    </Lienzo>
  );
}

/** Flecha circular de "volver a empezar". */
export function IconoReiniciar({ tamano, grosor = 2.2, className }: IconoProps) {
  return (
    <Lienzo tamano={tamano} className={className}>
      <path d="M20.4 12a8.4 8.4 0 1 1-2.46-5.94" {...trazo(grosor)} />
      <path d="M20.4 3.9v6h-6" {...trazo(grosor)} />
    </Lienzo>
  );
}

/** Triángulo de aviso, para los cruces de horario y los errores de carga. */
export function IconoAdvertencia({ tamano, grosor = 2.1, className }: IconoProps) {
  return (
    <Lienzo tamano={tamano} className={className}>
      <path d="M12 3.4 22.2 20.6H1.8z" {...trazo(grosor)} />
      <path d="M12 9.4v4.4" {...trazo(grosor)} />
      <circle cx="12" cy="17.2" r="1.15" fill="currentColor" />
    </Lienzo>
  );
}

/**
 * Pulgar de "¿te sirvió tu match?". El de abajo es el mismo dibujo girado media
 * vuelta, para que los dos pesen exactamente lo mismo en pantalla —con dos
 * trazados distintos uno siempre acaba pareciendo más rotundo que el otro—.
 */
export function IconoPulgar({
  direccion,
  tamano = 24,
  className = '',
}: {
  direccion: 'arriba' | 'abajo';
  tamano?: number;
  className?: string;
}) {
  return (
    <Lienzo tamano={tamano} className={className}>
      <g transform={direccion === 'abajo' ? 'rotate(180 12 12)' : undefined} fill="currentColor">
        <path d="M3.1 11.6a1.3 1.3 0 0 1 1.3-1.3h2.2v11.2H4.4a1.3 1.3 0 0 1-1.3-1.3z" />
        <path d="M8.1 10 13.4 2.5a1.6 1.6 0 0 1 2.9 1.1l-.9 4.6h4.3a2.2 2.2 0 0 1 2.2 2.7l-1.7 7.6a2.8 2.8 0 0 1-2.7 2.2H8.1z" />
      </g>
    </Lienzo>
  );
}

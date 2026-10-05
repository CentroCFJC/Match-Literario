/**
 * Configuración de los pasos 1 a 6 del wizard.
 *
 * Transcrita del diseño (`STEPS` en `Recomendador de Autores.dc.html`):
 * mismos títulos, mismos máximos, mismo layout, mismos gráficos decorativos.
 * El paso 7 ("Arma tu agenda") tiene pantalla propia porque agrupa dos
 * preguntas, así que aquí no vive.
 */

import {
  ESTILOS,
  EDADES,
  GENEROS,
  MOOD,
  TEMATICAS,
  VOCES_WILDCARD,
  VOCES_WIZARD,
} from '@/lib/vocabulario';

/** Clave del paso dentro de `SeleccionWizard`. */
export type ClavePaso =
  | 'mood'
  | 'generos'
  | 'tematicas'
  | 'estilo'
  | 'voces'
  | 'edad';

export interface OpcionPaso {
  label: string;
  /** Subtítulo, solo en el layout de tarjetas (paso 4). */
  hint?: string;
}

export interface Paso {
  /** Número visible: "3/08". */
  num: number;
  clave: ClavePaso;
  titulo: string;
  opciones: OpcionPaso[];
  /** `true` si solo se puede elegir una opción. */
  unica: boolean;
  /** Máximo de selecciones cuando `unica` es `false`. */
  max?: number;
  /** Opción comodín que anula al resto de la selección. */
  comodin?: string;
  layout: 'grid' | 'cards';
  /** Gráfico decorativo del diseño, si el paso lo lleva. */
  decoracion?: {
    src: string;
    alineacion: 'flex-start' | 'flex-end';
    ancho: number;
    margenSuperior: number;
  };
}

const comoTexto = (lista: readonly string[]): OpcionPaso[] =>
  lista.map((label) => ({ label }));

export const PASOS: Paso[] = [
  {
    num: 1,
    clave: 'mood',
    titulo: '¿Qué buscas cuando lees?',
    opciones: comoTexto(MOOD),
    unica: false,
    max: 3,
    layout: 'grid',
    decoracion: {
      src: '/graficos separados-13.png',
      alineacion: 'flex-end',
      ancho: 225,
      margenSuperior: 24,
    },
  },
  {
    num: 2,
    clave: 'generos',
    titulo: '¿Qué géneros te mueven?',
    opciones: comoTexto(GENEROS),
    unica: false,
    max: 5,
    layout: 'grid',
  },
  {
    num: 3,
    clave: 'tematicas',
    titulo: '¿De qué quieres leer y hablar?',
    opciones: comoTexto(TEMATICAS),
    unica: false,
    max: 5,
    layout: 'grid',
  },
  {
    num: 4,
    clave: 'estilo',
    titulo: '¿Cómo te gusta leer?',
    opciones: ESTILOS.map((estilo) => ({ label: estilo.label, hint: estilo.hint })),
    unica: true,
    layout: 'cards',
    decoracion: {
      src: '/graficos separados-12.png',
      alineacion: 'flex-end',
      ancho: 245,
      margenSuperior: 18,
    },
  },
  {
    num: 5,
    clave: 'voces',
    titulo: '¿A quién te gustaría leer?',
    // Las 7 voces de la hoja más el comodín, que no es un tag de autor.
    opciones: comoTexto(VOCES_WIZARD),
    unica: false,
    max: 3,
    comodin: VOCES_WILDCARD,
    layout: 'grid',
  },
  {
    num: 6,
    clave: 'edad',
    titulo: '¿Cuántos años tienes?',
    opciones: comoTexto(EDADES),
    unica: true,
    layout: 'grid',
    decoracion: {
      src: '/graficos separados-02.png',
      alineacion: 'flex-end',
      ancho: 230,
      margenSuperior: 16,
    },
  },
];

/** Total de pasos que ve la persona, incluido "Arma tu agenda". */
export const TOTAL_PASOS = 7;

/** Texto de ayuda bajo el título, según el tipo de paso. */
export function ayudaDelPaso(paso: Paso): string {
  if (paso.unica) return 'Elige una opción';
  if (paso.max) return `Selección múltiple · hasta ${paso.max}`;
  return 'Selección múltiple';
}

export function pasoPorNumero(num: number): Paso | undefined {
  return PASOS.find((paso) => paso.num === num);
}

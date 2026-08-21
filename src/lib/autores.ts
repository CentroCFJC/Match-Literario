/**
 * Helpers de presentación de autores. Puros, compartidos por varias pantallas.
 */

import type { Autor } from '@/lib/data/types';

/**
 * Paleta de avatares del design system. La hoja no tiene columna de color, así
 * que se asigna uno estable a partir del id: el mismo autor sale siempre igual.
 */
const PALETA_AVATAR = [
  'var(--color-burgundy)',
  'var(--color-magenta)',
  'var(--color-pink)',
  'var(--color-coral-2)',
  'var(--color-magenta-2)',
  'var(--color-burgundy-soft)',
  'var(--color-ink)',
];

/** Iniciales para el avatar: primeras letras de las dos primeras palabras. */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0] ?? '')
    .join('')
    .toUpperCase();
}

/** Color del avatar, determinista a partir del id. */
export function colorAvatar(autor: Pick<Autor, 'id'>): string {
  let acumulado = 0;
  for (let i = 0; i < autor.id.length; i += 1) acumulado += autor.id.charCodeAt(i);
  return PALETA_AVATAR[acumulado % PALETA_AVATAR.length];
}

/**
 * Línea de procedencia bajo el nombre.
 *
 * `origen` es el enum de la hoja (Local/Caldas/Nacional/…) y `pais` el texto
 * libre. Se combinan salvo cuando el origen no añade nada: para un autor
 * "Nacional" de Colombia, decir "Colombia · Nacional" sobra.
 */
export function textoOrigen(autor: Pick<Autor, 'pais' | 'origen'>): string {
  if (!autor.origen) return autor.pais;
  if (autor.origen === 'Local' || autor.origen === 'Caldas') {
    return `${autor.pais} · ${autor.origen === 'Local' ? 'Manizales' : 'Caldas'}`;
  }
  if (autor.origen === 'Nacional') return autor.pais;
  return `${autor.pais} · ${autor.origen}`;
}

/**
 * Chips que se muestran bajo el nombre de un autor: un género, una temática y
 * una voz, que es la mezcla que da más información en menos espacio.
 */
export function chipsAutor(autor: Autor, cuantos = 3): string[] {
  const candidatos: Array<string | undefined> = [
    autor.generos[0],
    autor.tematicas[0],
    autor.voces[0],
    autor.generos[1],
    autor.tematicas[1],
  ];
  return candidatos.filter((chip): chip is string => Boolean(chip)).slice(0, cuantos);
}

/** Todas las etiquetas del autor, para el modal. */
export function etiquetasAutor(autor: Autor, cuantas = 6): string[] {
  return [...autor.generos, ...autor.tematicas, ...autor.voces].slice(0, cuantas);
}

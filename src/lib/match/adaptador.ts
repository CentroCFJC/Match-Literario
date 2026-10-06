/**
 * Adaptador entre el modelo de datos (Google Sheets) y el motor de match.
 *
 * Es la única pieza que conoce ambos mundos. Si en la fase 2 cambia la forma en
 * que se leen las hojas pero se respetan los tipos de `src/lib/data/types.ts`,
 * este archivo no hay que tocarlo.
 */

import type { Actividad, Autor } from '@/lib/data/types';
import { franjaDeMinutos } from '@/lib/vocabulario';
import type { PerfilAutor, PerfilLector } from './types';

/** Proyecta un `Autor` y sus actividades al perfil que consume el motor. */
export function aPerfilAutor(autor: Autor, actividadesDelAutor: readonly Actividad[]): PerfilAutor {
  return {
    id: autor.id,
    mood: autor.mood,
    generos: autor.generos,
    tematicas: autor.tematicas,
    voces: autor.voces,
    publico: autor.publico,
    generoAutor: autor.generoAutor,
    // El primer género de la columna es el dominante: es el orden en que lo
    // escribió la curaduría, no un ranking calculado.
    generoDominante: autor.generos[0] ?? null,
    franjasDisponibles: actividadesDelAutor.map((actividad) => ({
      fecha: actividad.fecha,
      franja: franjaDeMinutos(actividad.inicioMin),
    })),
  };
}

/**
 * Índice `autorId → actividades`. Una actividad puede tener varios autores, así
 * que aparece en la lista de cada uno de ellos.
 */
export function actividadesPorAutor(
  actividades: readonly Actividad[],
): Map<string, Actividad[]> {
  const indice = new Map<string, Actividad[]>();
  for (const actividad of actividades) {
    for (const autorId of actividad.autorIds) {
      const lista = indice.get(autorId);
      if (lista) lista.push(actividad);
      else indice.set(autorId, [actividad]);
    }
  }
  return indice;
}

/** Proyecta el catálogo completo. */
export function aPerfilesAutores(
  autores: readonly Autor[],
  actividades: readonly Actividad[],
): PerfilAutor[] {
  const indice = actividadesPorAutor(actividades);
  return autores.map((autor) => aPerfilAutor(autor, indice.get(autor.id) ?? []));
}

/**
 * Proyecta las selecciones del wizard al perfil del lector.
 *
 * Acepta cualquier objeto con la forma de las selecciones (el store de Zustand
 * la cumple), para no acoplar el motor al estado de la UI.
 */
export function aPerfilLector(seleccion: PerfilLector): PerfilLector {
  return {
    mood: [...seleccion.mood],
    generos: [...seleccion.generos],
    tematicas: [...seleccion.tematicas],
    voces: [...seleccion.voces],
    edad: seleccion.edad,
    dias: [...seleccion.dias],
    franjas: [...seleccion.franjas],
  };
}

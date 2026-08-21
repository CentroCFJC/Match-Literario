'use client';

/**
 * Carga del catálogo en el cliente.
 *
 * Un único sitio que llama a `GET /api/catalogo`, deriva los días del evento y
 * los deja en el store. Lo usan tanto la carga inicial (el paso 8 necesita los
 * días antes de calcular nada) como el recálculo del match y el reintento de la
 * pantalla de error.
 */

import { diasDelEvento } from '@/lib/agenda';
import type { Actividad, Autor } from '@/lib/data/types';
import { useMatchStore } from '@/store/useMatchStore';

interface RespuestaCatalogo {
  autores: Autor[];
  actividades: Actividad[];
}

/**
 * Pide el catálogo y lo guarda en el store. Lanza si no se puede leer, para que
 * quien llama decida si eso es una pantalla de error o un fallo silencioso.
 */
export async function cargarCatalogo(): Promise<RespuestaCatalogo> {
  const respuesta = await fetch('/api/catalogo', { cache: 'no-store' });
  if (!respuesta.ok) throw new Error(`GET /api/catalogo respondió ${respuesta.status}`);

  const { autores, actividades } = (await respuesta.json()) as RespuestaCatalogo;
  useMatchStore.getState().fijarCatalogo(autores, actividades, diasDelEvento(actividades));
  return { autores, actividades };
}

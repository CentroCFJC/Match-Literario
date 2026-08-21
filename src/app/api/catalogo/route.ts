/**
 * `GET /api/catalogo` — autores y programación de la feria.
 *
 * La app la llama una vez, en la pantalla "Calculando tu match…". Se expone
 * como ruta y no como carga en un server component para que la pantalla de
 * error del diseño ("No pudimos cargar los autores" + "Reintentar") pueda
 * reintentar de verdad sin recargar la página.
 *
 * En la fase 2 esta ruta no cambia: solo cambia lo que hay detrás de
 * `getAutores()` / `getActividades()` en `src/lib/data/source.ts`.
 */

import { NextResponse } from 'next/server';

import { getActividades, getAutores } from '@/lib/data/source';

/** Los datos vienen de una hoja que se edita a mano: nada de caché estática. */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [autores, actividades] = await Promise.all([getAutores(), getActividades()]);
    return NextResponse.json({ autores, actividades });
  } catch (error) {
    console.error('[GET /api/catalogo] no se pudo leer la fuente de datos:', error);
    return NextResponse.json(
      { error: 'No pudimos cargar los autores.' },
      { status: 502 },
    );
  }
}

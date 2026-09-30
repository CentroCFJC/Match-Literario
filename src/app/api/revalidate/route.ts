/**
 * `POST /api/revalidate?token=...` — fuerza el refresco del catálogo.
 *
 * La lectura de autores/actividades se cachea con `unstable_cache`. Este
 * endpoint invalida esa cache para que una corrección de última hora en la
 * hoja (cancelación, cambio de horario, etc.) se refleje de inmediato.
 *
 * El token debe coincidir con `REVALIDATE_TOKEN` en `.env`.
 */

import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!process.env.REVALIDATE_TOKEN || token !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  revalidateTag('catalogo');
  return NextResponse.json({ revalidated: true, tag: 'catalogo' });
}

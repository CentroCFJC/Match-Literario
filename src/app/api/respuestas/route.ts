/**
 * `POST /api/respuestas` — guarda una sesión completa.
 *
 * Crea UNA fila en la pestaña `Respuestas` (27 columnas). Es el único punto de
 * escritura al completar el wizard (y al registrar un abandono). Las
 * actualizaciones posteriores de la misma sesión van por
 * `PATCH /api/respuestas/[sessionId]`, no por aquí.
 *
 * Contrato:
 *   201 → { ok: true, timestamp }
 *   400 → { ok: false, error: 'validacion', detalles: [...] }
 *   501 → { ok: false, error: 'sin-configurar' }  (no hay service account)
 *   502 → { ok: false, error: 'persistencia' }
 */

import { NextResponse } from 'next/server';

import { esquemaRespuesta } from '@/lib/data/esquemas';
import { avisarSinConfigurar, SheetsSinConfigurar } from '@/lib/data/googleSheets';
import { saveRespuesta } from '@/lib/data/source';
import type { RespuestaEntrante } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'validacion', detalles: ['El cuerpo debe ser JSON válido.'] },
      { status: 400 },
    );
  }

  const validacion = esquemaRespuesta.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'validacion',
        detalles: validacion.error.issues.map(
          (issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`,
        ),
      },
      { status: 400 },
    );
  }

  const entrada = validacion.data as RespuestaEntrante;

  try {
    const guardada = await saveRespuesta(entrada, {
      // El user agent no se guarda: solo se usa para derivar la columna
      // `dispositivo`. Guardarlo entero sería un fingerprint.
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true, timestamp: guardada.timestamp }, { status: 201 });
  } catch (error) {
    // Ver la nota equivalente en `[sessionId]/route.ts`: la falta de service
    // account no es un fallo de esta petición.
    if (error instanceof SheetsSinConfigurar) {
      avisarSinConfigurar();
      return NextResponse.json({ ok: false, error: 'sin-configurar' }, { status: 501 });
    }
    console.error('[POST /api/respuestas] no se pudo guardar la respuesta:', error);
    return NextResponse.json({ ok: false, error: 'persistencia' }, { status: 502 });
  }
}

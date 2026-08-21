/**
 * `POST /api/respuestas` — guarda una sesión completa.
 *
 * Escribe UNA fila en la pestaña `Respuestas` y, si la persona dejó algo en las
 * preguntas abiertas, otra en `Feedback` (que es el detalle cómodo de leer para
 * la curaduría; los mismos datos van también en `Respuestas`).
 *
 * La validación de forma y vocabulario ya es la definitiva; lo único
 * provisional es la escritura, que hoy queda en un log dentro de `source.ts`.
 *
 * Contrato:
 *   201 → { ok: true, timestamp }
 *   400 → { ok: false, error: 'validacion', detalles: [...] }
 *   502 → { ok: false, error: 'persistencia' }
 */

import { NextResponse } from 'next/server';

import { esquemaRespuesta } from '@/lib/data/esquemas';
import { saveFeedback, saveRespuesta } from '@/lib/data/source';
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

    // La pestaña `Feedback` solo recibe filas cuando hay algo que leer.
    const hayFeedback =
      entrada.feedbackUtil !== null ||
      entrada.feedbackTexto.trim() !== '' ||
      entrada.autorFaltante.trim() !== '' ||
      entrada.temaFaltante.length > 0;

    if (hayFeedback) {
      await saveFeedback({
        sessionId: entrada.sessionId,
        feedbackUtil: entrada.feedbackUtil,
        feedbackTexto: entrada.feedbackTexto,
        autorFaltante: entrada.autorFaltante,
        temaFaltante: entrada.temaFaltante,
      });
    }

    return NextResponse.json({ ok: true, timestamp: guardada.timestamp }, { status: 201 });
  } catch (error) {
    // TODO: reemplazar con lectura/escritura real de Google Sheets
    //       — cuando `saveRespuesta` escriba de verdad, este catch pasa a cubrir
    //         fallos de red y de cuota de la API de Sheets.
    console.error('[POST /api/respuestas] no se pudo guardar la respuesta:', error);
    return NextResponse.json({ ok: false, error: 'persistencia' }, { status: 502 });
  }
}

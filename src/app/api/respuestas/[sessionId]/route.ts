/**
 * `PATCH /api/respuestas/[sessionId]` — actualiza la sesión existente.
 *
 * Es el único punto de escritura para los cambios posteriores al `POST` inicial:
 * agenda ("Mi agenda"), "Cuéntanos más" y "¿Te sirvió tu match?". Hace upsert
 * por `session_id`: si la fila ya existe la actualiza, si no la crea, de modo
 * que la misma sesión jamás produce dos filas.
 *
 * Contrato:
 *   200 → { ok: true, timestamp }
 *   400 → { ok: false, error: 'validacion', detalles: [...] }
 *   501 → { ok: false, error: 'sin-configurar' }  (no hay service account)
 *   502 → { ok: false, error: 'persistencia' }
 */

import { NextResponse } from 'next/server';

import { esquemaRespuesta } from '@/lib/data/esquemas';
import { avisarSinConfigurar, SheetsSinConfigurar } from '@/lib/data/googleSheets';
import { updateRespuesta } from '@/lib/data/source';
import type { RespuestaEntrante } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  // La validación del UUID de la ruta no se delega en `esquemaRespuesta`: esa
  // solo cubre el cuerpo. Aquí se valida el identificador de la URL.
  const esUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
  if (!esUuid) {
    return NextResponse.json(
      { ok: false, error: 'validacion', detalles: ['sessionId no es un UUID válido.'] },
      { status: 400 },
    );
  }

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

  // Rigor: el `session_id` del cuerpo debe coincidir con el de la ruta. Así un
  // PATCH no puede reescribir la fila de otra sesión por un descuido del cliente.
  if (entrada.sessionId !== sessionId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'validacion',
        detalles: ['El sessionId del cuerpo no coincide con el de la ruta.'],
      },
      { status: 400 },
    );
  }

  try {
    const guardada = await updateRespuesta(entrada, {
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true, timestamp: guardada.timestamp }, { status: 200 });
  } catch (error) {
    // Sin service account no hay a dónde escribir. Es el estado normal en local
    // y una mala configuración en producción, pero en ninguno de los dos casos
    // es un fallo de la petición: se avisa una vez y se devuelve un 501, que el
    // cliente registra como aviso y no como error.
    if (error instanceof SheetsSinConfigurar) {
      avisarSinConfigurar();
      return NextResponse.json({ ok: false, error: 'sin-configurar' }, { status: 501 });
    }
    console.error('[PATCH /api/respuestas] no se pudo actualizar la respuesta:', error);
    return NextResponse.json({ ok: false, error: 'persistencia' }, { status: 502 });
  }
}

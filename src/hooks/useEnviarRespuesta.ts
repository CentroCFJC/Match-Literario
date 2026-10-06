'use client';

import { useCallback } from 'react';

import { autoresEnAgenda, construirAgenda, contarConflictos, contarItems } from '@/lib/agenda';
import type { CuerpoRespuesta } from '@/lib/data/esquemas';
import { useMatchStore } from '@/store/useMatchStore';

/**
 * Arma el cuerpo de `POST /api/respuestas` a partir del estado actual.
 *
 * Aquí se calcula la telemetría implícita (§7.5): tiempo total, autores
 * clicados, autores en ruta y cruces de horario. Nada de esto se le pregunta a
 * la persona; sale de lo que ya hizo.
 *
 * `timestamp`, `dispositivo` y `version_app` NO viajan: los pone el servidor.
 */
export function construirCuerpo(opciones: {
  completado: boolean;
  pasoAbandono: number | null;
}): CuerpoRespuesta {
  const estado = useMatchStore.getState();
  const { seleccion, extra, feedback, resultados, agenda, actividades, autores } = estado;

  const rutaResuelta = construirAgenda(agenda, actividades, autores);

  return {
    sessionId: estado.asegurarSessionId(),

    edad: seleccion.edad,
    generosSel: seleccion.generos,
    tematicasSel: seleccion.tematicas,
    moodSel: seleccion.mood,
    vocesSel: seleccion.voces,
    actividadesInteresSel: extra.actividadesInteres,
    diasAsistenciaSel: seleccion.dias,
    franjasSel: seleccion.franjas,

    visitaPrevia: extra.visitaPrevia,
    origenVisitante: extra.origenVisitante,
    dondeConsigueLibros: extra.dondeConsigueLibros,
    comoSeEntero: extra.comoSeEntero,

    matchTopIds: resultados.map((resultado) => resultado.autorId),
    autoresClickIds: estado.autoresClickeados,
    autoresRutaIds: autoresEnAgenda(rutaResuelta),
    nAutoresRuta: contarItems(rutaResuelta),
    conflictosDetectados: contarConflictos(rutaResuelta),
    tiempoTotalSeg: estado.iniciadoEn
      ? Math.max(0, Math.round((Date.now() - estado.iniciadoEn) / 1000))
      : 0,
    pasoAbandono: opciones.pasoAbandono,
    completado: opciones.completado,

    feedbackUtil: feedback.util,
    autorFaltante: feedback.autorFaltante,
    temaFaltante: feedback.temaFaltante,
  };
}

/**
 * Envía la respuesta completa a `POST /api/respuestas`.
 *
 * Es el evento de CREACIÓN de la fila: se usa al ver el match (completado) y al
 * registrar un abandono. Nunca interrumpe a la persona: si falla, se registra y
 * la app sigue. Guardar la estadística no puede costarle el match a nadie.
 */
export function useEnviarRespuesta() {
  return useCallback(async (opciones?: { completado?: boolean; pasoAbandono?: number | null }) => {
    const cuerpo = construirCuerpo({
      completado: opciones?.completado ?? true,
      pasoAbandono: opciones?.pasoAbandono ?? null,
    });

    await enviar('/api/respuestas', 'POST', cuerpo);
  }, []);
}

/**
 * Actualiza la sesión existente con `PATCH /api/respuestas/[sessionId]`.
 *
 * Es el evento de ACTUALIZACIÓN: agenda ("Mi agenda" y salir de la agenda),
 * "Cuéntanos más" y "¿Te sirvió tu match?". El servidor hace upsert por
 * `session_id`, así que nunca crea una fila duplicada. Igual que el POST, nunca
 * interrumpe a la persona: si falla, solo se registra.
 */
export function useActualizarRespuesta() {
  return useCallback(async (): Promise<boolean> => {
    const cuerpo = construirCuerpo({ completado: true, pasoAbandono: null });

    return enviar(`/api/respuestas/${cuerpo.sessionId}`, 'PATCH', cuerpo);
  }, []);
}

/**
 * Envía el cuerpo con el método indicado, registra el fallo sin lanzar y
 * devuelve `true` si la API respondió bien, para que el llamador sepa si puede
 * marcar la agenda como sincronizada.
 */
async function enviar(url: string, metodo: 'POST' | 'PATCH', cuerpo: CuerpoRespuesta): Promise<boolean> {
  try {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    if (!respuesta.ok) {
      // 501 = el servidor no tiene configurada la hoja de cálculo. Es lo normal
      // en un entorno local sin `.env`, así que se avisa sin usar `console.error`:
      // el panel de errores de Next lo trataría como un fallo de la app y taparía
      // la pantalla, cuando aquí no hay nada roto que arreglar en el cliente.
      if (respuesta.status === 501) {
        console.warn(
          '[useEnviarRespuesta] las respuestas no se están guardando: el servidor no tiene ' +
            'configurado Google Sheets. La app funciona igual (ver .env.example).',
        );
        return false;
      }
      console.error(
        `[useEnviarRespuesta] la API respondió ${respuesta.status} a ${metodo} ${url}:`,
        await respuesta.text(),
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[useEnviarRespuesta] no se pudo enviar ${metodo} ${url}:`, error);
    return false;
  }
}

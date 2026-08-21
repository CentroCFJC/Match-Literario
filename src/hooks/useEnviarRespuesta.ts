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
    estiloSel: seleccion.estilo,
    vocesSel: seleccion.voces,
    actividadesInteresSel: seleccion.actividades,
    diasAsistenciaSel: seleccion.dias,
    franjasSel: seleccion.franjas,

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
    feedbackTexto: feedback.texto,
    autorFaltante: feedback.autorFaltante,
    temaFaltante: feedback.temaFaltante,
  };
}

/**
 * Envía la respuesta completa a `POST /api/respuestas`.
 *
 * Nunca interrumpe a la persona: si falla, se registra y la app sigue. Guardar
 * la estadística no puede costarle el match a nadie.
 */
export function useEnviarRespuesta() {
  return useCallback(async (opciones?: { completado?: boolean; pasoAbandono?: number | null }) => {
    const cuerpo = construirCuerpo({
      completado: opciones?.completado ?? true,
      pasoAbandono: opciones?.pasoAbandono ?? null,
    });

    try {
      const respuesta = await fetch('/api/respuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      if (!respuesta.ok) {
        console.error(
          '[useEnviarRespuesta] la API respondió',
          respuesta.status,
          await respuesta.text(),
        );
      }
    } catch (error) {
      console.error('[useEnviarRespuesta] no se pudo enviar la respuesta:', error);
    }
  }, []);
}

'use client';

import { useCallback } from 'react';

import { cargarCatalogo } from '@/lib/catalogo';
import { aPerfilesAutores, calcularMatch } from '@/lib/match';
import { useMatchStore } from '@/store/useMatchStore';

/**
 * Tiempo mínimo en "Calculando tu match…", para que la animación se lea (§5).
 *
 * La escena cuenta algo (los peces salen del libro, se encuentran y escriben el
 * corazón, que late) y su desenlace cae en el segundo 2,1. Con los 1,5s de antes
 * la pantalla se iba justo cuando aparecía el corazón y casi nadie llegaba a
 * verlo. Si se toca este número, hay que revisar los retrasos de
 * `Calculando.tsx` y de las clases `flm-*` de `globals.css`.
 */
const MINIMO_CALCULANDO_MS = 2200;
/** Tiempo del esqueleto antes de mostrar el resultado, como en el diseño. */
const ESQUELETO_MS = 700;

/**
 * Los temporizadores viven a nivel de módulo, NO en un `useRef`.
 *
 * Quien dispara el cálculo es el paso 6, que se desmonta en cuanto se va a la
 * pantalla "Calculando…". Si los temporizadores colgaran del componente, su
 * limpieza al desmontar cancelaría la transición a resultados y la app se
 * quedaría congelada en la animación para siempre.
 *
 * Son como mucho dos temporizadores de menos de dos segundos, y cada llamada
 * limpia los de la anterior, así que no hay fugas.
 */
let temporizadores: ReturnType<typeof setTimeout>[] = [];

/**
 * Orquesta la secuencia "Calculando → esqueleto → resultado" del diseño:
 *
 *   1. Va a la pantalla de cálculo.
 *   2. Se asegura de tener el catálogo (normalmente ya cargado al abrir la app).
 *   3. Corre el motor de match, que es puro y local.
 *   4. Muestra el esqueleto y luego el resultado.
 *
 * Si el catálogo falla, deja la pantalla de resultado en estado `error`, que es
 * la vista "No pudimos cargar los autores" con su botón de reintentar.
 */
export function useCalcularMatch() {
  return useCallback(async () => {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];

    const store = useMatchStore.getState();
    store.irA('calculando');
    const arranque = Date.now();

    try {
      // El catálogo suele estar ya cargado desde el arranque de la app; esto
      // cubre el reintento tras un error y la primera visita muy rápida.
      const { autores, actividades } =
        store.autores.length > 0
          ? { autores: store.autores, actividades: store.actividades }
          : await cargarCatalogo();

      // El motor es puro: mismas respuestas + mismo catálogo + misma semilla
      // ⇒ mismo resultado. La semilla es el `session_id`, así que los comodines
      // de serendipia varían entre personas pero no cambian si esta vuelve.
      const { seleccion, fijarResultados, fijarEstadoResultado, irA, asegurarSessionId } =
        useMatchStore.getState();
      fijarResultados(
        calcularMatch(seleccion, aPerfilesAutores(autores, actividades), {
          semilla: asegurarSessionId(),
        }),
      );

      const restante = Math.max(0, MINIMO_CALCULANDO_MS - (Date.now() - arranque));
      temporizadores.push(
        setTimeout(() => {
          fijarEstadoResultado('skeleton');
          irA('resultado');
          temporizadores.push(
            setTimeout(() => fijarEstadoResultado('listo'), ESQUELETO_MS),
          );
        }, restante),
      );
    } catch (error) {
      console.error('[useCalcularMatch] no se pudo calcular el match:', error);
      const { fijarEstadoResultado, irA } = useMatchStore.getState();
      const restante = Math.max(0, MINIMO_CALCULANDO_MS - (Date.now() - arranque));
      temporizadores.push(
        setTimeout(() => {
          fijarEstadoResultado('error');
          irA('resultado');
        }, restante),
      );
    }
  }, []);
}

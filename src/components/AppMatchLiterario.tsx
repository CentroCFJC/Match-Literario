'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { ContenedorApp } from '@/components/ContenedorApp';
import { HojaCompartir } from '@/components/hojas/HojaCompartir';
import { HojaCuentanosMas } from '@/components/hojas/HojaCuentanosMas';
import { HojaFeedback } from '@/components/hojas/HojaFeedback';
import { ModalAutor } from '@/components/hojas/ModalAutor';
import { Agenda } from '@/components/pantallas/Agenda';
import { Bienvenida } from '@/components/pantallas/Bienvenida';
import { Calculando } from '@/components/pantallas/Calculando';
import { PasoAgenda } from '@/components/pantallas/PasoAgenda';
import { Resultado } from '@/components/pantallas/Resultado';
import { Wizard } from '@/components/pantallas/Wizard';
import { Toast } from '@/components/ui/Toast';
import { construirCuerpo, useEnviarRespuesta } from '@/hooks/useEnviarRespuesta';
import { cargarCatalogo } from '@/lib/catalogo';
import { useMatchStore } from '@/store/useMatchStore';

/**
 * Raíz de la app: decide qué pantalla se ve, superpone las hojas modales y
 * conecta los efectos que no pertenecen a ninguna pantalla concreta.
 */
export function AppMatchLiterario() {
  const hidratado = useHidratacion();

  const pantalla = useMatchStore((e) => e.pantalla);
  const modalAutorId = useMatchStore((e) => e.modalAutorId);
  const hojaExtraAbierta = useMatchStore((e) => e.hojaExtraAbierta);
  const hojaFeedbackAbierta = useMatchStore((e) => e.hojaFeedbackAbierta);
  const hojaCompartirAbierta = useMatchStore((e) => e.hojaCompartirAbierta);

  useCatalogoAlArrancar(hidratado);
  useCerrarConEscape();
  useEnviarAlVerElMatch();
  useRegistrarAbandono();

  // Hasta que Zustand no rehidrata desde localStorage no sabemos en qué
  // pantalla estamos; pintar antes provocaría un salto visible.
  if (!hidratado) {
    return (
      <ContenedorApp>
        <div className="flex h-full items-center justify-center" aria-hidden="true" />
      </ContenedorApp>
    );
  }

  return (
    <ContenedorApp>
      {/*
        Solo animación de entrada, sin `AnimatePresence mode="wait"`: con salida,
        dos cambios de pantalla seguidos podían dejar la transición a medias y la
        app congelada entre dos vistas. Ver el comentario equivalente en
        `Wizard.tsx`. Las hojas modales de abajo sí usan AnimatePresence, porque
        se montan por booleano (no por `key`) y su salida deslizante importa.
      */}
      <motion.div
        key={pantalla}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="h-full"
      >
        {pantalla === 'bienvenida' ? <Bienvenida /> : null}
        {pantalla === 'wizard' ? <Wizard /> : null}
        {pantalla === 'agendaPaso' ? <PasoAgenda /> : null}
        {pantalla === 'calculando' ? <Calculando /> : null}
        {pantalla === 'resultado' ? <Resultado /> : null}
        {pantalla === 'agenda' ? <Agenda /> : null}
      </motion.div>

      <AnimatePresence>{modalAutorId ? <ModalAutor key="modal" /> : null}</AnimatePresence>
      <AnimatePresence>{hojaExtraAbierta ? <HojaCuentanosMas key="extra" /> : null}</AnimatePresence>
      <AnimatePresence>{hojaFeedbackAbierta ? <HojaFeedback key="fb" /> : null}</AnimatePresence>
      <AnimatePresence>
        {hojaCompartirAbierta ? <HojaCompartir key="compartir" /> : null}
      </AnimatePresence>

      <Toast />
    </ContenedorApp>
  );
}

// ===========================================================================
// Efectos transversales
// ===========================================================================

/** `true` cuando Zustand ya leyó localStorage. */
function useHidratacion(): boolean {
  const [hidratado, setHidratado] = useState(false);
  useEffect(() => setHidratado(true), []);
  return hidratado;
}

/**
 * Carga el catálogo al abrir la app, no al terminar el wizard.
 *
 * Hace falta antes de lo que parece: el paso 8 pregunta por los días de la
 * feria, y esos días salen de las fechas de la programación. Además así el
 * match se calcula sin esperar a la red, que es lo que pide el prompt maestro
 * ("cero bloqueos por red").
 */
function useCatalogoAlArrancar(hidratado: boolean) {
  const hayAutores = useMatchStore((e) => e.autores.length > 0);
  const pidiendo = useRef(false);

  useEffect(() => {
    if (!hidratado || hayAutores || pidiendo.current) return;
    pidiendo.current = true;

    cargarCatalogo()
      .catch((error) => {
        // No se pinta error aquí: si la persona está en la bienvenida no tiene
        // nada que ver todavía. El fallo se muestra al calcular el match, que
        // es donde el diseño tiene la pantalla de reintento.
        console.error('[useCatalogoAlArrancar] no se pudo cargar el catálogo:', error);
      })
      .finally(() => {
        pidiendo.current = false;
      });
  }, [hidratado, hayAutores]);
}

/**
 * Escape cierra la capa más alta, en el mismo orden que el diseño:
 * compartir → modal de autor → cuéntanos más → feedback.
 */
function useCerrarConEscape() {
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      const estado = useMatchStore.getState();
      if (estado.hojaCompartirAbierta) estado.abrirHojaCompartir(false);
      else if (estado.modalAutorId) estado.abrirModalAutor(null);
      else if (estado.hojaExtraAbierta) estado.abrirHojaExtra(false);
      else if (estado.hojaFeedbackAbierta) estado.abrirHojaFeedback(false);
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, []);
}

/**
 * Envía la respuesta la primera vez que el match se muestra listo. Es el evento
 * que interesa medir: alguien completó el wizard y vio su resultado.
 */
function useEnviarAlVerElMatch() {
  const pantalla = useMatchStore((e) => e.pantalla);
  const estadoResultado = useMatchStore((e) => e.estadoResultado);
  const enviarRespuesta = useEnviarRespuesta();
  const yaEnviado = useRef(false);

  useEffect(() => {
    if (yaEnviado.current) return;
    if (pantalla !== 'resultado' || estadoResultado !== 'listo') return;
    if (useMatchStore.getState().resultados.length === 0) return;
    yaEnviado.current = true;
    void enviarRespuesta({ completado: true, pasoAbandono: null });
  }, [pantalla, estadoResultado, enviarRespuesta]);
}

/**
 * Columna `paso_abandono`: si alguien empieza el wizard y se va sin llegar al
 * match, se manda igualmente una fila con `completado = FALSE` y el paso donde
 * lo dejó. Es lo que alimenta el embudo del panel de la fase 3.
 *
 * Se usa `sendBeacon` porque al cerrar la pestaña un `fetch` normal se cancela.
 */
function useRegistrarAbandono() {
  const yaRegistrado = useRef(false);

  useEffect(() => {
    const alSalir = () => {
      if (yaRegistrado.current) return;
      const estado = useMatchStore.getState();

      // Solo interesa quien empezó y no terminó.
      const empezo = estado.iniciadoEn !== null;
      const enElWizard = estado.pantalla === 'wizard' || estado.pantalla === 'agendaPaso';
      if (!empezo || !enElWizard) return;

      yaRegistrado.current = true;
      const paso = estado.pantalla === 'agendaPaso' ? 8 : estado.paso;
      const cuerpo = construirCuerpo({ completado: false, pasoAbandono: paso });

      navigator.sendBeacon?.(
        '/api/respuestas',
        new Blob([JSON.stringify(cuerpo)], { type: 'application/json' }),
      );
    };

    // `visibilitychange` es el evento fiable en móvil; `pagehide` cubre el
    // resto. `beforeunload` no se usa: en iOS no dispara.
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'hidden') alSalir();
    };

    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    window.addEventListener('pagehide', alSalir);
    return () => {
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('pagehide', alSalir);
    };
  }, []);
}

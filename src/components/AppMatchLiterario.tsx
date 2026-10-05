'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

import { ContenedorApp } from '@/components/ContenedorApp';
import { HojaCompartir } from '@/components/hojas/HojaCompartir';
import { HojaConfirmarReinicio } from '@/components/hojas/HojaConfirmarReinicio';
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
import type { Pantalla } from '@/store/useMatchStore';
import { useMatchStore } from '@/store/useMatchStore';

/**
 * Fondo de cada pantalla. La bienvenida es la única que se sale del marfil de la
 * app: llega en amarillo, que es el color con el que la Feria recibe.
 */
const FONDOS: Record<Pantalla, string> = {
  bienvenida: 'bg-yellow',
  wizard: 'bg-surface-page',
  agendaPaso: 'bg-surface-page',
  calculando: 'bg-surface-page',
  resultado: 'bg-surface-page',
  agenda: 'bg-surface-page',
};

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
  const confirmarReinicioAbierta = useMatchStore((e) => e.confirmarReinicioAbierta);

  useCatalogoAlArrancar(hidratado);
  useCerrarConEscape();
  useEnviarAlVerElMatch();
  useRegistrarAbandono();

  const fondo = FONDOS[pantalla];

  // Hasta que Zustand no rehidrata desde localStorage no sabemos en qué
  // pantalla estamos; pintar antes provocaría un salto visible. `pantalla` no se
  // persiste, así que la app siempre arranca en la bienvenida y el marcador de
  // posición puede llevar ya su amarillo, sin destello al hidratar.
  if (!hidratado) {
    return (
      <ContenedorApp fondo={FONDOS.bienvenida}>
        <div className="flex h-full items-center justify-center" aria-hidden="true" />
      </ContenedorApp>
    );
  }

  return (
    <ContenedorApp fondo={fondo}>
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
      <AnimatePresence>
        {confirmarReinicioAbierta ? <HojaConfirmarReinicio key="reinicio" /> : null}
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
 * Hace falta antes de lo que parece: el paso 7 pregunta por los días de la
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
 * confirmación de reinicio → compartir → modal de autor → cuéntanos más →
 * feedback.
 */
function useCerrarConEscape() {
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      const estado = useMatchStore.getState();
      if (estado.confirmarReinicioAbierta) estado.cerrarConfirmarReinicio();
      else if (estado.hojaCompartirAbierta) estado.abrirHojaCompartir(false);
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
 *
 * La guarda `matchEnviado` es persistente (a diferencia de un `useRef`), para
 * que re-ver el match cacheado con "Mi último match" —que solo navega a la
 * pantalla de resultado— NO dispare un `POST` nuevo por la misma sesión.
 */
function useEnviarAlVerElMatch() {
  const pantalla = useMatchStore((e) => e.pantalla);
  const estadoResultado = useMatchStore((e) => e.estadoResultado);
  const matchEnviado = useMatchStore((e) => e.matchEnviado);
  const enviarRespuesta = useEnviarRespuesta();

  useEffect(() => {
    if (matchEnviado) return;
    if (pantalla !== 'resultado' || estadoResultado !== 'listo') return;
    if (useMatchStore.getState().resultados.length === 0) return;
    // Se marca ANTES del envío: si la persona vuelve a entrar mientras el fetch
    // está en curso, no se duplica la fila. El envío es best-effort (§7.5).
    useMatchStore.getState().fijarMatchEnviado(true);
    void enviarRespuesta({ completado: true, pasoAbandono: null });
  }, [pantalla, estadoResultado, matchEnviado, enviarRespuesta]);
}

/**
 * Columna `paso_abandono`: si alguien empieza el wizard y se va sin llegar al
 * match, se manda igualmente una fila con `completado = FALSE` y el paso donde
 * lo dejó. Es lo que alimenta el embudo del panel de la fase 3.
 *
 * Además, si la persona completó el match y dejó la agenda sin sincronizar
 * (`agendaSucia`), al cerrar o cambiar de pestaña se manda un `PATCH` para no
 * perder esos cambios.
 */
function useRegistrarAbandono() {
  const yaRegistrado = useRef(false);

  useEffect(() => {
    const alSalir = () => {
      const estado = useMatchStore.getState();

      // 1) Abandono del wizard: empezó y se fue sin llegar al match → POST.
      // Se usa `sendBeacon` porque al cerrar la pestaña un `fetch` normal se
      // cancela.
      const empezo = estado.iniciadoEn !== null;
      const enElWizard = estado.pantalla === 'wizard' || estado.pantalla === 'agendaPaso';
      if (empezo && enElWizard && !yaRegistrado.current) {
        yaRegistrado.current = true;
        const paso = estado.pantalla === 'agendaPaso' ? 7 : estado.paso;
        const cuerpo = construirCuerpo({ completado: false, pasoAbandono: paso });

        navigator.sendBeacon?.(
          '/api/respuestas',
          new Blob([JSON.stringify(cuerpo)], { type: 'application/json' }),
        );
      }

      // 2) Agenda sucia sin sincronizar → PATCH antes de irse. `sendBeacon` solo
      // admite POST, así que se usa `fetch` con `keepalive`, que sobrevive al
      // cierre. Se limpia ANTES de enviar para que el doble disparo del mismo
      // cierre (`visibilitychange` + `pagehide`) no mande dos PATCH.
      if (estado.agendaSucia) {
        const cuerpo = construirCuerpo({ completado: true, pasoAbandono: null });
        estado.fijarAgendaSucia(false);
        void fetch(`/api/respuestas/${cuerpo.sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpo),
          keepalive: true,
        }).catch(() => {});
      }
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

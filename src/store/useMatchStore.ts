'use client';

/**
 * Estado global de Match Literario (Zustand + persistencia en localStorage).
 *
 * Se persiste lo que la persona construyó — sus respuestas, su match y su
 * agenda — para que "Mi último match" funcione al volver a abrir la app.
 * NO se persiste el catálogo de autores: ese siempre se relee, porque la
 * programación de la feria puede cambiar entre visitas.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Actividad, Autor, FeedbackUtil } from '@/lib/data/types';
import type { ResultadoMatch } from '@/lib/match';
import { uuidV4 } from '@/lib/uuid';
import type {
  ComoSeEntero,
  DondeLibros,
  Edad,
  FechaISO,
  Franja,
  Genero,
  Mood,
  OrigenVisitante,
  Tematica,
  TipoActividad,
  VisitaPrevia,
  VozWizard,
} from '@/lib/vocabulario';

/** Pantallas de primer nivel. Las hojas modales viven en su propio estado. */
export type Pantalla =
  | 'bienvenida'
  | 'wizard'
  | 'agendaPaso'
  | 'calculando'
  | 'resultado'
  | 'agenda';

/** Estado de carga de la pantalla de resultado, tal como lo dibuja el diseño. */
export type EstadoResultado = 'skeleton' | 'listo' | 'error';

/** Todo lo que la persona seleccionó en los 6 pasos. */
export interface SeleccionWizard {
  mood: Mood[];
  generos: Genero[];
  tematicas: Tematica[];
  voces: VozWizard[];
  edad: Edad | null;
  /** Fechas `YYYY-MM-DD` del paso 6, derivadas de la programación. */
  dias: FechaISO[];
  franjas: Franja[];
}

/** Respuestas de la hoja opcional "Cuéntanos más". */
export interface DatosExtra {
  visitaPrevia: VisitaPrevia | null;
  origenVisitante: OrigenVisitante | null;
  dondeConsigueLibros: DondeLibros[];
  comoSeEntero: ComoSeEntero[];
  /** ¿Qué te interesa de la Feria? — columna `actividades_interes_sel`. */
  actividadesInteres: TipoActividad[];
}

/** Respuestas de la hoja opcional de feedback. */
export interface DatosFeedback {
  util: FeedbackUtil;
  autorFaltante: string;
  temaFaltante: Tematica[];
}

const SELECCION_VACIA: SeleccionWizard = {
  mood: [],
  generos: [],
  tematicas: [],
  voces: [],
  edad: null,
  dias: [],
  franjas: [],
};

const EXTRA_VACIO: DatosExtra = {
  visitaPrevia: null,
  origenVisitante: null,
  dondeConsigueLibros: [],
  comoSeEntero: [],
  actividadesInteres: [],
};

const FEEDBACK_VACIO: DatosFeedback = {
  util: null,
  autorFaltante: '',
  temaFaltante: [],
};

/** Claves de `SeleccionWizard` cuyo valor es una lista. */
type ClaveLista = {
  [K in keyof SeleccionWizard]: SeleccionWizard[K] extends readonly unknown[] ? K : never;
}[keyof SeleccionWizard];

/** Claves de `SeleccionWizard` cuyo valor es un único valor o `null`. */
type ClaveUnica = Exclude<keyof SeleccionWizard, ClaveLista>;

interface EstadoMatch {
  /**
   * Columna `session_id`: UUID anónimo generado en el cliente la primera vez
   * que hace falta. Es el único identificador de la sesión; no hay cuentas.
   */
  sessionId: string | null;
  /**
   * Marca de tiempo (epoch ms) de cuando empezó el wizard. Alimenta la columna
   * `tiempo_total_seg`.
   */
  iniciadoEn: number | null;

  // --- Navegación ---------------------------------------------------------
  pantalla: Pantalla;
  /** Paso visible del wizard, 1 a 6. El 7 es la pantalla `agendaPaso`. */
  paso: number;

  // --- Respuestas ---------------------------------------------------------
  seleccion: SeleccionWizard;
  extra: DatosExtra;
  feedback: DatosFeedback;

  // --- Catálogo (no se persiste) -----------------------------------------
  autores: Autor[];
  actividades: Actividad[];
  /** Días del evento derivados de la programación (o los siete por defecto). */
  diasEvento: FechaISO[];

  // --- Resultado ----------------------------------------------------------
  resultados: ResultadoMatch[];
  estadoResultado: EstadoResultado;
  /** `true` cuando ya hay un match calculado; habilita "Mi último match". */
  tieneMatch: boolean;
  /**
   * `true` cuando la respuesta de ESTA sesión ya se envió a Sheets (POST del
   * match completado). Se persiste para que "Mi último match", que solo re-ve
   * lo cacheado tras recargar, no dispare un `POST` nuevo.
   */
  matchEnviado: boolean;

  // --- Agenda -------------------------------------------------------------
  /** Ids de actividad añadidas, en orden de adición. */
  agenda: string[];
  /**
   * `true` cuando la agenda cambió desde el último envío y aún no se ha
   * persistido. Es lo que evita escribir en Sheets si la persona abre la agenda
   * (o se va) sin tocar nada. Se persiste para sobrevivir a una recarga.
   */
  agendaSucia: boolean;

  // --- Telemetría (columnas "(auto)" de la hoja) --------------------------
  /** Ids de los autores cuyo perfil abrió. Columna `autores_click_ids`. */
  autoresClickeados: string[];

  // --- Capas superpuestas -------------------------------------------------
  modalAutorId: string | null;
  hojaExtraAbierta: boolean;
  hojaFeedbackAbierta: boolean;
  hojaCompartirAbierta: boolean;
  /** Confirmación antes de reiniciar: avisa de que se pierde agenda y match. */
  confirmarReinicioAbierta: boolean;
  /** `true` si al confirmar hay que arrancar el wizard (INICIAR) y no solo volver. */
  reiniciarEIniciar: boolean;
  toast: string | null;

  // --- Acciones -----------------------------------------------------------
  asegurarSessionId: () => string;
  empezarWizard: () => void;
  irA: (pantalla: Pantalla) => void;
  siguientePaso: () => void;
  pasoAnterior: () => void;
  alternarEnLista: (clave: ClaveLista, valor: string, max?: number, comodin?: string) => void;
  fijarUnico: (clave: ClaveUnica, valor: string | null) => void;
  fijarCatalogo: (autores: Autor[], actividades: Actividad[], diasEvento: FechaISO[]) => void;
  fijarResultados: (resultados: ResultadoMatch[]) => void;
  fijarEstadoResultado: (estado: EstadoResultado) => void;
  fijarMatchEnviado: (enviado: boolean) => void;
  alternarActividad: (actividadId: string) => void;
  alternarAutor: (autorId: string) => void;
  quitarActividad: (actividadId: string) => void;
  fijarAgendaSucia: (sucia: boolean) => void;
  abrirModalAutor: (autorId: string | null) => void;
  abrirHojaExtra: (abierta: boolean) => void;
  abrirHojaFeedback: (abierta: boolean) => void;
  abrirHojaCompartir: (abierta: boolean) => void;
  pedirReinicio: (eIniciar: boolean) => void;
  cerrarConfirmarReinicio: () => void;
  fijarExtra: (parcial: Partial<DatosExtra>) => void;
  fijarFeedback: (parcial: Partial<DatosFeedback>) => void;
  mostrarToast: (mensaje: string | null) => void;
  reiniciar: () => void;
}

export const useMatchStore = create<EstadoMatch>()(
  persist(
    (set, get) => ({
      sessionId: null,
      iniciadoEn: null,
      pantalla: 'bienvenida',
      paso: 1,
      seleccion: SELECCION_VACIA,
      extra: EXTRA_VACIO,
      feedback: FEEDBACK_VACIO,
      autores: [],
      actividades: [],
      diasEvento: [],
      resultados: [],
      estadoResultado: 'listo',
      tieneMatch: false,
      matchEnviado: false,
      agenda: [],
      agendaSucia: false,
      autoresClickeados: [],
      modalAutorId: null,
      hojaExtraAbierta: false,
      hojaFeedbackAbierta: false,
      hojaCompartirAbierta: false,
      confirmarReinicioAbierta: false,
      reiniciarEIniciar: false,
      toast: null,

      asegurarSessionId: () => {
        const actual = get().sessionId;
        if (actual) return actual;
        const nuevo = uuidV4();
        set({ sessionId: nuevo });
        return nuevo;
      },

      /** Arranca el cronómetro de `tiempo_total_seg` y entra al paso 1. */
      empezarWizard: () => {
        get().asegurarSessionId();
        set({ pantalla: 'wizard', paso: 1, iniciadoEn: Date.now() });
      },

      irA: (pantalla) => set({ pantalla }),

      siguientePaso: () =>
        set((estado) =>
          estado.paso >= 5 ? { pantalla: 'agendaPaso' as Pantalla } : { paso: estado.paso + 1 },
        ),

      pasoAnterior: () =>
        set((estado) => {
          if (estado.pantalla === 'agendaPaso') return { pantalla: 'wizard', paso: 5 };
          if (estado.paso <= 1) return { pantalla: 'bienvenida', paso: 1 };
          return { paso: estado.paso - 1 };
        }),

      /**
       * Añade o quita un valor de una lista, respetando el máximo del paso y la
       * opción comodín (que anula el resto de la selección y viceversa).
       */
      alternarEnLista: (clave, valor, max, comodin) =>
        set((estado) => {
          let lista = [...(estado.seleccion[clave] as string[])];

          if (comodin) {
            if (valor === comodin) {
              lista = lista.includes(comodin) ? [] : [comodin];
              return { seleccion: { ...estado.seleccion, [clave]: lista } };
            }
            lista = lista.filter((x) => x !== comodin);
          }

          if (lista.includes(valor)) {
            lista = lista.filter((x) => x !== valor);
          } else {
            if (max !== undefined && lista.length >= max) return {};
            lista = [...lista, valor];
          }

          return { seleccion: { ...estado.seleccion, [clave]: lista } };
        }),

      fijarUnico: (clave, valor) =>
        set((estado) => ({
          // La clave llega validada por el vocabulario del paso (EDADES), así que
          // el objeto resultante respeta `SeleccionWizard` aunque TS no pueda
          // inferirlo desde una clave computada.
          seleccion: { ...estado.seleccion, [clave]: valor } as SeleccionWizard,
        })),

      fijarCatalogo: (autores, actividades, diasEvento) =>
        set((estado) => ({
          autores,
          actividades,
          diasEvento,
          // Si la programación cambió y algún día elegido ya no existe, se cae
          // solo en vez de quedarse como un filtro fantasma.
          seleccion: {
            ...estado.seleccion,
            dias: estado.seleccion.dias.filter((dia) => diasEvento.includes(dia)),
          },
        })),

      fijarResultados: (resultados) => set({ resultados, tieneMatch: resultados.length > 0 }),

      fijarEstadoResultado: (estadoResultado) => set({ estadoResultado }),

      fijarMatchEnviado: (matchEnviado) => set({ matchEnviado }),

      alternarActividad: (actividadId) =>
        set((estado) => ({
          agenda: estado.agenda.includes(actividadId)
            ? estado.agenda.filter((id) => id !== actividadId)
            : [...estado.agenda, actividadId],
          agendaSucia: true,
        })),

      /**
       * Añade TODAS las actividades del autor, o las quita todas si ya estaban.
       * Es el comportamiento del botón "+" de las tarjetas de resultado.
       *
       * Al quitar se descartan todas sus actividades, aunque las comparta con
       * otro autor: quien quiera recuperarlas para el otro autor solo tiene que
       * volver a tocar "+" en su tarjeta.
       */
      alternarAutor: (autorId) => {
        const { actividades, agenda } = get();
        const idsSuyas = actividades
          .filter((a) => a.autorIds.includes(autorId))
          .map((a) => a.id);
        if (idsSuyas.length === 0) return;

        const yaEstaban = idsSuyas.every((id) => agenda.includes(id));

        set({
          agenda: yaEstaban
            ? agenda.filter((id) => !idsSuyas.includes(id))
            : [...new Set([...agenda, ...idsSuyas])],
          agendaSucia: true,
        });
      },

      quitarActividad: (actividadId) =>
        set((estado) => ({
          agenda: estado.agenda.filter((id) => id !== actividadId),
          agendaSucia: true,
        })),

      fijarAgendaSucia: (agendaSucia) => set({ agendaSucia }),

      abrirModalAutor: (modalAutorId) =>
        set((estado) => ({
          modalAutorId,
          // Columna `autores_click_ids`: nos interesa la brecha entre autores
          // matcheados, clicados y añadidos a la ruta.
          autoresClickeados:
            modalAutorId && !estado.autoresClickeados.includes(modalAutorId)
              ? [...estado.autoresClickeados, modalAutorId]
              : estado.autoresClickeados,
        })),

      abrirHojaExtra: (hojaExtraAbierta) => set({ hojaExtraAbierta }),
      abrirHojaFeedback: (hojaFeedbackAbierta) => set({ hojaFeedbackAbierta }),
      abrirHojaCompartir: (hojaCompartirAbierta) => set({ hojaCompartirAbierta }),

      pedirReinicio: (reiniciarEIniciar) =>
        set({ confirmarReinicioAbierta: true, reiniciarEIniciar }),
      cerrarConfirmarReinicio: () => set({ confirmarReinicioAbierta: false }),

      fijarExtra: (parcial) => set((estado) => ({ extra: { ...estado.extra, ...parcial } })),
      fijarFeedback: (parcial) =>
        set((estado) => ({ feedback: { ...estado.feedback, ...parcial } })),

      mostrarToast: (toast) => set({ toast }),

      // Reiniciar el test empieza una sesión nueva: las respuestas anteriores ya
      // se enviaron y no deben mezclarse con las nuevas.
      reiniciar: () =>
        set({
          sessionId: null,
          iniciadoEn: null,
          pantalla: 'bienvenida',
          paso: 1,
          seleccion: SELECCION_VACIA,
          extra: EXTRA_VACIO,
          feedback: FEEDBACK_VACIO,
          resultados: [],
          estadoResultado: 'listo',
          tieneMatch: false,
          matchEnviado: false,
          agenda: [],
          agendaSucia: false,
          autoresClickeados: [],
          modalAutorId: null,
          hojaExtraAbierta: false,
          hojaFeedbackAbierta: false,
          hojaCompartirAbierta: false,
          toast: null,
        }),
    }),
    {
      // Clave versionada: si el esquema del store cambia, se sube el número y
      // las sesiones viejas se descartan solas en vez de romper la app.
      name: 'match-literario-v3',
      storage: createJSONStorage(() => localStorage),
      /**
       * El catálogo y el estado efímero de la UI quedan fuera a propósito: los
       * autores se releen siempre y las hojas modales no deben reabrirse solas
       * al volver a la app.
       */
      partialize: (estado) => ({
        sessionId: estado.sessionId,
        iniciadoEn: estado.iniciadoEn,
        seleccion: estado.seleccion,
        extra: estado.extra,
        feedback: estado.feedback,
        resultados: estado.resultados,
        tieneMatch: estado.tieneMatch,
        matchEnviado: estado.matchEnviado,
        agenda: estado.agenda,
        agendaSucia: estado.agendaSucia,
        autoresClickeados: estado.autoresClickeados,
      }),
    },
  ),
);

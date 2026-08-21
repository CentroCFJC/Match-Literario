/**
 * Modelo de datos de Match Literario.
 *
 * Cada interfaz refleja UNA pestaña real de los dos spreadsheets. Los nombres de
 * columna de los comentarios están tomados de los archivos de `sheets/`, no
 * inventados: son los encabezados literales que hay hoy en Drive.
 *
 *   Spreadsheet A — "Base Autores"      (la app SOLO lee)
 *     · Autores       encabezados en la fila 3, datos desde la fila 4
 *     · Actividades   encabezados en la fila 2, datos desde la fila 3
 *     · Vocabulario   la app no la lee; alimenta los desplegables de la hoja
 *
 *   Spreadsheet B — "Respuestas Match"  (la app SOLO escribe)
 *     · Respuestas    encabezados en la fila 2, descripciones en la 3, datos desde la 4
 *     · Feedback      misma forma
 *
 * Las dos primeras filas de `Autores` y la primera de las demás son bloques de
 * instrucciones para la curaduría, no datos. Ver `FILA_ENCABEZADOS` en
 * `source.ts`.
 */

import type {
  ComoSeEntero,
  DondeLibros,
  Edad,
  Estilo,
  FechaISO,
  Franja,
  Genero,
  GeneroAutor,
  Mood,
  OrigenAutor,
  OrigenVisitante,
  Publico,
  Tematica,
  TipoActividad,
  Voz,
  VozWizard,
} from '@/lib/vocabulario';

// ===========================================================================
// Spreadsheet A · Pestaña `Autores`
// ===========================================================================

/**
 * Un autor o autora invitado a la feria.
 *
 * Encabezados de la fila 3, en su orden real:
 *
 *   id | nombre_completo | nombre_visible | genero_autor | pais | origen |
 *   bio_corta | bio_larga | foto_url | libro_destacado | web_o_red |
 *   generos | tematicas | mood | publico | estilo | voces | activo
 */
export interface Autor {
  /** columna `id` — "AUT001…". No son contiguos: la curaduría borra filas. */
  id: string;
  /** columna `nombre_completo` — nombre real. No se muestra; sirve al panel. */
  nombreCompleto: string;
  /** columna `nombre_visible` — lo que se muestra en la card y el modal. */
  nombreVisible: string;
  /** columna `genero_autor` — F/M/No binario/Colectivo. Solo diversifica el ranking. */
  generoAutor: GeneroAutor | null;
  /** columna `pais` — texto libre, ej. "Chile". */
  pais: string;
  /** columna `origen` — Local/Caldas/Nacional/Latinoamérica/Internacional. */
  origen: OrigenAutor | null;
  /** columna `bio_corta` — ≤ 280 según la hoja; se muestra en la card. */
  bioCorta: string;
  /** columna `bio_larga` — se muestra en el modal. Si va vacía se usa `bioCorta`. */
  bioLarga: string;
  /**
   * columna `foto_url` — ya normalizada a una URL de imagen directa.
   * `null` si la celda está vacía o apunta a algo que no es una imagen (en la
   * hoja hay enlaces a Google Docs); en ese caso la UI cae al avatar de
   * iniciales. Ver `normalizarFotoUrl` en `source.ts`.
   */
  fotoUrl: string | null;
  /** columna `libro_destacado` — opcional, se muestra en el modal. */
  libroDestacado: string;
  /** columna `web_o_red` — opcional, se muestra como enlace en el modal. */
  webORed: string;

  // --- Columnas multivaluadas (separadas por ", " por el Apps Script) ------

  /** columna `generos` — vocabulario: GENEROS. */
  generos: Genero[];
  /** columna `tematicas` — vocabulario: TEMATICAS. */
  tematicas: Tematica[];
  /** columna `mood` — vocabulario: MOOD. */
  mood: Mood[];
  /** columna `publico` — vocabulario: PUBLICO (Infantil/Juvenil/Adulto joven/Adulto). */
  publico: Publico[];
  /** columna `estilo` — en la hoja es un desplegable de UN valor. */
  estilo: Estilo | null;
  /**
   * columna `voces` — vocabulario: VOCES.
   * Al leer se le añade la voz que implica `origen` (ver `ORIGEN_A_VOZ`), para
   * que el origen pese en el match aunque la curaduría no lo repita a mano.
   */
  voces: Voz[];

  /** columna `activo` — TRUE/FALSE. Los `false` no se muestran (cancelaciones). */
  activo: boolean;
}

// ===========================================================================
// Spreadsheet A · Pestaña `Actividades`
// ===========================================================================

/**
 * Una actividad de la programación.
 *
 * Encabezados de la fila 2, en su orden real:
 *
 *   actividad_id | autor_ids | titulo | tipo | fecha | hora_inicio |
 *   hora_fin | lugar | descripcion | activo
 */
export interface Actividad {
  /** columna `actividad_id` — "ACT001…". */
  id: string;
  /**
   * columna `autor_ids` — lista separada por comas: una actividad puede tener
   * VARIOS autores (ej. "AUT004, AUT011").
   */
  autorIds: string[];
  /** columna `titulo`. */
  titulo: string;
  /** columna `tipo` — vocabulario: TIPOS_ACTIVIDAD. */
  tipo: TipoActividad | null;
  /** columna `fecha` — `YYYY-MM-DD`. De aquí se derivan los días del evento. */
  fecha: FechaISO;
  /** columna `hora_inicio` — `HH:MM` 24h; aquí, minutos desde medianoche. */
  inicioMin: number;
  /** columna `hora_fin` — ídem. Si la celda va vacía se asume `inicioMin + 60`. */
  finMin: number;
  /** columna `lugar` — sala o escenario. */
  lugar: string;
  /** columna `descripcion` — opcional. */
  descripcion: string;
  /** columna `activo` — TRUE/FALSE. */
  activo: boolean;
}

/**
 * Actividad ya resuelta para la UI: con los nombres de sus autores, la hora
 * legible y su franja.
 */
export interface ActividadConAutores extends Actividad {
  /** Nombres visibles de todos sus autores, en el orden de `autorIds`. */
  autoresNombres: string[];
  /** "4:00 pm" — derivado de `inicioMin`. */
  horaTexto: string;
  /** "31 ago" — derivado de `fecha`. */
  diaTexto: string;
  /** Franja derivada de `inicioMin`. */
  franja: Franja;
}

// ===========================================================================
// Spreadsheet B · Pestaña `Respuestas`
// ===========================================================================

/** Columna `dispositivo`, derivada del user agent en el servidor. */
export type Dispositivo = 'movil' | 'tablet' | 'escritorio';

/** Columna `feedback_util`: 1 = 👍, 0 = 👎, `null` = no respondió. */
export type FeedbackUtil = 1 | 0 | null;

/**
 * Una fila de `Respuestas`: una sesión.
 *
 * Encabezados de la fila 2, en su orden real (28 columnas, A..AB):
 *
 *   timestamp | session_id | dispositivo | edad | generos_sel | tematicas_sel |
 *   mood_sel | estilo_sel | voces_sel | actividades_interes_sel |
 *   dias_asistencia_sel | franjas_sel | origen_visitante |
 *   donde_consigue_libros | como_se_entero | match_top_ids |
 *   autores_click_ids | autores_ruta_ids | n_autores_ruta |
 *   conflictos_detectados | feedback_util | feedback_texto | autor_faltante |
 *   tema_faltante | tiempo_total_seg | paso_abandono | completado | version_app
 *
 * OJO: este orden NO es el del prompt maestro §7.4 (allí `origen_visitante` va
 * cuarto). Manda la hoja real.
 *
 * Las listas se serializan uniendo con `; `, como pide el encabezado de la hoja.
 */
export interface Respuesta {
  /** columna `timestamp` — ISO 8601 en **UTC** (la hoja lo especifica así). */
  timestamp: string;
  /** columna `session_id` — UUID anónimo generado en el cliente. */
  sessionId: string;
  /** columna `dispositivo` — derivada del user agent en el servidor. */
  dispositivo: Dispositivo;

  // --- Wizard --------------------------------------------------------------
  /** columna `edad` — paso 6. Se guarda el rango, no el público derivado. */
  edad: Edad | null;
  /** columna `generos_sel` — paso 2. */
  generosSel: Genero[];
  /** columna `tematicas_sel` — paso 3. */
  tematicasSel: Tematica[];
  /** columna `mood_sel` — paso 1. */
  moodSel: Mood[];
  /** columna `estilo_sel` — paso 4. */
  estiloSel: Estilo | null;
  /** columna `voces_sel` — paso 5. Puede contener el comodín del wizard. */
  vocesSel: VozWizard[];
  /** columna `actividades_interes_sel` — paso 7. */
  actividadesInteresSel: TipoActividad[];
  /**
   * columna `dias_asistencia_sel` — paso 8. Se guardan las fechas en
   * `YYYY-MM-DD`, no la etiqueta "31 ago": el panel las agrega por fecha.
   */
  diasAsistenciaSel: FechaISO[];
  /** columna `franjas_sel` — paso 8. */
  franjasSel: Franja[];

  // --- Preguntas post-resultado (opcionales) -------------------------------
  /** columna `origen_visitante`. */
  origenVisitante: OrigenVisitante | null;
  /** columna `donde_consigue_libros`. */
  dondeConsigueLibros: DondeLibros[];
  /** columna `como_se_entero`. */
  comoSeEntero: ComoSeEntero[];

  // --- Telemetría implícita (§7.5) ----------------------------------------
  /** columna `match_top_ids` — ids de los autores que se le mostraron, en orden. */
  matchTopIds: string[];
  /** columna `autores_click_ids` — ids de los autores cuyo perfil abrió. */
  autoresClickIds: string[];
  /** columna `autores_ruta_ids` — ids de los autores que añadió a su ruta. */
  autoresRutaIds: string[];
  /** columna `n_autores_ruta` — cuántas actividades tiene en la ruta. */
  nAutoresRuta: number;
  /** columna `conflictos_detectados` — cuántos cruces de horario tenía su ruta. */
  conflictosDetectados: number;
  /** columna `tiempo_total_seg` — segundos desde que inició el wizard. */
  tiempoTotalSeg: number;
  /** columna `paso_abandono` — paso en el que se fue, o vacío si terminó. */
  pasoAbandono: number | null;
  /** columna `completado` — TRUE si llegó a ver su match. */
  completado: boolean;
  /** columna `version_app` — de `NEXT_PUBLIC_APP_VERSION`. */
  versionApp: string;

  // --- Feedback (se duplica en la pestaña `Feedback`) ---------------------
  /** columna `feedback_util` — 1 = 👍, 0 = 👎, vacío = no respondió. */
  feedbackUtil: FeedbackUtil;
  /** columna `feedback_texto` — texto libre. */
  feedbackTexto: string;
  /** columna `autor_faltante` — "¿Qué autor/a te hubiera gustado ver?". */
  autorFaltante: string;
  /** columna `tema_faltante` — temáticas que siente que faltan. */
  temaFaltante: Tematica[];
}

// ===========================================================================
// Spreadsheet B · Pestaña `Feedback`
// ===========================================================================

/**
 * Una fila de `Feedback`: el detalle de las respuestas abiertas, separado para
 * que la curaduría pueda leerlas sin abrir las 28 columnas de `Respuestas`.
 *
 * Encabezados de la fila 2:
 *
 *   timestamp | session_id | feedback_util | feedback_texto |
 *   autor_faltante | tema_faltante
 *
 * Solo se escribe si la persona respondió algo; si lo salta todo, no se crea
 * la fila.
 */
export interface FilaFeedback {
  timestamp: string;
  sessionId: string;
  feedbackUtil: FeedbackUtil;
  feedbackTexto: string;
  autorFaltante: string;
  temaFaltante: Tematica[];
}

// ===========================================================================
// Lo que viaja del cliente al servidor
// ===========================================================================

/**
 * Cuerpo de `POST /api/respuestas`.
 *
 * El cliente NO manda `timestamp`, `dispositivo` ni `version_app`: los pone el
 * servidor, que es lo que la hoja marca como "(auto)".
 */
export type RespuestaEntrante = Omit<Respuesta, 'timestamp' | 'dispositivo' | 'versionApp'>;

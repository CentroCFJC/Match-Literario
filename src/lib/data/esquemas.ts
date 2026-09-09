/**
 * Validación del cuerpo de `POST /api/respuestas`.
 *
 * Valida FORMA y VOCABULARIO: cada lista solo admite etiquetas que existan en
 * `src/lib/vocabulario.ts`, y se respetan los máximos de cada paso del wizard.
 * Una respuesta que llegue a `saveRespuesta` no puede ensuciar la hoja con
 * valores que el panel de la fase 3 no sepa agregar.
 *
 * El servidor NO acepta `timestamp`, `dispositivo` ni `version_app`: esas tres
 * columnas las marca la hoja como "(auto)" y las pone `source.ts`.
 */

import { z } from 'zod';

import {
  COMO_SE_ENTERO,
  DONDE_LIBROS,
  EDADES,
  ESTILO_LABELS,
  FRANJAS,
  GENEROS,
  MOOD,
  ORIGENES_VISITANTE,
  TEMATICAS,
  TIPOS_ACTIVIDAD,
  VISITA_PREVIA,
  VOCES_WIZARD,
} from '@/lib/vocabulario';

/** Enum de zod a partir de una lista del vocabulario. */
const deVocabulario = (valores: readonly string[]) =>
  z.enum(valores as unknown as [string, ...string[]]);

/** Lista sin repetidos y con tope, igual que el máximo del paso en la UI. */
const lista = <T extends z.ZodTypeAny>(elemento: T, max: number) =>
  z
    .array(elemento)
    .max(max)
    .refine((valores) => new Set(valores).size === valores.length, {
      message: 'No se admiten valores repetidos',
    });

/** Ids de autor y actividad: los genera la hoja, así que solo acotamos la forma. */
const zId = z.string().regex(/^[A-Za-z0-9_-]{1,32}$/, 'Id con formato inesperado');

/** Fecha `YYYY-MM-DD`. Los días salen de la programación, no de un enum fijo. */
const zFecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Se esperaba una fecha YYYY-MM-DD');

export const esquemaRespuesta = z.object({
  /** Columna `session_id`: UUID anónimo generado en el cliente. */
  sessionId: z.string().uuid(),

  // --- Wizard --------------------------------------------------------------
  edad: deVocabulario(EDADES).nullable(),
  generosSel: lista(deVocabulario(GENEROS), 5),
  tematicasSel: lista(deVocabulario(TEMATICAS), 5),
  moodSel: lista(deVocabulario(MOOD), 3),
  estiloSel: deVocabulario(ESTILO_LABELS).nullable(),
  vocesSel: lista(deVocabulario(VOCES_WIZARD), 3),
  actividadesInteresSel: lista(deVocabulario(TIPOS_ACTIVIDAD), 4),
  diasAsistenciaSel: lista(zFecha, 31),
  franjasSel: lista(deVocabulario(FRANJAS), FRANJAS.length),

  // --- Preguntas post-resultado (opcionales) -------------------------------
  origenVisitante: deVocabulario(ORIGENES_VISITANTE).nullable().default(null),
  dondeConsigueLibros: lista(deVocabulario(DONDE_LIBROS), DONDE_LIBROS.length).default([]),
  comoSeEntero: lista(deVocabulario(COMO_SE_ENTERO), COMO_SE_ENTERO.length).default([]),
  visitaPrevia: deVocabulario(VISITA_PREVIA).nullable().default(null),

  // --- Telemetría implícita ------------------------------------------------
  matchTopIds: z.array(zId).max(50).default([]),
  autoresClickIds: z.array(zId).max(300).default([]),
  autoresRutaIds: z.array(zId).max(300).default([]),
  nAutoresRuta: z.number().int().min(0).max(500).default(0),
  conflictosDetectados: z.number().int().min(0).max(500).default(0),
  /** Tope de 24 h: más que eso es una pestaña olvidada abierta, no una sesión. */
  tiempoTotalSeg: z.number().int().min(0).max(86_400).default(0),
  /** Paso 1-8 donde se fue, o `null` si terminó. */
  pasoAbandono: z.number().int().min(1).max(8).nullable().default(null),
  completado: z.boolean().default(false),

  // --- Feedback ------------------------------------------------------------
  /** 1 = 👍, 0 = 👎, `null` = no respondió. */
  feedbackUtil: z.union([z.literal(0), z.literal(1)]).nullable().default(null),
  autorFaltante: z.string().max(200).default(''),
  temaFaltante: lista(deVocabulario(TEMATICAS), TEMATICAS.length).default([]),
});

export type CuerpoRespuesta = z.infer<typeof esquemaRespuesta>;

/**
 * Tipos del motor de match.
 *
 * El motor NO conoce `Autor` ni `Actividad` de Google Sheets: trabaja sobre
 * `PerfilAutor` y `PerfilLector`, que son proyecciones puras. El adaptador que
 * traduce de uno a otro está en `adaptador.ts`. Esa separación es lo que hace
 * que el resultado sea idéntico con datos mock o con la hoja real.
 */

import type {
  Edad,
  Estilo,
  FechaISO,
  Franja,
  Genero,
  GeneroAutor,
  Mood,
  Publico,
  Tematica,
  TipoActividad,
  VozWizard,
} from '@/lib/vocabulario';
import type { CategoriaMatch } from './config';

/** Lo que el motor necesita saber de quien responde el wizard. */
export interface PerfilLector {
  mood: Mood[];
  generos: Genero[];
  tematicas: Tematica[];
  estilo: Estilo | null;
  /** Puede incluir el comodín "Me da igual, sorpréndeme". */
  voces: VozWizard[];
  /** Rango de edad del paso 6; el motor lo traduce a público con `EDAD_A_PUBLICO`. */
  edad: Edad | null;
  actividades: TipoActividad[];
  /** Fechas `YYYY-MM-DD` elegidas en el paso 8. */
  dias: FechaISO[];
  franjas: Franja[];
}

/** Lo que el motor necesita saber de un autor. */
export interface PerfilAutor {
  id: string;
  mood: Mood[];
  generos: Genero[];
  tematicas: Tematica[];
  estilo: Estilo | null;
  voces: string[];
  /** Columna `publico` de la hoja: Infantil/Juvenil/Adulto joven/Adulto. */
  publico: Publico[];
  /** Tipos de las actividades en las que participa. */
  tiposActividad: TipoActividad[];
  /**
   * Columna `genero_autor`. NO entra en el puntaje de afinidad: solo se usa
   * para diversificar el ranking (§6.3 del prompt maestro).
   */
  generoAutor: GeneroAutor | null;
  /**
   * Género literario dominante: el primero de su columna `generos`, que es el
   * orden en que lo escribió la curaduría. También solo para diversificar.
   */
  generoDominante: Genero | null;
  /** Fecha + franja de cada actividad suya; alimenta el bonus de disponibilidad. */
  franjasDisponibles: Array<{ fecha: FechaISO; franja: Franja }>;
}

/** Desglose por categoría, para poder explicar y depurar el puntaje. */
export type DesglosePuntaje = Record<
  CategoriaMatch,
  {
    /** Similitud coseno (o afinidad) en esa categoría, 0-1. */
    similitud: number;
    /** Peso efectivo tras descartar categorías sin respuesta y renormalizar. */
    pesoEfectivo: number;
    /** Aporte al puntaje crudo: `similitud * pesoEfectivo`. */
    aporte: number;
    /** `true` si la categoría se descartó (sin respuesta o comodín). */
    omitida: boolean;
  }
>;

/** Resultado del match para un autor. */
export interface ResultadoMatch {
  autorId: string;
  /** Puntaje crudo tras pesos y bonus de disponibilidad. 0-1. */
  crudo: number;
  /** Porcentaje calibrado que se muestra en pantalla. Entero. */
  porcentaje: number;
  /** Posición final, ya diversificada por MMR. 0 = el match principal. */
  posicion: number;
  /** Etiquetas del vocabulario en las que autor y lector coinciden ("Coinciden en"). */
  coincidencias: string[];
  /**
   * `true` si entró como comodín de serendipia (§6.4) y no por afinidad.
   * No se marca en la UI —"También te puede interesar" ya lo enmarca— pero el
   * panel de la fase 3 puede medir si esos descubrimientos se clican y se añaden.
   */
  esSerendipia: boolean;
  desglose: DesglosePuntaje;
}

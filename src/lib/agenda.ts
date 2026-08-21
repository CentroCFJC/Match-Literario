/**
 * Lógica de la agenda / ruta por la feria: resolución de actividades, detección
 * de cruces de horario y armado del texto para compartir.
 *
 * Es lógica pura (sin React), igual que el motor de match, para poder probarla
 * sola y para que la fase 2 no tenga que entenderla.
 */

import type { Actividad, ActividadConAutores, Autor } from '@/lib/data/types';
import {
  DIAS_POR_DEFECTO,
  etiquetaDia,
  franjaDeMinutos,
  minutosAHora,
} from '@/lib/vocabulario';
import type { FechaISO } from '@/lib/vocabulario';

/** Actividad de la agenda, con la marca de si se cruza con otra ya añadida. */
export interface ItemAgenda extends ActividadConAutores {
  /** `true` si su horario se solapa con el de otra actividad de la agenda. */
  conflicto: boolean;
  /** Ids de las actividades con las que se cruza. */
  chocaCon: string[];
}

/** Un día de la agenda con sus actividades ya ordenadas por hora. */
export interface DiaAgenda {
  fecha: FechaISO;
  /** "31 ago", para la UI. */
  etiqueta: string;
  items: ItemAgenda[];
}

/**
 * Días del evento, derivados de la programación real (prompt maestro §3.1:
 * "de aquí se derivan los días del evento").
 *
 * Si la curaduría todavía no ha puesto fechas, cae a los siete días de la feria
 * para que el paso 8 no salga vacío.
 */
export function diasDelEvento(actividades: readonly Actividad[]): FechaISO[] {
  const fechas = [...new Set(actividades.map((actividad) => actividad.fecha))].sort();
  return fechas.length > 0 ? fechas : DIAS_POR_DEFECTO;
}

/** Resuelve una actividad con los nombres de sus autores y su hora legible. */
export function resolverActividad(
  actividad: Actividad,
  autoresPorId: ReadonlyMap<string, Autor>,
): ActividadConAutores {
  return {
    ...actividad,
    autoresNombres: actividad.autorIds
      .map((autorId) => autoresPorId.get(autorId)?.nombreVisible)
      .filter((nombre): nombre is string => Boolean(nombre)),
    horaTexto: minutosAHora(actividad.inicioMin),
    diaTexto: etiquetaDia(actividad.fecha),
    franja: franjaDeMinutos(actividad.inicioMin),
  };
}

/** ¿Se solapan dos actividades? Mismo día y rangos horarios que se cruzan. */
export function seCruzan(a: Actividad, b: Actividad): boolean {
  if (a.id === b.id) return false;
  if (a.fecha !== b.fecha) return false;
  return a.inicioMin < b.finMin && b.inicioMin < a.finMin;
}

/**
 * Arma la agenda: resuelve los ids seleccionados, marca los cruces de horario y
 * agrupa por día en orden cronológico.
 */
export function construirAgenda(
  idsSeleccionados: readonly string[],
  actividades: readonly Actividad[],
  autores: readonly Autor[],
): DiaAgenda[] {
  const autoresPorId = new Map(autores.map((autor) => [autor.id, autor]));
  const seleccionadas = actividades.filter((actividad) => idsSeleccionados.includes(actividad.id));

  const items: ItemAgenda[] = seleccionadas.map((actividad) => ({
    ...resolverActividad(actividad, autoresPorId),
    conflicto: false,
    chocaCon: [],
  }));

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      if (seCruzan(items[i], items[j])) {
        items[i].conflicto = true;
        items[j].conflicto = true;
        items[i].chocaCon.push(items[j].id);
        items[j].chocaCon.push(items[i].id);
      }
    }
  }

  // Las fechas ISO se ordenan bien como texto, sin construir `Date`.
  const fechas = [...new Set(items.map((item) => item.fecha))].sort();

  return fechas.map((fecha) => ({
    fecha,
    etiqueta: etiquetaDia(fecha),
    items: items
      .filter((item) => item.fecha === fecha)
      .sort((a, b) => a.inicioMin - b.inicioMin || a.titulo.localeCompare(b.titulo)),
  }));
}

/** ¿Hay al menos un cruce de horario en la agenda? */
export function tieneConflictos(agenda: readonly DiaAgenda[]): boolean {
  return agenda.some((dia) => dia.items.some((item) => item.conflicto));
}

/**
 * Cuántos pares de actividades se cruzan. Es lo que se guarda en la columna
 * `conflictos_detectados` de `Respuestas`.
 */
export function contarConflictos(agenda: readonly DiaAgenda[]): number {
  let cruces = 0;
  for (const dia of agenda) {
    for (const item of dia.items) cruces += item.chocaCon.length;
  }
  // Cada cruce se ha contado dos veces, una por cada lado.
  return cruces / 2;
}

/** Número total de actividades en la agenda. */
export function contarItems(agenda: readonly DiaAgenda[]): number {
  return agenda.reduce((total, dia) => total + dia.items.length, 0);
}

/** Ids de los autores que tienen alguna actividad en la agenda. */
export function autoresEnAgenda(agenda: readonly DiaAgenda[]): string[] {
  const ids = new Set<string>();
  for (const dia of agenda) {
    for (const item of dia.items) {
      for (const autorId of item.autorIds) ids.add(autorId);
    }
  }
  return [...ids];
}

// ===========================================================================
// Compartir
// ===========================================================================

const TITULO_COMPARTIR = 'Mi agenda en la 17 Feria del Libro de Manizales';

/** Texto plano de la agenda, listo para WhatsApp o correo. */
export function textoAgenda(agenda: readonly DiaAgenda[]): string {
  const lineas: string[] = [`${TITULO_COMPARTIR}:`, ''];
  for (const dia of agenda) {
    lineas.push(dia.etiqueta.toUpperCase());
    for (const item of dia.items) {
      const autores = item.autoresNombres.join(', ');
      lineas.push(
        `· ${item.horaTexto} — ${item.titulo}${autores ? ` (${autores})` : ''} · ${item.lugar}`,
      );
    }
    lineas.push('');
  }
  return lineas.join('\n').trimEnd();
}

/** Enlace `wa.me` con la agenda como mensaje. */
export function enlaceWhatsApp(agenda: readonly DiaAgenda[]): string {
  return `https://wa.me/?text=${encodeURIComponent(textoAgenda(agenda))}`;
}

/** Enlace `mailto:` con la agenda como cuerpo. */
export function enlaceCorreo(agenda: readonly DiaAgenda[]): string {
  const asunto = encodeURIComponent(TITULO_COMPARTIR);
  const cuerpo = encodeURIComponent(textoAgenda(agenda));
  return `mailto:?subject=${asunto}&body=${cuerpo}`;
}

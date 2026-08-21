/**
 * Motor de match — lógica de negocio pura.
 *
 * Sin React, sin fetch, sin Google Sheets, sin `Date.now()`: dadas las mismas
 * entradas devuelve siempre la misma salida. Eso es lo que permite que la
 * fase 2 cambie la fuente de datos sin tocar una línea de aquí.
 *
 * El pipeline es:
 *
 *   1. Vectorizar lector y autor por categoría (vectores binarios one-hot).
 *   2. Similitud coseno por categoría (afinidad tabulada en estilo y público).
 *   3. Combinar con los PESOS de §6.1, renormalizando si alguna se omite.
 *   4. Aplicar el bonus de disponibilidad (días/franjas del paso 8).
 *   5. Calibrar el crudo a un porcentaje legible (§6.2).
 *   6. Diversificar el orden con MMR (§6.3).
 */

import { EDAD_A_PUBLICO, PUBLICO, VOCES_WILDCARD } from '@/lib/vocabulario';
import type { Edad, Estilo, Publico } from '@/lib/vocabulario';
import { barajar, generadorAleatorio, semillaDesdeTexto } from './aleatorio';
import {
  AFINIDAD_ESTILO,
  AFINIDAD_PUBLICO_POR_DISTANCIA,
  BONUS_DISPONIBILIDAD_MAX,
  CALIBRACION,
  CATEGORIAS_MATCH,
  COMODINES_SERENDIPIA,
  MAX_TAGS_SERENDIPIA,
  MMR_LAMBDA,
  PESOS,
  PRIMER_PUESTO_SIN_MMR,
  SIMILITUD_AUTORES,
  TOTAL_RESULTADOS,
} from './config';
import type { CategoriaMatch } from './config';
import type { DesglosePuntaje, PerfilAutor, PerfilLector, ResultadoMatch } from './types';

// ===========================================================================
// 1-2. Similitud
// ===========================================================================

/**
 * Coseno entre dos vectores binarios representados como conjuntos de etiquetas.
 *
 * Para vectores binarios el coseno se reduce a
 *   |A ∩ B| / (√|A| · √|B|)
 * lo que evita construir el vector completo del vocabulario.
 */
export function cosenoBinario(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const conjuntoB = new Set(b);
  let interseccion = 0;
  const vistos = new Set<string>();
  for (const etiqueta of a) {
    if (vistos.has(etiqueta)) continue;
    vistos.add(etiqueta);
    if (conjuntoB.has(etiqueta)) interseccion += 1;
  }
  const normaA = Math.sqrt(vistos.size);
  const normaB = Math.sqrt(conjuntoB.size);
  return interseccion / (normaA * normaB);
}

/** Afinidad entre el estilo pedido y el del autor (tabla `AFINIDAD_ESTILO`). */
export function afinidadEstilo(lector: Estilo | null, autor: Estilo | null): number {
  if (!lector || !autor) return 0;
  return AFINIDAD_ESTILO[lector]?.[autor] ?? 0;
}

/**
 * Afinidad de público: distancia mínima, en posiciones del vocabulario
 * `PUBLICO`, entre el público que le corresponde a la persona por su edad y los
 * públicos a los que apunta el autor.
 */
export function afinidadPublico(lector: Edad | null, publicoAutor: readonly Publico[]): number {
  if (!lector || publicoAutor.length === 0) return 0;
  const publicoLector = EDAD_A_PUBLICO[lector];
  const indiceLector = PUBLICO.indexOf(publicoLector);
  if (indiceLector < 0) return 0;

  let distanciaMinima = Number.POSITIVE_INFINITY;
  for (const publico of publicoAutor) {
    const indice = PUBLICO.indexOf(publico);
    if (indice < 0) continue;
    distanciaMinima = Math.min(distanciaMinima, Math.abs(indice - indiceLector));
  }
  if (!Number.isFinite(distanciaMinima)) return 0;

  const ultima = AFINIDAD_PUBLICO_POR_DISTANCIA[AFINIDAD_PUBLICO_POR_DISTANCIA.length - 1];
  return AFINIDAD_PUBLICO_POR_DISTANCIA[distanciaMinima] ?? ultima;
}

/**
 * ¿Se omite esta categoría para este lector?
 *
 * Se omite cuando la persona no respondió, o cuando marcó el comodín
 * "Me da igual, sorpréndeme" en la pregunta de voces. Su peso se reparte entre
 * las demás categorías, de modo que no responder no penaliza a nadie.
 */
function categoriaOmitida(categoria: CategoriaMatch, lector: PerfilLector): boolean {
  switch (categoria) {
    case 'mood':
      return lector.mood.length === 0;
    case 'generos':
      return lector.generos.length === 0;
    case 'tematicas':
      return lector.tematicas.length === 0;
    case 'estilo':
      return lector.estilo === null;
    case 'voces':
      return lector.voces.length === 0 || lector.voces.includes(VOCES_WILDCARD);
    case 'actividades':
      return lector.actividades.length === 0;
    case 'publico':
      return lector.edad === null;
  }
}

/** Similitud cruda de una categoría, antes de aplicar el peso. */
function similitudCategoria(
  categoria: CategoriaMatch,
  lector: PerfilLector,
  autor: PerfilAutor,
): number {
  switch (categoria) {
    case 'mood':
      return cosenoBinario(lector.mood, autor.mood);
    case 'generos':
      return cosenoBinario(lector.generos, autor.generos);
    case 'tematicas':
      return cosenoBinario(lector.tematicas, autor.tematicas);
    case 'estilo':
      return afinidadEstilo(lector.estilo, autor.estilo);
    case 'voces':
      return cosenoBinario(lector.voces, autor.voces);
    case 'actividades':
      return cosenoBinario(lector.actividades, autor.tiposActividad);
    case 'publico':
      return afinidadPublico(lector.edad, autor.publico);
  }
}

// ===========================================================================
// 3-4. Puntaje crudo
// ===========================================================================

/**
 * Cobertura de disponibilidad: qué fracción de las actividades del autor cae en
 * los días y franjas que la persona eligió en el paso 8.
 *
 * Si solo eligió días, se ignoran las franjas, y viceversa. Si no eligió nada,
 * devuelve 0 (sin bonus para nadie, que es neutral).
 */
export function coberturaDisponibilidad(lector: PerfilLector, autor: PerfilAutor): number {
  const pideDias = lector.dias.length > 0;
  const pideFranjas = lector.franjas.length > 0;
  if (!pideDias && !pideFranjas) return 0;
  if (autor.franjasDisponibles.length === 0) return 0;

  const dias = new Set<string>(lector.dias);
  const franjas = new Set<string>(lector.franjas);
  const compatibles = autor.franjasDisponibles.filter(
    (slot) => (!pideDias || dias.has(slot.fecha)) && (!pideFranjas || franjas.has(slot.franja)),
  );
  return compatibles.length / autor.franjasDisponibles.length;
}

/** Calcula el desglose por categoría con los pesos ya renormalizados. */
export function calcularDesglose(lector: PerfilLector, autor: PerfilAutor): DesglosePuntaje {
  const omitidas = new Map<CategoriaMatch, boolean>(
    CATEGORIAS_MATCH.map((categoria) => [categoria, categoriaOmitida(categoria, lector)]),
  );

  const pesoVivo = CATEGORIAS_MATCH.reduce(
    (suma, categoria) => (omitidas.get(categoria) ? suma : suma + PESOS[categoria]),
    0,
  );

  const desglose = {} as DesglosePuntaje;
  for (const categoria of CATEGORIAS_MATCH) {
    const omitida = omitidas.get(categoria) ?? false;
    // Si TODAS las categorías se omitieron (nadie respondió nada), pesoVivo es 0
    // y renormalizar dividiría por cero: en ese caso todo queda en 0.
    const pesoEfectivo = omitida || pesoVivo === 0 ? 0 : PESOS[categoria] / pesoVivo;
    const similitud = omitida ? 0 : similitudCategoria(categoria, lector, autor);
    desglose[categoria] = {
      similitud,
      pesoEfectivo,
      aporte: similitud * pesoEfectivo,
      omitida,
    };
  }
  return desglose;
}

/** Puntaje crudo final en [0,1]: pesos + bonus de disponibilidad. */
export function puntajeCrudo(
  lector: PerfilLector,
  autor: PerfilAutor,
  desglose: DesglosePuntaje,
): number {
  const base = CATEGORIAS_MATCH.reduce((suma, categoria) => suma + desglose[categoria].aporte, 0);
  const conDisponibilidad =
    base * (1 + BONUS_DISPONIBILIDAD_MAX * coberturaDisponibilidad(lector, autor));
  return Math.min(1, conDisponibilidad);
}

// ===========================================================================
// 5. Calibración
// ===========================================================================

/**
 * Curva de calibración: crudo (0-1) → porcentaje entero que se muestra.
 * Ver el porqué de la forma en `config.ts` → `CALIBRACION`.
 */
export function calibrar(crudo: number): number {
  const { PCT_MIN, PCT_MAX, GAMMA } = CALIBRACION;
  const acotado = Math.min(1, Math.max(0, crudo));
  return Math.round(PCT_MIN + (PCT_MAX - PCT_MIN) * Math.pow(acotado, GAMMA));
}

// ===========================================================================
// 6. Diversificación MMR
// ===========================================================================

/** Etiquetas temáticas de un autor, para el término de parecido temático. */
function huella(autor: PerfilAutor): string[] {
  return [
    ...autor.generos.map((g) => `g:${g}`),
    ...autor.tematicas.map((t) => `t:${t}`),
    ...autor.mood.map((m) => `m:${m}`),
    ...autor.voces.map((v) => `v:${v}`),
  ];
}

/**
 * Similitud entre dos autores, para la penalización de MMR (§6.3): comparten
 * `genero_autor`, comparten género literario dominante, y cuánto se parecen sus
 * tags. Los pesos están en `SIMILITUD_AUTORES`.
 */
export function similitudEntreAutores(a: PerfilAutor, b: PerfilAutor): number {
  const mismoGeneroAutor =
    a.generoAutor !== null && a.generoAutor === b.generoAutor ? 1 : 0;
  const mismoGeneroDominante =
    a.generoDominante !== null && a.generoDominante === b.generoDominante ? 1 : 0;
  return (
    SIMILITUD_AUTORES.generoAutor * mismoGeneroAutor +
    SIMILITUD_AUTORES.generoDominante * mismoGeneroDominante +
    SIMILITUD_AUTORES.tags * cosenoBinario(huella(a), huella(b))
  );
}

/**
 * Selección por Maximal Marginal Relevance.
 *
 * En cada paso elige el candidato que maximiza
 *   λ · relevancia − (1 − λ) · máx. similitud con lo ya elegido.
 */
export function seleccionarConMMR(
  candidatos: Array<{ autor: PerfilAutor; relevancia: number }>,
  cuantos: number,
  lambda: number = MMR_LAMBDA,
): PerfilAutor[] {
  const restantes = [...candidatos].sort((a, b) => b.relevancia - a.relevancia);
  const elegidos: Array<{ autor: PerfilAutor; relevancia: number }> = [];

  while (elegidos.length < cuantos && restantes.length > 0) {
    let mejorIndice = 0;

    if (elegidos.length > 0 || !PRIMER_PUESTO_SIN_MMR) {
      let mejorPuntaje = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < restantes.length; i += 1) {
        const candidato = restantes[i];
        const similitudMaxima =
          elegidos.length === 0
            ? 0
            : Math.max(
                ...elegidos.map((elegido) => similitudEntreAutores(candidato.autor, elegido.autor)),
              );
        const puntaje = lambda * candidato.relevancia - (1 - lambda) * similitudMaxima;
        if (puntaje > mejorPuntaje) {
          mejorPuntaje = puntaje;
          mejorIndice = i;
        }
      }
    }

    elegidos.push(restantes[mejorIndice]);
    restantes.splice(mejorIndice, 1);
  }

  return elegidos.map((e) => e.autor);
}

// ===========================================================================
// Coincidencias ("Coinciden en", §6.5)
// ===========================================================================

/**
 * Etiquetas concretas que lector y autor comparten, en orden de relevancia
 * narrativa: primero temáticas, luego géneros, voces y mood.
 */
export function coincidencias(lector: PerfilLector, autor: PerfilAutor): string[] {
  const encomun = (a: readonly string[], b: readonly string[]) => {
    const conjunto = new Set(b);
    return a.filter((x) => conjunto.has(x));
  };
  const salida = [
    ...encomun(lector.tematicas, autor.tematicas),
    ...encomun(lector.generos, autor.generos),
    ...encomun(
      lector.voces.filter((v) => v !== VOCES_WILDCARD),
      autor.voces,
    ),
    ...encomun(lector.mood, autor.mood),
  ];
  if (lector.estilo && lector.estilo === autor.estilo) salida.push(lector.estilo);
  return [...new Set(salida)];
}

// ===========================================================================
// Serendipia (§6.4)
// ===========================================================================

/**
 * Candidatos a comodín de serendipia: autores que comparten UN tag fuerte con la
 * persona pero por lo demás son de otro mundo.
 *
 * Se exige al menos una coincidencia (si no, sería ruido aleatorio y no un
 * descubrimiento) y como mucho `MAX_TAGS_SERENDIPIA` (si comparte más ya es un
 * match normal y habría entrado por afinidad).
 */
export function candidatosSerendipia(
  lector: PerfilLector,
  autores: readonly PerfilAutor[],
  yaElegidos: ReadonlySet<string>,
): PerfilAutor[] {
  return autores.filter((autor) => {
    if (yaElegidos.has(autor.id)) return false;
    const comunes = coincidencias(lector, autor).length;
    return comunes >= 1 && comunes <= MAX_TAGS_SERENDIPIA;
  });
}

/**
 * Elige los comodines al azar entre los candidatos, con el azar sembrado por
 * `semilla` (el `session_id`): varía entre personas, es estable para la misma.
 *
 * Si no hay candidatos válidos —porque la persona respondió muy poco, o porque
 * la curaduría aún no ha puesto tags— simplemente devuelve menos comodines. La
 * lista nunca se queda corta por esto: el hueco lo rellena la afinidad.
 */
export function elegirSerendipia(
  candidatos: readonly PerfilAutor[],
  cuantos: number,
  semilla: string,
): PerfilAutor[] {
  if (cuantos <= 0 || candidatos.length === 0) return [];
  // Se ordena por id antes de barajar para que la baraja parta siempre del
  // mismo estado, sin importar en qué orden viniera el catálogo.
  const estables = [...candidatos].sort((a, b) => a.id.localeCompare(b.id));
  const aleatorio = generadorAleatorio(semillaDesdeTexto(semilla));
  return barajar(estables, aleatorio).slice(0, cuantos);
}

// ===========================================================================
// Entrada principal
// ===========================================================================

export interface OpcionesMatch {
  /** Cuántos resultados devolver en total. */
  cuantos?: number;
  /**
   * Semilla del azar de la serendipia; en la app, el `session_id`.
   * Sin semilla no se añaden comodines y el resultado es puro ranking.
   */
  semilla?: string;
  /** Cuántos comodines de serendipia incluir. */
  comodines?: number;
}

/**
 * Calcula el match completo.
 *
 * @param lector   respuestas del wizard
 * @param autores  catálogo de autores (ya filtrado a activos)
 * @returns lista ordenada y diversificada, con `posicion` 0 para el match principal
 */
export function calcularMatch(
  lector: PerfilLector,
  autores: readonly PerfilAutor[],
  opciones: OpcionesMatch = {},
): ResultadoMatch[] {
  const cuantos = opciones.cuantos ?? TOTAL_RESULTADOS;
  const comodines = opciones.semilla ? (opciones.comodines ?? COMODINES_SERENDIPIA) : 0;

  const puntuados = autores.map((autor) => {
    const desglose = calcularDesglose(lector, autor);
    const crudo = puntajeCrudo(lector, autor, desglose);
    return { autor, desglose, crudo };
  });

  // Desempate estable por id: sin esto, dos autores con el mismo puntaje
  // podrían alternarse entre renders y el resultado dejaría de ser reproducible.
  puntuados.sort((a, b) => b.crudo - a.crudo || a.autor.id.localeCompare(b.autor.id));

  const total = Math.min(cuantos, puntuados.length);
  // Se dejan libres tantas plazas como comodines vayan a entrar, pero nunca a
  // costa de vaciar el ranking: si hay pocos autores, manda la afinidad.
  const porAfinidad = Math.max(1, total - comodines);

  // MMR decide QUIÉNES entran por afinidad (para que la lista no sea
  // monotemática); el orden final vuelve a ser por puntaje.
  const seleccionados = seleccionarConMMR(
    puntuados.map((p) => ({ autor: p.autor, relevancia: p.crudo })),
    porAfinidad,
  );

  const elegidos = new Set(seleccionados.map((autor) => autor.id));
  const serendipia = opciones.semilla
    ? elegirSerendipia(
        candidatosSerendipia(lector, puntuados.map((p) => p.autor), elegidos),
        total - seleccionados.length,
        opciones.semilla,
      )
    : [];
  const idsSerendipia = new Set(serendipia.map((autor) => autor.id));

  // Si la serendipia no llenó su cupo (pocos candidatos válidos), se completa
  // con los siguientes por afinidad: la lista nunca sale corta.
  const completados = [...seleccionados, ...serendipia];
  if (completados.length < total) {
    const yaEstan = new Set(completados.map((a) => a.id));
    for (const p of puntuados) {
      if (completados.length >= total) break;
      if (!yaEstan.has(p.autor.id)) completados.push(p.autor);
    }
  }

  const porId = new Map(puntuados.map((p) => [p.autor.id, p]));
  const ordenados = completados.sort(
    (a, b) => porId.get(b.id)!.crudo - porId.get(a.id)!.crudo || a.id.localeCompare(b.id),
  );

  return ordenados.map((autor, posicion) => {
    const p = porId.get(autor.id)!;
    return {
      autorId: autor.id,
      crudo: p.crudo,
      porcentaje: calibrar(p.crudo),
      posicion,
      coincidencias: coincidencias(lector, autor),
      esSerendipia: idsSerendipia.has(autor.id),
      desglose: p.desglose,
    };
  });
}

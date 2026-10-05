/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  PARÁMETROS DEL ALGORITMO DE MATCH — TODOS LOS NÚMEROS VIVEN AQUÍ         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 *
 * El motor (`motor.ts`) no contiene ninguna constante mágica: lee todo de este
 * archivo. Para recalibrar el match basta con cambiar estos valores.
 *
 * ORIGEN DE LOS VALORES
 * Los pesos (§6.1), la curva de calibración (§6.2) y el λ de MMR (§6.3) son los
 * del prompt maestro (`01-PROMPT-MAESTRO-claude-code.md`). Cada bloque cita su
 * sección. Lo que NO viene del prompt maestro está marcado como tal.
 */

import type { Estilo } from '@/lib/vocabulario';

/**
 * §6.1 — Peso de cada categoría de tags.
 *
 * Valores literales del prompt maestro:
 *   tematicas 1.3 · mood 1.2 · voces 1.1 · generos 1.0 · estilo 0.8 ·
 *   publico 0.6
 *
 * La categoría `actividades` (0.4 en el prompt maestro) se retiró: la pregunta
 * "¿Qué te interesa de la Feria?" vive ahora en la hoja opcional "Cuéntanos
 * más", que se responde DESPUÉS del match, así que ya no puede alimentarlo.
 *
 * No suman 1 a propósito: son pesos relativos. `motor.ts` los normaliza
 * dividiendo entre la suma de las categorías vivas, así que las proporciones
 * entre ellos se respetan exactamente y, además, si la persona no respondió una
 * categoría (o marcó el comodín en "voces"), su peso se reparte entre las demás
 * en la misma proporción — no responder no penaliza a nadie.
 *
 * La categoría `publico` cruza el rango de edad que la persona eligió en el
 * paso 6 (traducido con `EDAD_A_PUBLICO`) con la columna `publico` del autor.
 */
export const PESOS = {
  /** Paso 3 — temáticas. La señal más fuerte. */
  tematicas: 1.3,
  /** Paso 1 — qué busca al leer. */
  mood: 1.2,
  /** Paso 5 — voces que quiere leer. */
  voces: 1.1,
  /** Paso 2 — géneros. */
  generos: 1.0,
  /** Paso 4 — estilo de lectura. */
  estilo: 0.8,
  /** Paso 6 — edad de la persona frente a la columna `publico` del autor. */
  publico: 0.6,
} as const satisfies Record<string, number>;

export type CategoriaMatch = keyof typeof PESOS;

export const CATEGORIAS_MATCH = Object.keys(PESOS) as CategoriaMatch[];

/**
 * NO viene del prompt maestro.
 *
 * Afinidad entre estilos de lectura. El prompt maestro describe `estilo` como
 * una escala ("de lo que ya disfruto a cosas raras y experimentales", §5.4), y
 * una escala pide que los extremos no queden a cero entre sí. 1 = mismo estilo.
 */
export const AFINIDAD_ESTILO: Record<Estilo, Record<Estilo, number>> = {
  'Accesible': { 'Accesible': 1, 'Literario/Experimental': 0.3, 'Académico': 0.15 },
  'Literario/Experimental': { 'Accesible': 0.3, 'Literario/Experimental': 1, 'Académico': 0.4 },
  'Académico': { 'Accesible': 0.15, 'Literario/Experimental': 0.4, 'Académico': 1 },
};

/**
 * NO viene del prompt maestro.
 *
 * Afinidad de público. Se mide la distancia en posiciones dentro de `PUBLICO`
 * (Infantil → Juvenil → Adulto joven → Adulto) entre el público que le
 * corresponde a la persona y el más cercano de los del autor. Índice =
 * distancia; a partir de ahí, el último valor. Un adulto y un autor "Adulto
 * joven" se parecen; un adulto y un autor "Infantil", poco.
 */
export const AFINIDAD_PUBLICO_POR_DISTANCIA = [1, 0.6, 0.3, 0.15] as const;

/**
 * NO viene del prompt maestro.
 *
 * Bonificación por disponibilidad: cuánto puede subir el puntaje crudo un autor
 * cuyas actividades caen en los días y franjas que la persona eligió (paso 7).
 * El prompt maestro usa esos datos para filtrar la ruta (§7.2) y para la curva
 * de aforo, no para el score; aquí además empujan suavemente el ranking.
 *
 * `crudo * (1 + BONUS_DISPONIBILIDAD_MAX * cobertura)`, con `cobertura` en [0,1].
 * Es una bonificación, no un filtro: un autor sin actividades compatibles baja
 * en la lista pero nunca desaparece.
 */
export const BONUS_DISPONIBILIDAD_MAX = 0.12;

/**
 * §6.3 — Cómo se mide el parecido ENTRE AUTORES para penalizar en MMR.
 *
 * El prompt maestro pide penalizar compartir `genero_autor` **y** el mismo
 * género literario dominante; el tercer término añade el parecido temático, que
 * es lo que evita que salgan tres ensayistas distintos hablando todos de lo
 * mismo. Deben sumar 1.
 */
export const SIMILITUD_AUTORES = {
  /** Mismo F/M/No binario/Colectivo. */
  generoAutor: 0.35,
  /** Mismo primer género de su columna `generos`. */
  generoDominante: 0.35,
  /** Coseno sobre géneros + temáticas + mood + voces. */
  tags: 0.3,
} as const;

/**
 * §6.2 — Curva de presentación: convierte el puntaje crudo (0-1) en el
 * porcentaje que ve la persona.
 *
 *   pct = 55 + 44 * crudo^0.6
 *
 * que es exactamente `PCT_MIN + (PCT_MAX - PCT_MIN) * crudo^GAMMA` con los
 * valores de abajo. Monótona creciente y acotada en [55, 99]: nadie ve 0 %,
 * porque "siempre hay match".
 */
export const CALIBRACION = {
  PCT_MIN: 55,
  PCT_MAX: 99,
  GAMMA: 0.6,
} as const;

/**
 * §6.3 — Diversificación MMR (Maximal Marginal Relevance).
 *
 *   MMR(a) = λ · raw − (1 − λ) · máx. similitud con los ya elegidos
 *
 * λ = 0.7, valor literal del prompt maestro. Privilegia la afinidad pero evita
 * que salgan diez autores casi idénticos seguidos.
 */
export const MMR_LAMBDA = 0.7;

/**
 * §6.3 re-rankea TODO el ranking con MMR, sin exceptuar el primer puesto — por
 * eso está en `false`. En la práctica el resultado es el mismo: con la lista
 * ordenada por `raw` y sin nadie elegido todavía, el término de penalización es
 * 0 y MMR escoge igualmente al de mayor afinidad.
 */
export const PRIMER_PUESTO_SIN_MMR = false;

/**
 * §6.4 — Reparto de la pantalla de resultado.
 *
 * Cada sección tiene dos cifras: cuántos autores se ven al entrar (`visibles`) y
 * cuántos hay en total tras tocar "Ver más" (`total`).
 *
 * El porqué de los dos números: con ~300 autores invitados, mostrar solo cinco
 * por sesión dejaría a casi todos sin una impresión y haría inservible el
 * análisis de "matcheados vs. clicados vs. añadidos" del §7.5. Pero en un móvil,
 * catorce tarjetas de golpe son demasiado scroll antes de llegar a la agenda.
 * Así la primera pantalla es corta y la cola larga está a un toque.
 *
 * El diseño entregado mostraba 1 + 2 + 2, pero eso no era un tope de producto:
 * el prototipo solo tenía cinco autores de ejemplo y las secciones se
 * repartieron los que había. Su layout (columna flexible con scroll) admite
 * cualquier cantidad sin cambiar un pixel.
 */
export const SECCIONES_RESULTADO = {
  /** El autor más afín, con marco y porcentaje grande. Siempre uno. */
  destacado: 1,
  /** "Tu match literario". */
  match: { visibles: 3, total: 7 },
  /** "También te puede interesar", donde caen los comodines de serendipia. */
  tambien: { visibles: 2, total: 8 },
} as const;

/**
 * Cuántos autores calcula el motor. Se deriva de las secciones para que las dos
 * cifras no puedan quedar descuadradas al ajustar una sola.
 */
export const TOTAL_RESULTADOS =
  SECCIONES_RESULTADO.destacado +
  SECCIONES_RESULTADO.match.total +
  SECCIONES_RESULTADO.tambien.total;

/**
 * §6.4 — Cuántos comodines de serendipia entran en "También te puede interesar".
 *
 * No se eligen por afinidad, sino al azar entre autores que comparten UN tag
 * fuerte con la persona pero por lo demás son de otro mundo. Es lo que hace que
 * la feria enseñe algo que no esperabas en vez de más de lo mismo.
 */
export const COMODINES_SERENDIPIA = 2;

/**
 * Un candidato a serendipia comparte pocos tags: si comparte muchos ya no es un
 * descubrimiento, es un match normal y entraría por afinidad.
 */
export const MAX_TAGS_SERENDIPIA = 2;

/**
 * NO viene del prompt maestro.
 *
 * Voz que actúa como FILTRO DURO: si la persona la marca en el paso 5, el
 * catálogo se restringe a autoras (columna `genero_autor` = F) antes de
 * puntuar. No es un peso de afinidad: quien no cumple queda fuera del match,
 * de la diversificación y de la serendipia.
 */
export const VOZ_FILTRO_DURO = 'Autoras mujeres';

/**
 * Vocabulario controlado de Match Literario.
 *
 * FUENTE DE VERDAD: la pestaña `Vocabulario` del spreadsheet "Base Autores"
 * (ver `sheets/Base-Autores-Feria-del-Libro-2026.xlsx`). Esa pestaña alimenta
 * los desplegables de `Autores` y `Actividades`, así que estas listas y las de
 * la hoja tienen que decir exactamente lo mismo: el match compara etiquetas.
 *
 * Las nueve columnas de esa pestaña, en su orden:
 *   Géneros literarios · Temáticas · Mood (experiencia lectora) · Público ·
 *   Estilo · Voces · Tipos de actividad · Género del autor/a · Origen
 *
 * Si la curaduría añade un valor allí, hay que añadirlo aquí. La hoja avisa de
 * ello en su propio encabezado ("Avise al equipo de desarrollo antes de
 * modificar").
 */

// ===========================================================================
// Columnas de la pestaña `Vocabulario`
// ===========================================================================

export const GENEROS = [
  'Novela',
  'Cuento',
  'Poesía',
  'Ensayo',
  'Crónica/Periodismo',
  'No ficción',
  'Novela gráfica/Cómic',
  'Infantil',
  'Juvenil',
  'Teatro',
  'Terror/Suspenso',
  'Ciencia ficción',
  'Fantasía',
  'Romance',
] as const;

export const TEMATICAS = [
  'Historia y memoria',
  'Feminismos y género',
  'Medio ambiente y territorio',
  'Política y sociedad',
  'Ciencia y tecnología',
  'Amor y relaciones',
  'Salud mental y bienestar',
  'Arte y cultura',
  'Espiritualidad y filosofía',
  'Humor y vida cotidiana',
  'Deporte',
  'Gastronomía',
  'Viajes',
  'Negocios y emprendimiento',
  'Crianza y familia',
  'Identidad y diversidad',
] as const;

export const MOOD = [
  'Evadirme y soñar',
  'Entender el presente',
  'Emocionarme',
  'Reírme',
  'Incomodarme y pensar',
  'Aprender algo nuevo',
  'Conectar con mis raíces',
] as const;

/** Columna `publico` de `Autores`: a qué público apunta la obra del autor. */
export const PUBLICO = ['Infantil', 'Juvenil', 'Adulto joven', 'Adulto'] as const;

/** Columna `estilo` de `Autores`. En la hoja es un desplegable de UN solo valor. */
export const ESTILOS = [
  { label: 'Accesible', hint: 'lo que ya disfruto' },
  { label: 'Literario/Experimental', hint: 'cosas raras, que me reten' },
  { label: 'Académico', hint: 'con rigor y profundidad' },
] as const;

export const ESTILO_LABELS: readonly string[] = ESTILOS.map((e) => e.label);

export const VOCES = [
  'Autoras mujeres',
  'Voces locales (Caldas/Manizales)',
  'Voces colombianas',
  'Voces latinoamericanas',
  'Autores jóvenes/emergentes',
  'Voces indígenas y afro',
  'Voces internacionales',
] as const;

export const TIPOS_ACTIVIDAD = [
  'Oferta/muestra editorial',
  'Presentaciones de libros',
  'Actividades culturales',
  'Conversatorios',
  'Feria Gráfica',
  'Talleres',
] as const;

/** Columna `franja_tematica` de `Autores`. Un solo valor por autor. */
export const FRANJAS_TEMATICAS = [
  'Pequeños lectores',
  'Cómic en las montañas',
  'Intergeneracional',
  'Académica y de investigación',
  'Creación y oficio literario',
  'Lenguajes artísticos',
  'Ciudadanía y actualidad',
  'Cartografías de la intimidad',
  'Diez años de la paz: palabras para encontrarnos',
  'General',
] as const;

/** Columna `genero_autor` de `Autores`. Solo se usa para diversificar el ranking. */
export const GENEROS_AUTOR = ['F', 'M', 'No binario', 'Colectivo'] as const;

/** Columna `origen` de `Autores`. Genera el tag de "voces" y se muestra en la card. */
export const ORIGENES_AUTOR = [
  'Local',
  'Caldas',
  'Nacional',
  'Latinoamérica',
  'Internacional',
] as const;

// ===========================================================================
// Vocabulario propio del wizard (no vive en la hoja)
// ===========================================================================

/**
 * Paso 5. La hoja tiene 7 voces; el wizard añade un comodín que NO es un tag de
 * autor: significa "no filtres por aquí".
 */
export const VOCES_WIZARD = [...VOCES, 'Me da igual, sorpréndeme'] as const;

/** Opción comodín del paso 5: anula el resto de la selección. */
export const VOCES_WILDCARD = 'Me da igual, sorpréndeme';

/** Paso 6. Se guarda tal cual en la columna `edad` de `Respuestas`. */
export const EDADES = ['6-17', '18-28', '29-40', '41-60', '60+'] as const;

/**
 * Paso 8. La hoja no tiene franjas: se derivan de `hora_inicio`.
 */
export const FRANJAS = ['Mañana', 'Tarde', 'Noche'] as const;

// --- Preguntas opcionales post-resultado ------------------------------------

/** Columna `origen_visitante` de `Respuestas`. */
export const ORIGENES_VISITANTE = [
  'Manizales',
  'Caldas',
  'Eje Cafetero',
  'Resto de Colombia',
  'Internacional',
] as const;

/** Columna `donde_consigue_libros` de `Respuestas`. */
export const DONDE_LIBROS = [
  'Librería física',
  'Online',
  'Bibliotecas',
  'Prestados/usados',
  'Digital',
] as const;

/** Columna `visita_previa` de `Respuestas`: si ya había venido a la Feria. */
export const VISITA_PREVIA = ['Sí', 'No'] as const;

/** Columna `como_se_entero` de `Respuestas`. */
export const COMO_SE_ENTERO = [
  'Redes sociales',
  'Radio/prensa',
  'Colegio/universidad',
  'Voz a voz',
  'Otro',
] as const;

// ===========================================================================
// Tipos derivados
// ===========================================================================

export type Genero = (typeof GENEROS)[number];
export type Tematica = (typeof TEMATICAS)[number];
export type Mood = (typeof MOOD)[number];
export type Publico = (typeof PUBLICO)[number];
export type Estilo = (typeof ESTILOS)[number]['label'];
export type Voz = (typeof VOCES)[number];
export type VozWizard = (typeof VOCES_WIZARD)[number];
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];
export type FranjaTematica = (typeof FRANJAS_TEMATICAS)[number];
export type GeneroAutor = (typeof GENEROS_AUTOR)[number];
export type OrigenAutor = (typeof ORIGENES_AUTOR)[number];
export type Edad = (typeof EDADES)[number];
export type Franja = (typeof FRANJAS)[number];
export type OrigenVisitante = (typeof ORIGENES_VISITANTE)[number];
export type DondeLibros = (typeof DONDE_LIBROS)[number];
export type ComoSeEntero = (typeof COMO_SE_ENTERO)[number];
export type VisitaPrevia = (typeof VISITA_PREVIA)[number];

/** Fecha en `YYYY-MM-DD`, tal como viene en la columna `fecha` de `Actividades`. */
export type FechaISO = string;

// ===========================================================================
// Mapeos
// ===========================================================================

/**
 * Paso 6 → columna `publico` del autor.
 *
 * La persona responde su edad; el autor está etiquetado por público objetivo.
 * Este mapa es el puente. Viene del prompt maestro §5.6.
 */
export const EDAD_A_PUBLICO: Record<Edad, Publico> = {
  // El rango abarca Infantil y Juvenil; se mapea a Juvenil, que queda a
  // distancia 1 de Infantil y por tanto no lo excluye del match.
  '6-17': 'Juvenil',
  '18-28': 'Adulto joven',
  '29-40': 'Adulto',
  '41-60': 'Adulto',
  '60+': 'Adulto',
};

/**
 * Columna `origen` del autor → tag de `voces`, para que el origen también pese
 * en el match aunque la curaduría no haya rellenado `voces` a mano.
 * "Local" y "Caldas" son ambos Caldas/Manizales; "Nacional" es Colombia.
 */
export const ORIGEN_A_VOZ: Record<OrigenAutor, Voz | null> = {
  'Local': 'Voces locales (Caldas/Manizales)',
  'Caldas': 'Voces locales (Caldas/Manizales)',
  'Nacional': 'Voces colombianas',
  'Latinoamérica': 'Voces latinoamericanas',
  'Internacional': 'Voces internacionales',
};

/** Límites horarios de cada franja, en minutos desde medianoche. */
export const FRANJA_RANGOS: Record<Franja, { desde: number; hasta: number }> = {
  'Mañana': { desde: 0, hasta: 12 * 60 },
  'Tarde': { desde: 12 * 60, hasta: 18 * 60 },
  'Noche': { desde: 18 * 60, hasta: 24 * 60 },
};

// ===========================================================================
// Normalización de etiquetas
// ===========================================================================

/**
 * Normaliza una etiqueta para comparar: minúsculas, sin tildes, sin espacios
 * sobrantes. Tolera que en el Sheets alguien escriba "poesia" o "Poesía ".
 */
export function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Índice etiqueta-normalizada → etiqueta canónica, por categoría. */
function construirIndice(lista: readonly string[]): Map<string, string> {
  return new Map(lista.map((etiqueta) => [normalizar(etiqueta), etiqueta]));
}

const INDICES = {
  generos: construirIndice(GENEROS),
  tematicas: construirIndice(TEMATICAS),
  mood: construirIndice(MOOD),
  publico: construirIndice(PUBLICO),
  estilo: construirIndice(ESTILO_LABELS),
  voces: construirIndice(VOCES),
  vocesWizard: construirIndice(VOCES_WIZARD),
  tiposActividad: construirIndice(TIPOS_ACTIVIDAD),
  franjasTematicas: construirIndice(FRANJAS_TEMATICAS),
  generoAutor: construirIndice(GENEROS_AUTOR),
  origenAutor: construirIndice(ORIGENES_AUTOR),
  edad: construirIndice(EDADES),
  franjas: construirIndice(FRANJAS),
  origenVisitante: construirIndice(ORIGENES_VISITANTE),
  dondeLibros: construirIndice(DONDE_LIBROS),
  comoSeEntero: construirIndice(COMO_SE_ENTERO),
  visitaPrevia: construirIndice(VISITA_PREVIA),
} as const;

export type CategoriaVocabulario = keyof typeof INDICES;

/**
 * Devuelve la etiqueta canónica del vocabulario, o `null` si el valor no
 * pertenece a la categoría. Úsalo SIEMPRE al leer celdas del Sheets.
 */
export function canonizar(categoria: CategoriaVocabulario, valor: string): string | null {
  return INDICES[categoria].get(normalizar(valor)) ?? null;
}

/** Igual que `canonizar` pero para listas; descarta lo que no esté en el vocabulario. */
export function canonizarLista(categoria: CategoriaVocabulario, valores: string[]): string[] {
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const valor of valores) {
    const canonico = canonizar(categoria, valor);
    if (canonico && !vistos.has(canonico)) {
      vistos.add(canonico);
      salida.push(canonico);
    }
  }
  return salida;
}

/**
 * Parte una celda multivaluada de `Autores`.
 *
 * El Apps Script de la hoja guarda las selecciones múltiples como texto
 * separado por `", "`, así que el separador real es la coma. Se aceptan también
 * `;` y `|` por si alguien llena la celda a mano de otra forma.
 */
export function partirCelda(celda: string | undefined | null): string[] {
  if (!celda) return [];
  return celda
    .split(/[,;|]/)
    .map((parte) => parte.trim())
    .filter(Boolean);
}

/**
 * Interpreta la columna `activo`. La hoja la define como TRUE/FALSE, pero la
 * API de Sheets puede devolverla como texto o como booleano según el formato de
 * la celda, y hay quien escribe "SI"/"NO".
 */
export function esVerdadero(valor: unknown): boolean {
  if (typeof valor === 'boolean') return valor;
  if (valor == null) return false;
  const texto = normalizar(String(valor));
  return texto === 'true' || texto === 'si' || texto === 'sí' || texto === '1' || texto === 'x';
}

// ===========================================================================
// Horas y fechas
// ===========================================================================

/**
 * Convierte la columna `hora_inicio` / `hora_fin` a minutos desde medianoche.
 * La hoja pide `HH:MM` en 24h; se acepta además `4:30 pm` por tolerancia.
 * Devuelve `null` si no parsea (celda vacía o actividad todavía sin programar).
 */
export function horaAMinutos(hora: unknown): number | null {
  if (hora == null || hora === '') return null;
  const texto = String(hora).trim().toLowerCase();
  const match = texto.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!match) return null;
  let horas = Number(match[1]);
  const minutos = Number(match[2]);
  const sufijo = match[3]?.replace(/\./g, '');
  if (sufijo === 'pm' && horas < 12) horas += 12;
  if (sufijo === 'am' && horas === 12) horas = 0;
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

/** Formatea minutos desde medianoche como "4:30 pm" (formato del diseño). */
export function minutosAHora(minutos: number): string {
  const horas24 = Math.floor(minutos / 60) % 24;
  const mm = String(minutos % 60).padStart(2, '0');
  const sufijo = horas24 < 12 ? 'am' : 'pm';
  const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
  return `${horas12}:${mm} ${sufijo}`;
}

/** Franja horaria a la que pertenece un minuto del día. */
export function franjaDeMinutos(minutos: number): Franja {
  if (minutos < FRANJA_RANGOS['Mañana'].hasta) return 'Mañana';
  if (minutos < FRANJA_RANGOS['Tarde'].hasta) return 'Tarde';
  return 'Noche';
}

const MESES_ABREVIADOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/**
 * Valida y normaliza la columna `fecha` a `YYYY-MM-DD`.
 *
 * Acepta el texto `2026-08-31` y también un `Date` (la API de Sheets devuelve
 * texto, pero al importar desde Excel puede llegar como fecha). Devuelve `null`
 * si la celda está vacía o no es una fecha — es el caso de las actividades que
 * el Apps Script crea como plantilla y la curaduría aún no ha programado.
 */
export function aFechaISO(valor: unknown): FechaISO | null {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const anio = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
  const texto = String(valor).trim();
  const match = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

const DIAS_SEMANA = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

/**
 * Día de la semana de una fecha `YYYY-MM-DD`, calculado con `Date.UTC` para no
 * depender de la zona horaria del dispositivo: la misma fecha da siempre el
 * mismo resultado sin importar dónde se ejecute.
 */
function diaSemanaDeFecha(fecha: FechaISO): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  return DIAS_SEMANA[fechaUtc.getUTCDay()];
}

/**
 * Etiqueta de un día para la UI: `2026-08-31` → `"Lunes 31 ago"`.
 *
 * Se formatea a mano y no con `toLocaleDateString` a propósito: evita depender
 * de la zona horaria del dispositivo (que desplazaría el día) y del soporte de
 * locales del navegador.
 */
export function etiquetaDia(fecha: FechaISO): string {
  const [, mes, dia] = fecha.split('-');
  const nombreDia = diaSemanaDeFecha(fecha);
  const diaCapitalizado = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
  return `${diaCapitalizado} ${Number(dia)} ${MESES_ABREVIADOS[Number(mes) - 1] ?? '??'}`;
}

/**
 * Días de la feria si la programación todavía no tiene fechas cargadas.
 *
 * Fechas confirmadas: del **19 al 25 de octubre de 2026**, siete días. (El
 * prompt maestro §1 decía 31 ago – 6 sep, pero el evento se movió.)
 *
 * Esto es solo el respaldo para que el paso 8 no salga vacío mientras la
 * curaduría programa las actividades: los días reales se derivan de
 * `Actividades.fecha`, como pide el §3.1. Si la feria vuelve a moverse y la
 * hoja ya tiene fechas, esta lista ni se usa.
 */
export const DIAS_POR_DEFECTO: FechaISO[] = [
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-10-22',
  '2026-10-23',
  '2026-10-24',
  '2026-10-25',
];

/**
 * Parseo de las filas de Google Sheets.
 *
 * Separado de `source.ts` (que es `server-only`) para poder probarlo: es la
 * pieza de la que más depende la fase 2 y la que más se rompe en silencio si la
 * hoja cambia. `source.ts` lo reexporta, así que se puede importar desde
 * cualquiera de los dos.
 *
 * Todas las funciones son puras y tolerantes: una fila mala devuelve `null`, no
 * lanza. La hoja llega con 1000 filas en blanco, filas de ejemplo y plantillas
 * a medio llenar; nada de eso puede tumbar la lectura.
 */

import {
  aFechaISO,
  canonizar,
  canonizarLista,
  esVerdadero,
  horaAMinutos,
  ORIGEN_A_VOZ,
  partirCelda,
} from '@/lib/vocabulario';
import type { Voz } from '@/lib/vocabulario';
import { runsASegmentos } from './cursivas';
import type { CursivasDeFila } from './cursivas';
import type { Actividad, Autor } from './types';

/**
 * Convierte una fila de `Autores` (19 celdas, A..S) en un `Autor`.
 * Devuelve `null` si la fila no es un autor utilizable.
 * `cursivas` (opcional) trae los `textFormatRuns` de las dos columnas de bio
 * para reflejar las cursivas que puso la curaduría en la hoja.
 */
export function filaAAutor(fila: unknown[], cursivas?: CursivasDeFila | null): Autor | null {
  const celda = (i: number) => (fila[i] == null ? '' : String(fila[i]).trim());

  const id = celda(0);
  // Filas en blanco y la fila de ejemplo que trae la plantilla.
  if (!id || id.toUpperCase() === 'AUT000') return null;
  if (!esVerdadero(fila[18])) return null;

  const nombreCompleto = celda(1);
  const nombreVisible = celda(2) || nombreCompleto;
  if (!nombreVisible) return null;

  // Las bios se toman crudas (sin recortar) porque los `startIndex` de los
  // runs de cursiva refieren al texto tal cual está en la celda; el recorte y
  // la realineación viven en `runsASegmentos`.
  const bioCortaCruda = fila[6] == null ? '' : String(fila[6]);
  const bioCorta = bioCortaCruda.trim();
  const bioLargaCruda = fila[7] == null ? '' : String(fila[7]);
  const bioLarga = bioLargaCruda.trim() || bioCorta;
  const bioCortaSegmentos = runsASegmentos(bioCortaCruda, cursivas?.bioCorta);
  const bioLargaSegmentos = bioLargaCruda.trim()
    ? runsASegmentos(bioLargaCruda, cursivas?.bioLarga)
    : bioCortaSegmentos;

  const autor: Autor = {
    id,
    nombreCompleto,
    nombreVisible,
    generoAutor: canonizar('generoAutor', celda(3)) as Autor['generoAutor'],
    pais: celda(4),
    origen: canonizar('origenAutor', celda(5)) as Autor['origen'],
    bioCorta,
    bioLarga,
    bioCortaSegmentos,
    bioLargaSegmentos,
    fotoUrl: normalizarFotoUrl(celda(8)),
    libroDestacado: celda(9),
    webORed: celda(10),
    generos: canonizarLista('generos', partirCelda(celda(11))) as Autor['generos'],
    tematicas: canonizarLista('tematicas', partirCelda(celda(12))) as Autor['tematicas'],
    mood: canonizarLista('mood', partirCelda(celda(13))) as Autor['mood'],
    publico: canonizarLista('publico', partirCelda(celda(14))) as Autor['publico'],
    estilo: canonizar('estilo', celda(15)) as Autor['estilo'],
    voces: canonizarLista('voces', partirCelda(celda(16))) as Autor['voces'],
    franjaTematica: canonizar('franjasTematicas', celda(17)) as Autor['franjaTematica'],
    activo: true,
  };

  return conVozDeOrigen(autor);
}

/**
 * Convierte una fila de `Actividades` (10 celdas, A..J) en una `Actividad`.
 * Devuelve `null` si todavía no es programación real.
 */
export function filaAActividad(fila: unknown[]): Actividad | null {
  const celda = (i: number) => (fila[i] == null ? '' : String(fila[i]).trim());

  const id = celda(0);
  if (!id) return null;
  if (!esVerdadero(fila[9])) return null;

  const autorIds = partirCelda(celda(1));
  if (autorIds.length === 0) return null;

  // Sin fecha u hora no es una actividad, es la plantilla que crea el Apps
  // Script al dar de alta un autor ("[Actividad de …]").
  const fecha = aFechaISO(fila[4]);
  const inicioMin = horaAMinutos(fila[5]);
  if (fecha === null || inicioMin === null) return null;

  const finMin = horaAMinutos(fila[6]);

  return {
    id,
    autorIds,
    titulo: celda(2),
    tipo: canonizar('tiposActividad', celda(3)) as Actividad['tipo'],
    fecha,
    inicioMin,
    // Si la curaduría no puso hora de fin, se asume una hora: es lo que hace
    // falta para detectar cruces sin inventarse una duración larga.
    finMin: finMin !== null && finMin > inicioMin ? finMin : inicioMin + 60,
    lugar: celda(7),
    descripcion: celda(8),
    activo: true,
  };
}

/**
 * Añade a `voces` la voz que implica la columna `origen`.
 *
 * La curaduría rellena `origen` siempre (es un desplegable obligatorio) pero
 * `voces` a mano, y a veces la deja vacía. Derivarla evita que un autor local se
 * quede sin el tag que más le importa a quien pide "voces locales".
 */
export function conVozDeOrigen(autor: Autor): Autor {
  const voz = autor.origen ? ORIGEN_A_VOZ[autor.origen] : null;
  if (!voz || autor.voces.includes(voz)) return autor;
  return { ...autor, voces: [...autor.voces, voz] as Voz[] };
}

/**
 * Normaliza la columna `foto_url` a una URL que sirva como `src` de imagen.
 *
 * En la hoja hay de todo: enlaces de "compartir" de Drive
 * (`/file/d/ID/view?usp=drive_link`), enlaces ya directos (`/uc?id=ID`), URLs de
 * otros sitios y algún enlace a Google Docs, que no es una imagen.
 *
 * Devuelve `null` cuando no se puede sacar una imagen; la UI cae entonces al
 * avatar de iniciales, que es el comportamiento pedido (prompt maestro §8.5).
 */
export function normalizarFotoUrl(valor: string): string | null {
  const url = valor.trim();
  if (!url) return null;

  // Google Docs / Sheets / Slides: no son imágenes por mucho que estén en Drive.
  if (/^https?:\/\/docs\.google\.com\//i.test(url)) return null;

  const patronesDrive = [
    /drive\.google\.com\/file\/d\/([\w-]+)/i,
    /drive\.google\.com\/(?:uc|open)\?(?:[^#]*&)?id=([\w-]+)/i,
    /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([\w-]+)/i,
  ];
  for (const patron of patronesDrive) {
    const match = url.match(patron);
    // `thumbnail` sirve imágenes redimensionadas y no exige que el archivo esté
    // publicado en la web, solo compartido con enlace — que es como los sube la
    // curaduría.
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
  }

  if (/^https?:\/\//i.test(url)) return url;
  return null;
}

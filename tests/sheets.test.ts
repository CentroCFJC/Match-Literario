/**
 * Contrato con Google Sheets.
 *
 * Estos tests son la red de seguridad de la fase 2: comprueban que el parseo
 * aguanta las filas reales de la hoja (incluidas las raras) y que el orden de
 * columnas al escribir no se desalinea.
 *
 * Las filas de ejemplo están copiadas de los archivos de `sheets/`.
 */

import { describe, expect, it } from 'vitest';

import {
  conVozDeOrigen,
  filaAActividad,
  filaAAutor,
  normalizarFotoUrl,
} from '@/lib/data/parseo';
import {
  aFilaFeedback,
  aFilaRespuestas,
  dispositivoDesdeUserAgent,
  ENCABEZADOS_FEEDBACK,
  ENCABEZADOS_RESPUESTAS,
} from '@/lib/data/serializacion';
import type { Respuesta } from '@/lib/data/types';
import { aFechaISO, etiquetaDia, horaAMinutos, partirCelda } from '@/lib/vocabulario';

// ---------------------------------------------------------------------------
// Filas reales de `Autores` (18 celdas, A..R)
// ---------------------------------------------------------------------------

/** Fila real de la hoja: Nona Fernández, con tags a medio curar. */
const FILA_NONA = [
  'AUT001',
  'Nona Fernández',
  'Nona Fernández',
  'F',
  'Chile',
  'Latinoamérica',
  'Autora chilena de Space Invaders y La Dimensión Desconocida.',
  '',
  'https://drive.google.com/file/d/1D6iky3y82aRTx_bgx7gtclh9BYS9qS7b/view?usp=drive_link',
  'Marciano',
  'https://www.instagram.com/nonafernandez/',
  '',
  '',
  '',
  'Adulto, Adulto joven, Juvenil',
  'Accesible',
  'Autoras mujeres, Voces latinoamericanas',
  true,
];

describe('filaAAutor', () => {
  it('parsea una fila real de la hoja', () => {
    const autor = filaAAutor(FILA_NONA)!;
    expect(autor.id).toBe('AUT001');
    expect(autor.nombreVisible).toBe('Nona Fernández');
    expect(autor.generoAutor).toBe('F');
    expect(autor.pais).toBe('Chile');
    expect(autor.origen).toBe('Latinoamérica');
    expect(autor.estilo).toBe('Accesible');
  });

  it('parte las celdas multivaluadas por coma, como las escribe el Apps Script', () => {
    const autor = filaAAutor(FILA_NONA)!;
    expect(autor.publico).toEqual(['Adulto', 'Adulto joven', 'Juvenil']);
    expect(autor.voces).toContain('Autoras mujeres');
    expect(autor.voces).toContain('Voces latinoamericanas');
  });

  it('usa bio_corta cuando bio_larga va vacía', () => {
    const autor = filaAAutor(FILA_NONA)!;
    expect(autor.bioLarga).toBe(autor.bioCorta);
    expect(autor.bioLarga).not.toBe('');
  });

  it('deja los tags sin curar como listas vacías, no como basura', () => {
    const autor = filaAAutor(FILA_NONA)!;
    expect(autor.generos).toEqual([]);
    expect(autor.tematicas).toEqual([]);
    expect(autor.mood).toEqual([]);
  });

  it('descarta la fila de ejemplo AUT000 que trae la plantilla', () => {
    expect(filaAAutor(['AUT000', ...FILA_NONA.slice(1)])).toBeNull();
  });

  it('descarta filas en blanco', () => {
    expect(filaAAutor([])).toBeNull();
    expect(filaAAutor(new Array(18).fill(''))).toBeNull();
  });

  it('descarta autores inactivos, vengan como texto o como booleano', () => {
    expect(filaAAutor([...FILA_NONA.slice(0, 17), 'FALSE'])).toBeNull();
    expect(filaAAutor([...FILA_NONA.slice(0, 17), false])).toBeNull();
    expect(filaAAutor([...FILA_NONA.slice(0, 17), 'TRUE'])).not.toBeNull();
  });

  it('cae a nombre_completo si nombre_visible va vacío', () => {
    const fila = [...FILA_NONA];
    fila[2] = '';
    expect(filaAAutor(fila)!.nombreVisible).toBe('Nona Fernández');
  });

  it('ignora valores fuera del vocabulario en vez de colarlos a la hoja', () => {
    const fila = [...FILA_NONA];
    fila[11] = 'Novela, Género Inventado, Poesía';
    expect(filaAAutor(fila)!.generos).toEqual(['Novela', 'Poesía']);
  });

  it('tolera tildes y mayúsculas distintas', () => {
    const fila = [...FILA_NONA];
    fila[11] = 'poesia, CRÓNICA/PERIODISMO';
    expect(filaAAutor(fila)!.generos).toEqual(['Poesía', 'Crónica/Periodismo']);
  });
});

describe('conVozDeOrigen', () => {
  it('deriva la voz que implica la columna origen', () => {
    const autor = filaAAutor(FILA_NONA)!;
    // "Latinoamérica" ya venía en `voces`, así que no se duplica.
    expect(autor.voces.filter((v) => v === 'Voces latinoamericanas')).toHaveLength(1);
  });

  it('añade "Voces locales" a un autor Local sin esa columna rellena', () => {
    const fila = [...FILA_NONA];
    fila[5] = 'Local';
    fila[16] = '';
    expect(filaAAutor(fila)!.voces).toEqual(['Voces locales (Caldas/Manizales)']);
  });

  it('no toca al autor si no tiene origen', () => {
    const autor = filaAAutor(FILA_NONA)!;
    expect(conVozDeOrigen({ ...autor, origen: null, voces: [] }).voces).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Filas reales de `Actividades` (10 celdas, A..J)
// ---------------------------------------------------------------------------

const FILA_ACT = [
  'ACT001',
  'AUT001',
  'Conversatorio: La poesía como refugio',
  'Conversatorios',
  '2025-08-31',
  '15:00',
  '16:30',
  'Auditorio Principal',
  'Piedad Bonnett conversa sobre poesía, memoria y duelo.',
  'TRUE',
];

/** Plantilla que crea el Apps Script al dar de alta un autor. */
const FILA_PLANTILLA = ['ACT002', 'AUT002', '[Actividad de ]', '', '', '', '', '', '', true];

describe('filaAActividad', () => {
  it('parsea una fila real de la hoja', () => {
    const actividad = filaAActividad(FILA_ACT)!;
    expect(actividad.id).toBe('ACT001');
    expect(actividad.autorIds).toEqual(['AUT001']);
    expect(actividad.tipo).toBe('Conversatorios');
    expect(actividad.fecha).toBe('2025-08-31');
    expect(actividad.inicioMin).toBe(15 * 60);
    expect(actividad.finMin).toBe(16 * 60 + 30);
  });

  it('descarta las plantillas sin fecha ni hora del Apps Script', () => {
    expect(filaAActividad(FILA_PLANTILLA)).toBeNull();
  });

  it('parsea varios autores separados por coma', () => {
    const fila = [...FILA_ACT];
    fila[1] = 'AUT004, AUT011';
    expect(filaAActividad(fila)!.autorIds).toEqual(['AUT004', 'AUT011']);
  });

  it('asume una hora de duración si falta hora_fin', () => {
    const fila = [...FILA_ACT];
    fila[6] = '';
    expect(filaAActividad(fila)!.finMin).toBe(15 * 60 + 60);
  });

  it('ignora una hora_fin anterior a la de inicio', () => {
    const fila = [...FILA_ACT];
    fila[6] = '14:00';
    expect(filaAActividad(fila)!.finMin).toBe(15 * 60 + 60);
  });

  it('descarta actividades inactivas y sin autor', () => {
    expect(filaAActividad([...FILA_ACT.slice(0, 9), 'FALSE'])).toBeNull();
    const sinAutor = [...FILA_ACT];
    sinAutor[1] = '';
    expect(filaAActividad(sinAutor)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// foto_url
// ---------------------------------------------------------------------------

describe('normalizarFotoUrl', () => {
  it('convierte el enlace de compartir de Drive en una imagen servible', () => {
    expect(
      normalizarFotoUrl('https://drive.google.com/file/d/1D6iky3y82aRTx_bgx7gtclh9BYS9qS7b/view?usp=drive_link'),
    ).toBe('https://drive.google.com/thumbnail?id=1D6iky3y82aRTx_bgx7gtclh9BYS9qS7b&sz=w800');
  });

  it('convierte también el formato /uc?id= de la plantilla', () => {
    expect(normalizarFotoUrl('https://drive.google.com/uc?id=ABC123')).toBe(
      'https://drive.google.com/thumbnail?id=ABC123&sz=w800',
    );
  });

  it('rechaza los enlaces a Google Docs que hay en la hoja', () => {
    expect(
      normalizarFotoUrl('https://docs.google.com/document/d/1_VcdEkxY_RrG9/edit?usp=drive_link'),
    ).toBeNull();
  });

  it('deja pasar una URL de imagen normal', () => {
    expect(normalizarFotoUrl('https://ejemplo.org/foto.jpg')).toBe('https://ejemplo.org/foto.jpg');
  });

  it('devuelve null con la celda vacía o con texto que no es URL', () => {
    expect(normalizarFotoUrl('')).toBeNull();
    expect(normalizarFotoUrl('   ')).toBeNull();
    expect(normalizarFotoUrl('pendiente')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Horas y fechas
// ---------------------------------------------------------------------------

describe('horas y fechas', () => {
  it('parsea el formato HH:MM 24h que pide la hoja', () => {
    expect(horaAMinutos('15:00')).toBe(900);
    expect(horaAMinutos('09:30')).toBe(570);
  });

  it('tolera el formato de 12 horas', () => {
    expect(horaAMinutos('4:30 pm')).toBe(16 * 60 + 30);
    expect(horaAMinutos('12:00 am')).toBe(0);
  });

  it('devuelve null con celdas vacías o basura', () => {
    expect(horaAMinutos('')).toBeNull();
    expect(horaAMinutos('por definir')).toBeNull();
    expect(horaAMinutos('99:99')).toBeNull();
  });

  it('valida la fecha y devuelve null si no lo es', () => {
    expect(aFechaISO('2026-08-31')).toBe('2026-08-31');
    expect(aFechaISO('')).toBeNull();
    expect(aFechaISO('31/08/2026')).toBeNull();
  });

  it('etiqueta el día sin depender de la zona horaria', () => {
    expect(etiquetaDia('2026-08-31')).toBe('Lunes 31 ago');
    expect(etiquetaDia('2026-09-01')).toBe('Martes 1 sep');
  });
});

describe('partirCelda', () => {
  it('parte por coma y recorta espacios', () => {
    expect(partirCelda('Novela, Cuento ,Poesía')).toEqual(['Novela', 'Cuento', 'Poesía']);
  });

  it('devuelve lista vacía con celda vacía', () => {
    expect(partirCelda('')).toEqual([]);
    expect(partirCelda(undefined)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Escritura: el orden de columnas
// ---------------------------------------------------------------------------

const RESPUESTA: Respuesta = {
  timestamp: '2026-08-31T15:00:00.000Z',
  sessionId: '11111111-2222-4333-8444-555555555555',
  dispositivo: 'movil',
  edad: '26-40',
  generosSel: ['Novela', 'Poesía'],
  tematicasSel: ['Historia y memoria'],
  moodSel: ['Emocionarme'],
  estiloSel: 'Accesible',
  vocesSel: ['Autoras mujeres'],
  actividadesInteresSel: ['Conversatorios'],
  diasAsistenciaSel: ['2026-08-31', '2026-09-01'],
  franjasSel: ['Tarde'],
  origenVisitante: 'Manizales',
  dondeConsigueLibros: ['Librería física', 'Digital'],
  comoSeEntero: ['Redes sociales'],
  matchTopIds: ['AUT001', 'AUT002'],
  autoresClickIds: ['AUT001'],
  autoresRutaIds: ['AUT001'],
  nAutoresRuta: 2,
  conflictosDetectados: 1,
  tiempoTotalSeg: 87,
  pasoAbandono: null,
  completado: true,
  versionApp: '1.0.0',
  feedbackUtil: 1,
  feedbackTexto: 'Muy bueno',
  autorFaltante: 'Alguien',
  temaFaltante: ['Deporte'],
};

describe('aFilaRespuestas', () => {
  it('produce exactamente 28 celdas, una por encabezado', () => {
    expect(ENCABEZADOS_RESPUESTAS).toHaveLength(28);
    expect(aFilaRespuestas(RESPUESTA)).toHaveLength(ENCABEZADOS_RESPUESTAS.length);
  });

  it('coloca cada valor en la columna que le toca', () => {
    const fila = aFilaRespuestas(RESPUESTA);
    const enColumna = (nombre: (typeof ENCABEZADOS_RESPUESTAS)[number]) =>
      fila[ENCABEZADOS_RESPUESTAS.indexOf(nombre)];

    expect(enColumna('session_id')).toBe(RESPUESTA.sessionId);
    expect(enColumna('dispositivo')).toBe('movil');
    expect(enColumna('edad')).toBe('26-40');
    // La hoja real pone `origen_visitante` en la posición 13, no en la 5 como
    // el prompt maestro: manda la hoja.
    expect(enColumna('origen_visitante')).toBe('Manizales');
    expect(enColumna('completado')).toBe('TRUE');
    expect(enColumna('version_app')).toBe('1.0.0');
  });

  it('separa las listas con punto y coma, como pide el encabezado', () => {
    const fila = aFilaRespuestas(RESPUESTA);
    expect(fila[ENCABEZADOS_RESPUESTAS.indexOf('generos_sel')]).toBe('Novela; Poesía');
  });

  it('guarda los días como fecha ISO, no como etiqueta', () => {
    const fila = aFilaRespuestas(RESPUESTA);
    expect(fila[ENCABEZADOS_RESPUESTAS.indexOf('dias_asistencia_sel')]).toBe(
      '2026-08-31; 2026-09-01',
    );
  });

  it('escribe feedback_util como 1/0 y vacío cuando no respondió', () => {
    const i = ENCABEZADOS_RESPUESTAS.indexOf('feedback_util');
    expect(aFilaRespuestas(RESPUESTA)[i]).toBe('1');
    expect(aFilaRespuestas({ ...RESPUESTA, feedbackUtil: 0 })[i]).toBe('0');
    expect(aFilaRespuestas({ ...RESPUESTA, feedbackUtil: null })[i]).toBe('');
  });

  it('deja paso_abandono vacío si la sesión se completó', () => {
    const i = ENCABEZADOS_RESPUESTAS.indexOf('paso_abandono');
    expect(aFilaRespuestas(RESPUESTA)[i]).toBe('');
    expect(aFilaRespuestas({ ...RESPUESTA, pasoAbandono: 3, completado: false })[i]).toBe('3');
  });

  it('no deja ninguna celda como undefined', () => {
    for (const celda of aFilaRespuestas({ ...RESPUESTA, edad: null, estiloSel: null })) {
      expect(typeof celda).toBe('string');
    }
  });
});

describe('aFilaFeedback', () => {
  it('produce 6 celdas, una por encabezado', () => {
    const fila = aFilaFeedback({
      timestamp: RESPUESTA.timestamp,
      sessionId: RESPUESTA.sessionId,
      feedbackUtil: 0,
      feedbackTexto: 'Regular',
      autorFaltante: 'Alguien',
      temaFaltante: ['Deporte', 'Viajes'],
    });
    expect(ENCABEZADOS_FEEDBACK).toHaveLength(6);
    expect(fila).toHaveLength(6);
    expect(fila[2]).toBe('0');
    expect(fila[5]).toBe('Deporte; Viajes');
  });
});

describe('dispositivoDesdeUserAgent', () => {
  it('reconoce móvil, tablet y escritorio', () => {
    expect(dispositivoDesdeUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148')).toBe(
      'movil',
    );
    expect(dispositivoDesdeUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(
      'tablet',
    );
    expect(dispositivoDesdeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(
      'escritorio',
    );
  });

  it('cae a escritorio si no hay user agent', () => {
    expect(dispositivoDesdeUserAgent(null)).toBe('escritorio');
  });
});

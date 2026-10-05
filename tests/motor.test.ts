import { describe, expect, it } from 'vitest';

import { ACTIVIDADES_MOCK, AUTORES_MOCK } from '@/lib/data/mock';
import { conVozDeOrigen } from '@/lib/data/parseo';
import {
  afinidadPublico,
  aPerfilesAutores,
  calcularDesglose,
  calcularMatch,
  calibrar,
  CALIBRACION,
  coberturaDisponibilidad,
  cosenoBinario,
  seleccionarConMMR,
  similitudEntreAutores,
  TOTAL_RESULTADOS,
} from '@/lib/match';
import type { PerfilAutor, PerfilLector } from '@/lib/match';

// Mismo pipeline que `getAutores`: el catálogo llega ya enriquecido con la voz
// que implica la columna `origen`.
const AUTORES = AUTORES_MOCK.map(conVozDeOrigen);
const PERFILES = aPerfilesAutores(AUTORES, ACTIVIDADES_MOCK);

/** Lectora arquetípica: novela y crónica, feminismos, voces locales, tardes. */
const LECTORA: PerfilLector = {
  mood: ['Conectar con mis raíces', 'Emocionarme'],
  generos: ['Novela', 'Crónica/Periodismo'],
  tematicas: ['Feminismos y género', 'Historia y memoria'],
  estilo: 'Accesible',
  voces: ['Autoras mujeres', 'Voces locales (Caldas/Manizales)'],
  edad: '29-40',
  dias: ['2026-10-20', '2026-10-21'],
  franjas: ['Tarde'],
};

const SIN_RESPUESTAS: PerfilLector = {
  mood: [],
  generos: [],
  tematicas: [],
  estilo: null,
  voces: [],
  edad: null,
  dias: [],
  franjas: [],
};

describe('cosenoBinario', () => {
  it('vale 1 para conjuntos idénticos', () => {
    expect(cosenoBinario(['a', 'b'], ['b', 'a'])).toBeCloseTo(1);
  });

  it('vale 0 sin intersección o con un conjunto vacío', () => {
    expect(cosenoBinario(['a'], ['b'])).toBe(0);
    expect(cosenoBinario([], ['b'])).toBe(0);
  });

  it('no cuenta dos veces los duplicados', () => {
    expect(cosenoBinario(['a', 'a'], ['a'])).toBeCloseTo(1);
  });
});

describe('afinidadPublico', () => {
  it('vale 1 cuando la edad cae en el público del autor', () => {
    // 29-40 → "Adulto"
    expect(afinidadPublico('29-40', ['Adulto'])).toBe(1);
  });

  it('baja con la distancia entre públicos', () => {
    const cerca = afinidadPublico('29-40', ['Adulto joven']);
    const lejos = afinidadPublico('29-40', ['Infantil']);
    expect(cerca).toBeGreaterThan(lejos);
  });

  it('es 0 si falta el dato de cualquiera de los dos lados', () => {
    expect(afinidadPublico(null, ['Adulto'])).toBe(0);
    expect(afinidadPublico('29-40', [])).toBe(0);
  });
});

describe('pesos y renormalización (§6.1)', () => {
  it('los pesos efectivos suman 1 cuando se responde todo', () => {
    const desglose = calcularDesglose(LECTORA, PERFILES[0]);
    const suma = Object.values(desglose).reduce((total, c) => total + c.pesoEfectivo, 0);
    expect(suma).toBeCloseTo(1);
  });

  it('respeta las proporciones del prompt maestro', () => {
    const desglose = calcularDesglose(LECTORA, PERFILES[0]);
    // temáticas 1.3 frente a géneros 1.0
    expect(desglose.tematicas.pesoEfectivo / desglose.generos.pesoEfectivo).toBeCloseTo(1.3);
  });

  it('omitir una categoría reparte su peso entre las demás', () => {
    const sinGeneros: PerfilLector = { ...LECTORA, generos: [] };
    const desglose = calcularDesglose(sinGeneros, PERFILES[0]);
    expect(desglose.generos.omitida).toBe(true);
    expect(desglose.generos.pesoEfectivo).toBe(0);
    const suma = Object.values(desglose).reduce((total, c) => total + c.pesoEfectivo, 0);
    expect(suma).toBeCloseTo(1);
  });

  it('el comodín de voces omite la categoría en vez de puntuarla a cero', () => {
    const conComodin: PerfilLector = { ...LECTORA, voces: ['Me da igual, sorpréndeme'] };
    expect(calcularDesglose(conComodin, PERFILES[0]).voces.omitida).toBe(true);
  });

  it('no divide por cero cuando no se respondió nada', () => {
    const desglose = calcularDesglose(SIN_RESPUESTAS, PERFILES[0]);
    for (const categoria of Object.values(desglose)) {
      expect(Number.isFinite(categoria.aporte)).toBe(true);
      expect(categoria.aporte).toBe(0);
    }
  });
});

describe('calibrar (§6.2)', () => {
  it('es la curva 55 + 44 · raw^0.6 del prompt maestro', () => {
    expect(CALIBRACION).toEqual({ PCT_MIN: 55, PCT_MAX: 99, GAMMA: 0.6 });
    expect(calibrar(0.5)).toBe(Math.round(55 + 44 * Math.pow(0.5, 0.6)));
  });

  it('nadie ve 0 %: el suelo es 55 y el techo 99', () => {
    expect(calibrar(0)).toBe(55);
    expect(calibrar(1)).toBe(99);
  });

  it('es monótona creciente', () => {
    let anterior = -1;
    for (let crudo = 0; crudo <= 1; crudo += 0.05) {
      const actual = calibrar(crudo);
      expect(actual).toBeGreaterThanOrEqual(anterior);
      anterior = actual;
    }
  });

  it('acota valores fuera de rango en lugar de romperse', () => {
    expect(calibrar(-1)).toBe(55);
    expect(calibrar(5)).toBe(99);
  });
});

describe('coberturaDisponibilidad', () => {
  const autor = PERFILES.find((p) => p.id === 'AUT001')!;

  it('es 0 si no se eligieron ni días ni franjas', () => {
    expect(coberturaDisponibilidad(SIN_RESPUESTAS, autor)).toBe(0);
  });

  it('sube cuando las actividades caen en los días pedidos', () => {
    const susDias: PerfilLector = { ...SIN_RESPUESTAS, dias: ['2026-10-20', '2026-10-21'] };
    expect(coberturaDisponibilidad(susDias, autor)).toBe(1);
  });

  it('baja cuando solo parte de sus actividades encaja', () => {
    const unDia: PerfilLector = { ...SIN_RESPUESTAS, dias: ['2026-10-20'] };
    expect(coberturaDisponibilidad(unDia, autor)).toBeCloseTo(0.5);
  });
});

describe('similitudEntreAutores (§6.3)', () => {
  const construir = (parcial: Partial<PerfilAutor>): PerfilAutor => ({
    id: 'x',
    mood: [],
    generos: [],
    tematicas: [],
    estilo: null,
    voces: [],
    publico: [],
    generoAutor: null,
    generoDominante: null,
    franjasDisponibles: [],
    ...parcial,
  });

  it('penaliza compartir género del autor', () => {
    const a = construir({ id: 'a', generoAutor: 'F' });
    const b = construir({ id: 'b', generoAutor: 'F' });
    const c = construir({ id: 'c', generoAutor: 'M' });
    expect(similitudEntreAutores(a, b)).toBeGreaterThan(similitudEntreAutores(a, c));
  });

  it('penaliza compartir el género literario dominante', () => {
    const a = construir({ id: 'a', generoDominante: 'Poesía' });
    const b = construir({ id: 'b', generoDominante: 'Poesía' });
    const c = construir({ id: 'c', generoDominante: 'Ensayo' });
    expect(similitudEntreAutores(a, b)).toBeGreaterThan(similitudEntreAutores(a, c));
  });

  it('dos autores sin nada en común no se parecen', () => {
    expect(similitudEntreAutores(construir({ id: 'a' }), construir({ id: 'b' }))).toBe(0);
  });
});

describe('seleccionarConMMR', () => {
  const construir = (id: string, generoDominante: PerfilAutor['generoDominante']): PerfilAutor => ({
    id,
    mood: [],
    generos: generoDominante ? [generoDominante] : [],
    tematicas: [],
    estilo: null,
    voces: [],
    publico: [],
    generoAutor: 'F',
    generoDominante,
    franjasDisponibles: [],
  });

  it('toma el primero por relevancia', () => {
    const elegidos = seleccionarConMMR(
      [
        { autor: construir('a', 'Novela'), relevancia: 0.9 },
        { autor: construir('b', 'Novela'), relevancia: 0.8 },
      ],
      1,
    );
    expect(elegidos[0].id).toBe('a');
  });

  it('prefiere variedad frente a un casi-clon con relevancia parecida', () => {
    const elegidos = seleccionarConMMR(
      [
        { autor: construir('lider', 'Novela'), relevancia: 0.9 },
        { autor: construir('clon', 'Novela'), relevancia: 0.85 },
        { autor: construir('distinto', 'Poesía'), relevancia: 0.82 },
      ],
      2,
    );
    expect(elegidos.map((a) => a.id)).toEqual(['lider', 'distinto']);
  });

  it('no pide más resultados de los que hay', () => {
    expect(seleccionarConMMR([{ autor: construir('a', null), relevancia: 1 }], 5)).toHaveLength(1);
  });
});

describe('calcularMatch', () => {
  it('devuelve el número de resultados configurado', () => {
    expect(calcularMatch(LECTORA, PERFILES)).toHaveLength(TOTAL_RESULTADOS);
  });

  it('no pide más autores de los que hay en el catálogo', () => {
    expect(calcularMatch(LECTORA, PERFILES.slice(0, 3))).toHaveLength(3);
  });

  it('los porcentajes salen ordenados de mayor a menor', () => {
    const porcentajes = calcularMatch(LECTORA, PERFILES).map((r) => r.porcentaje);
    expect([...porcentajes].sort((a, b) => b - a)).toEqual(porcentajes);
  });

  it('es determinista: mismas entradas, mismo resultado', () => {
    expect(calcularMatch(LECTORA, PERFILES)).toEqual(calcularMatch(LECTORA, PERFILES));
  });

  it('no depende del orden del catálogo', () => {
    const alDerecho = calcularMatch(LECTORA, PERFILES).map((r) => r.autorId);
    const alReves = calcularMatch(LECTORA, [...PERFILES].reverse()).map((r) => r.autorId);
    expect(alReves).toEqual(alDerecho);
  });

  it('acierta el arquetipo: la manizaleña de novela y feminismos lidera', () => {
    expect(calcularMatch(LECTORA, PERFILES)[0].autorId).toBe('AUT001');
  });

  it('explica el match con etiquetas que la persona eligió (§6.5)', () => {
    const principal = calcularMatch(LECTORA, PERFILES)[0];
    expect(principal.coincidencias.length).toBeGreaterThan(0);
    const respondidas: string[] = [
      ...LECTORA.mood,
      ...LECTORA.generos,
      ...LECTORA.tematicas,
      ...LECTORA.voces,
      ...(LECTORA.estilo ? [LECTORA.estilo] : []),
    ];
    for (const coincidencia of principal.coincidencias) {
      expect(respondidas).toContain(coincidencia);
    }
  });

  it('fuerza un ranking completo aunque la afinidad sea nula (§6.4)', () => {
    const resultados = calcularMatch(SIN_RESPUESTAS, PERFILES);
    expect(resultados).toHaveLength(TOTAL_RESULTADOS);
    expect(resultados.every((r) => r.porcentaje >= CALIBRACION.PCT_MIN)).toBe(true);
  });

  it('sin semilla no hay serendipia: es puro ranking', () => {
    const resultados = calcularMatch(LECTORA, PERFILES);
    expect(resultados.every((r) => r.esSerendipia === false)).toBe(true);
  });

  it('un perfil de ciencia y tecnología no da el mismo primer puesto', () => {
    const cientifico: PerfilLector = {
      ...SIN_RESPUESTAS,
      generos: ['Ensayo'],
      tematicas: ['Ciencia y tecnología'],
      estilo: 'Académico',
      edad: '41-60',
    };
    expect(calcularMatch(cientifico, PERFILES)[0].autorId).not.toBe('AUT001');
  });

  it('el origen de la hoja pesa como voz aunque no esté en la columna `voces`', () => {
    // AUT006 (Sergio Betancur) es "Local" y su columna `voces` va vacía en el
    // mock; `getAutores` le añade "Voces locales (Caldas/Manizales)".
    const perfil = PERFILES.find((p) => p.id === 'AUT006')!;
    expect(perfil.voces).toContain('Voces locales (Caldas/Manizales)');
  });
});

/**
 * Comodines de serendipia (§6.4) y azar sembrado.
 *
 * Lo que se protege aquí es la propiedad más fácil de romper sin darse cuenta:
 * que el resultado siga siendo reproducible para la misma persona. Si eso se
 * pierde, "Mi último match" empieza a mostrar autores distintos cada vez.
 */

import { describe, expect, it } from 'vitest';

import { ACTIVIDADES_MOCK, AUTORES_MOCK } from '@/lib/data/mock';
import { conVozDeOrigen } from '@/lib/data/parseo';
import {
  aPerfilesAutores,
  barajar,
  calcularMatch,
  candidatosSerendipia,
  COMODINES_SERENDIPIA,
  elegirSerendipia,
  generadorAleatorio,
  MAX_TAGS_SERENDIPIA,
  semillaDesdeTexto,
  TOTAL_RESULTADOS,
} from '@/lib/match';
import type { PerfilLector } from '@/lib/match';

const PERFILES = aPerfilesAutores(AUTORES_MOCK.map(conVozDeOrigen), ACTIVIDADES_MOCK);

const LECTORA: PerfilLector = {
  mood: ['Conectar con mis raíces', 'Emocionarme'],
  generos: ['Novela', 'Crónica/Periodismo'],
  tematicas: ['Feminismos y género', 'Historia y memoria'],
  estilo: 'Accesible',
  voces: ['Autoras mujeres', 'Voces locales (Caldas/Manizales)'],
  edad: '26-40',
  actividades: ['Conversatorios'],
  dias: ['2026-10-20', '2026-10-21'],
  franjas: ['Tarde'],
};

const SEMILLA = '11111111-2222-4333-8444-555555555555';
const OTRA_SEMILLA = '99999999-8888-4777-8666-555555555555';

describe('azar sembrado', () => {
  it('la misma semilla da siempre la misma secuencia', () => {
    const a = generadorAleatorio(semillaDesdeTexto(SEMILLA));
    const b = generadorAleatorio(semillaDesdeTexto(SEMILLA));
    const secuencia = (g: () => number) => Array.from({ length: 5 }, g);
    expect(secuencia(a)).toEqual(secuencia(b));
  });

  it('semillas distintas dan secuencias distintas', () => {
    const a = generadorAleatorio(semillaDesdeTexto(SEMILLA));
    const b = generadorAleatorio(semillaDesdeTexto(OTRA_SEMILLA));
    expect(Array.from({ length: 5 }, a)).not.toEqual(Array.from({ length: 5 }, b));
  });

  it('los números caen en [0, 1)', () => {
    const g = generadorAleatorio(semillaDesdeTexto(SEMILLA));
    for (let i = 0; i < 200; i += 1) {
      const n = g();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });

  it('barajar conserva todos los elementos y no muta el original', () => {
    const original = ['a', 'b', 'c', 'd', 'e'];
    const copia = [...original];
    const barajada = barajar(original, generadorAleatorio(semillaDesdeTexto(SEMILLA)));
    expect(original).toEqual(copia);
    expect([...barajada].sort()).toEqual([...original].sort());
  });
});

describe('candidatosSerendipia', () => {
  it('solo admite autores que comparten pocos tags', () => {
    const candidatos = candidatosSerendipia(LECTORA, PERFILES, new Set());
    for (const autor of candidatos) {
      const comunes = [
        ...LECTORA.tematicas.filter((t) => autor.tematicas.includes(t)),
        ...LECTORA.generos.filter((g) => autor.generos.includes(g)),
        ...LECTORA.voces.filter((v) => autor.voces.includes(v)),
        ...LECTORA.mood.filter((m) => autor.mood.includes(m)),
        ...(LECTORA.estilo === autor.estilo && LECTORA.estilo ? [LECTORA.estilo] : []),
      ];
      const unicos = new Set(comunes).size;
      expect(unicos).toBeGreaterThanOrEqual(1);
      expect(unicos).toBeLessThanOrEqual(MAX_TAGS_SERENDIPIA);
    }
  });

  it('excluye a los que ya entraron por afinidad', () => {
    const yaElegidos = new Set(['AUT001', 'AUT006']);
    const candidatos = candidatosSerendipia(LECTORA, PERFILES, yaElegidos);
    expect(candidatos.map((a) => a.id)).not.toContain('AUT001');
    expect(candidatos.map((a) => a.id)).not.toContain('AUT006');
  });

  it('no propone a nadie si la persona no respondió nada', () => {
    const sinRespuestas: PerfilLector = {
      mood: [], generos: [], tematicas: [], estilo: null, voces: [],
      edad: null, actividades: [], dias: [], franjas: [],
    };
    expect(candidatosSerendipia(sinRespuestas, PERFILES, new Set())).toEqual([]);
  });
});

describe('elegirSerendipia', () => {
  const candidatos = candidatosSerendipia(LECTORA, PERFILES, new Set());

  it('devuelve la cantidad pedida', () => {
    expect(elegirSerendipia(candidatos, 2, SEMILLA)).toHaveLength(2);
  });

  it('la misma semilla elige a los mismos autores', () => {
    const a = elegirSerendipia(candidatos, 2, SEMILLA).map((x) => x.id);
    const b = elegirSerendipia(candidatos, 2, SEMILLA).map((x) => x.id);
    expect(a).toEqual(b);
  });

  it('no depende del orden en que venga el catálogo', () => {
    const a = elegirSerendipia(candidatos, 2, SEMILLA).map((x) => x.id);
    const b = elegirSerendipia([...candidatos].reverse(), 2, SEMILLA).map((x) => x.id);
    expect(b).toEqual(a);
  });

  it('no se rompe si no hay candidatos ni si se piden cero', () => {
    expect(elegirSerendipia([], 2, SEMILLA)).toEqual([]);
    expect(elegirSerendipia(candidatos, 0, SEMILLA)).toEqual([]);
  });

  it('no pide más de los que hay', () => {
    expect(elegirSerendipia(candidatos.slice(0, 1), 5, SEMILLA)).toHaveLength(1);
  });
});

describe('calcularMatch con serendipia', () => {
  const conSemilla = () => calcularMatch(LECTORA, PERFILES, { semilla: SEMILLA });

  it('sigue devolviendo el total configurado', () => {
    expect(conSemilla()).toHaveLength(TOTAL_RESULTADOS);
  });

  it('incluye comodines marcados como tales', () => {
    const marcados = conSemilla().filter((r) => r.esSerendipia);
    expect(marcados.length).toBeGreaterThan(0);
    expect(marcados.length).toBeLessThanOrEqual(COMODINES_SERENDIPIA);
  });

  it('el match principal nunca es un comodín', () => {
    expect(conSemilla()[0].esSerendipia).toBe(false);
  });

  it('es reproducible: la misma sesión ve siempre lo mismo', () => {
    expect(conSemilla()).toEqual(conSemilla());
  });

  /**
   * La variedad entre personas se prueba sobre `elegirSerendipia` y no sobre el
   * catálogo de ejemplo: con 20 autores y 16 resultados apenas quedan dos
   * candidatos, así que todas las semillas eligen forzosamente los mismos. En la
   * feria real hay ~300 autores y sí hay de dónde escoger.
   */
  it('con un catálogo amplio, semillas distintas eligen autores distintos', () => {
    const pool = PERFILES.map((autor, i) => ({ ...autor, id: `SYN${i}` }));
    const elegidos = new Set(
      Array.from({ length: 12 }, (_, i) =>
        elegirSerendipia(pool, 2, `sesion-${i}`)
          .map((a) => a.id)
          .join(','),
      ),
    );
    expect(elegidos.size).toBeGreaterThan(1);
  });

  it('no repite autores', () => {
    const ids = conSemilla().map((r) => r.autorId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sigue ordenando los porcentajes de mayor a menor', () => {
    const porcentajes = conSemilla().map((r) => r.porcentaje);
    expect([...porcentajes].sort((a, b) => b - a)).toEqual(porcentajes);
  });

  it('los comodines no desplazan al mejor match por afinidad', () => {
    const sin = calcularMatch(LECTORA, PERFILES)[0].autorId;
    expect(conSemilla()[0].autorId).toBe(sin);
  });
});

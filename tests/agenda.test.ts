import { describe, expect, it } from 'vitest';

import {
  autoresEnAgenda,
  construirAgenda,
  contarConflictos,
  contarItems,
  diasDelEvento,
  seCruzan,
  textoAgenda,
  tieneConflictos,
} from '@/lib/agenda';
import { ACTIVIDADES_MOCK, AUTORES_MOCK } from '@/lib/data/mock';
import type { Actividad } from '@/lib/data/types';
import { DIAS_POR_DEFECTO } from '@/lib/vocabulario';

const actividad = (parcial: Partial<Actividad>): Actividad => ({
  id: 'X',
  autorIds: ['AUT001'],
  titulo: 'Actividad',
  tipo: 'Conversatorios',
  fecha: '2026-10-20',
  inicioMin: 16 * 60,
  finMin: 17 * 60,
  lugar: 'Sala',
  descripcion: '',
  activo: true,
  ...parcial,
});

describe('seCruzan', () => {
  it('detecta un solapamiento parcial el mismo día', () => {
    const a = actividad({ id: 'a', inicioMin: 16 * 60, finMin: 17 * 60 });
    const b = actividad({ id: 'b', inicioMin: 16 * 60 + 30, finMin: 17 * 60 + 30 });
    expect(seCruzan(a, b)).toBe(true);
  });

  it('no cruza si una empieza justo cuando la otra termina', () => {
    const a = actividad({ id: 'a', inicioMin: 16 * 60, finMin: 17 * 60 });
    const b = actividad({ id: 'b', inicioMin: 17 * 60, finMin: 18 * 60 });
    expect(seCruzan(a, b)).toBe(false);
  });

  it('no cruza si son días distintos aunque la hora coincida', () => {
    const a = actividad({ id: 'a', fecha: '2026-10-20' });
    const b = actividad({ id: 'b', fecha: '2026-10-21' });
    expect(seCruzan(a, b)).toBe(false);
  });

  it('una actividad no se cruza consigo misma', () => {
    const a = actividad({ id: 'a' });
    expect(seCruzan(a, a)).toBe(false);
  });
});

describe('diasDelEvento', () => {
  it('deriva los días de las fechas de la programación, ordenados', () => {
    const dias = diasDelEvento(ACTIVIDADES_MOCK);
    expect(dias[0]).toBe('2026-10-19');
    expect(dias.at(-1)).toBe('2026-10-25');
    expect([...dias].sort()).toEqual(dias);
  });

  it('cae a los siete días de la feria si aún no hay nada programado', () => {
    expect(diasDelEvento([])).toEqual(DIAS_POR_DEFECTO);
  });
});

describe('construirAgenda', () => {
  it('marca el cruce del mock (ACT001 4:00 pm vs ACT003 4:30 pm, 20 oct)', () => {
    const agenda = construirAgenda(['ACT001', 'ACT003'], ACTIVIDADES_MOCK, AUTORES_MOCK);
    expect(tieneConflictos(agenda)).toBe(true);
    const items = agenda[0].items;
    expect(items.every((item) => item.conflicto)).toBe(true);
    expect(items[0].chocaCon).toContain(items[1].id);
  });

  it('cuenta cada cruce una sola vez', () => {
    const agenda = construirAgenda(['ACT001', 'ACT003'], ACTIVIDADES_MOCK, AUTORES_MOCK);
    expect(contarConflictos(agenda)).toBe(1);
  });

  it('no marca conflicto cuando las actividades son de días distintos', () => {
    const agenda = construirAgenda(['ACT001', 'ACT002'], ACTIVIDADES_MOCK, AUTORES_MOCK);
    expect(tieneConflictos(agenda)).toBe(false);
    expect(contarConflictos(agenda)).toBe(0);
  });

  it('agrupa por día en orden cronológico, no alfabético', () => {
    const agenda = construirAgenda(['ACT002', 'ACT008'], ACTIVIDADES_MOCK, AUTORES_MOCK);
    expect(agenda.map((dia) => dia.fecha)).toEqual(['2026-10-19', '2026-10-21']);
    expect(agenda.map((dia) => dia.etiqueta)).toEqual(['Lunes 19 oct', 'Miércoles 21 oct']);
  });

  it('ordena las actividades del día por hora de inicio', () => {
    const agenda = construirAgenda(['ACT003', 'ACT001'], ACTIVIDADES_MOCK, AUTORES_MOCK);
    const horas = agenda[0].items.map((item) => item.inicioMin);
    expect(horas).toEqual([...horas].sort((a, b) => a - b));
  });

  it('resuelve los nombres de los autores y la hora legible', () => {
    const [dia] = construirAgenda(['ACT001'], ACTIVIDADES_MOCK, AUTORES_MOCK);
    expect(dia.items[0].autoresNombres).toEqual(['Valentina Ríos']);
    expect(dia.items[0].horaTexto).toBe('4:00 pm');
    expect(dia.items[0].diaTexto).toBe('Martes 20 oct');
  });

  it('resuelve las actividades con varios autores', () => {
    const [dia] = construirAgenda(['ACT021'], ACTIVIDADES_MOCK, AUTORES_MOCK);
    expect(dia.items[0].autoresNombres).toEqual(['Mariana Ocampo', 'Paola Restrepo']);
    expect(autoresEnAgenda([dia]).sort()).toEqual(['AUT015', 'AUT020']);
  });

  it('ignora ids que no existen en la programación', () => {
    const agenda = construirAgenda(['ACT001', 'NO-EXISTE'], ACTIVIDADES_MOCK, AUTORES_MOCK);
    expect(contarItems(agenda)).toBe(1);
  });

  it('con la agenda vacía devuelve una lista vacía', () => {
    expect(construirAgenda([], ACTIVIDADES_MOCK, AUTORES_MOCK)).toEqual([]);
  });
});

describe('textoAgenda', () => {
  it('incluye día, hora, título, autores y lugar', () => {
    const texto = textoAgenda(construirAgenda(['ACT001'], ACTIVIDADES_MOCK, AUTORES_MOCK));
    expect(texto).toContain('20 OCT');
    expect(texto).toContain('4:00 pm');
    expect(texto).toContain('Cartografías de la intimidad');
    expect(texto).toContain('Valentina Ríos');
    expect(texto).toContain('Sala Fundadores');
  });

  it('lista los dos autores de una actividad compartida', () => {
    const texto = textoAgenda(construirAgenda(['ACT021'], ACTIVIDADES_MOCK, AUTORES_MOCK));
    expect(texto).toContain('Mariana Ocampo, Paola Restrepo');
  });
});

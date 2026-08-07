import { describe, expect, it } from 'vitest';
import { eachDayInRange, getPeriodRange, getRollingRange } from './getPeriodRange';

/**
 * Los bordes de periodo son donde vive el error silencioso: un rango que se
 * queda corto por un día no da error, sólo da una cifra ligeramente mal, y
 * nadie lo nota hasta que cuadra mal el mes.
 */

describe('getPeriodRange — día', () => {
  it('un día es él mismo, no un rango abierto', () => {
    expect(getPeriodRange('day', '2026-08-06')).toEqual({ from: '2026-08-06', to: '2026-08-06' });
  });
});

describe('getPeriodRange — semana (empieza en lunes)', () => {
  it('un jueves pertenece a la semana que empieza el lunes anterior', () => {
    // 2026-08-06 es jueves.
    expect(getPeriodRange('week', '2026-08-06')).toEqual({
      from: '2026-08-03',
      to: '2026-08-09',
    });
  });

  it('el propio lunes es el primer día de su semana, no el último de la anterior', () => {
    expect(getPeriodRange('week', '2026-08-03').from).toBe('2026-08-03');
  });

  it('el domingo cierra la semana (convenio es-CO, no el domingo-primero de EE.UU.)', () => {
    // Si la semana empezara en domingo, el 9 abriría semana en vez de cerrarla.
    expect(getPeriodRange('week', '2026-08-09')).toEqual({
      from: '2026-08-03',
      to: '2026-08-09',
    });
  });

  it('una semana que cruza el cambio de año no se parte', () => {
    // 2026-01-01 es jueves: su semana empieza el lunes 29 de diciembre.
    expect(getPeriodRange('week', '2026-01-01')).toEqual({
      from: '2025-12-29',
      to: '2026-01-04',
    });
  });
});

describe('getPeriodRange — mes', () => {
  it('cubre el mes completo, del 1 al último día', () => {
    expect(getPeriodRange('month', '2026-08-06')).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    });
  });

  it('acierta el último día de un mes de 30', () => {
    expect(getPeriodRange('month', '2026-04-15').to).toBe('2026-04-30');
  });

  it('febrero de un año NO bisiesto acaba el 28', () => {
    expect(getPeriodRange('month', '2026-02-10').to).toBe('2026-02-28');
  });

  it('febrero de un año bisiesto acaba el 29', () => {
    expect(getPeriodRange('month', '2028-02-10').to).toBe('2028-02-29');
  });
});

describe('getPeriodRange — año', () => {
  it('va del 1 de enero al 31 de diciembre', () => {
    expect(getPeriodRange('year', '2026-08-06')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  it('el 1 de enero pertenece a su propio año', () => {
    expect(getPeriodRange('year', '2026-01-01').from).toBe('2026-01-01');
  });
});

describe('getRollingRange — ventana móvil de la gráfica de tendencia', () => {
  it('14 días incluyen hoy y trece hacia atrás', () => {
    expect(getRollingRange(14, '2026-08-06')).toEqual({ from: '2026-07-24', to: '2026-08-06' });
  });

  it('una ventana de 1 día es sólo hoy', () => {
    expect(getRollingRange(1, '2026-08-06')).toEqual({ from: '2026-08-06', to: '2026-08-06' });
  });

  it('cruza el cambio de mes sin saltarse días', () => {
    const range = getRollingRange(7, '2026-08-03');
    expect(range).toEqual({ from: '2026-07-28', to: '2026-08-03' });
    expect(eachDayInRange(range)).toHaveLength(7);
  });
});

describe('eachDayInRange', () => {
  it('devuelve todos los días, ambos extremos incluidos', () => {
    expect(eachDayInRange({ from: '2026-08-01', to: '2026-08-05' })).toEqual([
      '2026-08-01',
      '2026-08-02',
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
    ]);
  });

  it('un rango de un solo día devuelve ese día', () => {
    expect(eachDayInRange({ from: '2026-08-06', to: '2026-08-06' })).toEqual(['2026-08-06']);
  });

  it('incluye el 29 de febrero de un año bisiesto', () => {
    expect(eachDayInRange({ from: '2028-02-27', to: '2028-03-01' })).toEqual([
      '2028-02-27',
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ]);
  });

  it('un rango invertido devuelve vacío en vez de colgarse', () => {
    expect(eachDayInRange({ from: '2026-08-10', to: '2026-08-01' })).toEqual([]);
  });

  it('un año completo son 365 días', () => {
    expect(eachDayInRange({ from: '2026-01-01', to: '2026-12-31' })).toHaveLength(365);
  });
});

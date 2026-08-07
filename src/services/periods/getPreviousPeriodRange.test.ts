import { describe, expect, it } from 'vitest';
import { getPreviousPeriodRange } from './getPreviousPeriodRange';

describe('getPreviousPeriodRange — el recorte al mismo tramo', () => {
  /**
   * EL MOTIVO DE TODO EL MÓDULO. Sin recortar, el 7 de agosto compararía sus
   * siete días contra los treinta y uno de julio: un "−58%" y un cartel de
   * enhorabuena por llevar poco mes, que se dará la vuelta solo el día 31.
   */
  it('un mes en curso se compara contra los MISMOS días del anterior', () => {
    const { current, previous, elapsedDays } = getPreviousPeriodRange('month', '2026-08-07');
    expect(current).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(previous).toEqual({ from: '2026-07-01', to: '2026-07-07' });
    expect(elapsedDays).toBe(7);
  });

  it('una semana en curso se compara contra el mismo tramo de la anterior', () => {
    // 2026-08-07 es viernes; la semana empieza en lunes (WEEK_STARTS_ON = 1).
    const { current, previous, elapsedDays } = getPreviousPeriodRange('week', '2026-08-07');
    expect(current.from).toBe('2026-08-03');
    expect(previous).toEqual({ from: '2026-07-27', to: '2026-07-31' });
    expect(elapsedDays).toBe(5);
  });

  it('un año en curso se compara contra el mismo número de días del anterior', () => {
    const { previous, elapsedDays } = getPreviousPeriodRange('year', '2026-08-07');
    expect(previous.from).toBe('2025-01-01');
    expect(previous.to).toBe('2025-08-07');
    expect(elapsedDays).toBe(219);
  });

  it('un día se compara contra el día anterior, completo', () => {
    const { current, previous, sameLength, isPartial } = getPreviousPeriodRange('day', '2026-08-07');
    expect(current).toEqual({ from: '2026-08-07', to: '2026-08-07' });
    expect(previous).toEqual({ from: '2026-08-06', to: '2026-08-06' });
    expect(sameLength).toBe(true);
    expect(isPartial).toBe(false);
  });

  it('un mes ya terminado se compara entero contra entero', () => {
    const { current, previous, isPartial } = getPreviousPeriodRange('month', '2026-07-31');
    expect(current.to).toBe('2026-07-31');
    expect(previous).toEqual({ from: '2026-06-01', to: '2026-06-30' });
    // Cerrado: el rótulo dirá "vs. el mes pasado", no "vs. mismos días".
    expect(isPartial).toBe(false);
  });

  /**
   * `sameLength` NO significa "la comparación es justa", y es fácil leerlo así.
   * Julio completo (31 días) contra junio completo (30) da `false` y es la
   * comparación mensual de toda la vida: avisar cada mes de 31 días sería
   * ruido. Lo que importa de verdad es `isPartial && !sameLength`.
   */
  it('meses de distinta duración: sameLength es false pero NO es un aviso', () => {
    const r = getPreviousPeriodRange('month', '2026-07-31');
    expect(r.sameLength).toBe(false);
    expect(r.isPartial).toBe(false);
  });

  it('el 30 de marzo SÍ es un aviso: 30 días transcurridos contra 28 de febrero', () => {
    const r = getPreviousPeriodRange('month', '2026-03-30');
    expect(r.elapsedDays).toBe(30);
    expect(r.previousDays).toBe(28);
    expect(r.isPartial).toBe(true);
    expect(r.sameLength).toBe(false);
  });

  it('un mes a mitad de camino es parcial', () => {
    expect(getPreviousPeriodRange('month', '2026-08-07').isPartial).toBe(true);
  });
});

describe('getPreviousPeriodRange — los bordes del calendario', () => {
  /**
   * "Truncar hasta el mismo día del mes" se rompe solo: el 31 de marzo no
   * existe en febrero. Contando días transcurridos, el recorte topa con el
   * final de febrero sin necesitar ningún caso especial.
   */
  it('31 de marzo contra febrero: se detiene el 28 y lo declara', () => {
    const r = getPreviousPeriodRange('month', '2026-03-31');
    expect(r.previous).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(r.elapsedDays).toBe(31);
    expect(r.previousDays).toBe(28);
    // La comparación NO es de igual a igual, y hay que poder decirlo.
    expect(r.sameLength).toBe(false);
    // El 31 de marzo, marzo está cerrado: es la comparación mensual normal.
    expect(r.isPartial).toBe(false);
  });

  it('en año bisiesto febrero llega hasta el 29', () => {
    const r = getPreviousPeriodRange('month', '2024-03-31');
    expect(r.previous.to).toBe('2024-02-29');
    expect(r.previousDays).toBe(29);
  });

  it('el 1 de enero compara contra el 1 de diciembre del año anterior', () => {
    const r = getPreviousPeriodRange('month', '2026-01-01');
    expect(r.current.from).toBe('2026-01-01');
    expect(r.previous).toEqual({ from: '2025-12-01', to: '2025-12-01' });
    expect(r.sameLength).toBe(true);
  });

  it('el 1 de enero, en anual, compara contra el 1 de enero anterior', () => {
    const r = getPreviousPeriodRange('year', '2026-01-01');
    expect(r.previous).toEqual({ from: '2025-01-01', to: '2025-01-01' });
  });

  it('una semana que cruza el cambio de año no se descuadra', () => {
    // 2026-01-01 es jueves: la semana empezó el lunes 29 de diciembre.
    const r = getPreviousPeriodRange('week', '2026-01-01');
    expect(r.current.from).toBe('2025-12-29');
    expect(r.previous.from).toBe('2025-12-22');
    expect(r.elapsedDays).toBe(4);
    expect(r.previousDays).toBe(4);
  });

  it('el 29 de febrero de un bisiesto compara contra el año anterior sin romperse', () => {
    const r = getPreviousPeriodRange('year', '2024-02-29');
    expect(r.previous.from).toBe('2023-01-01');
    // 60 días transcurridos de 2024; 60 días de 2023 terminan el 1 de marzo.
    expect(r.elapsedDays).toBe(60);
    expect(r.previous.to).toBe('2023-03-01');
    // Se comparan 60 días contra 60 días: es lo correcto para sumar gastos,
    // aunque la fecha final no coincida en el calendario.
    expect(r.sameLength).toBe(true);
  });

  it('el primer día de un mes compara contra un solo día del anterior', () => {
    const r = getPreviousPeriodRange('month', '2026-08-01');
    expect(r.previous).toEqual({ from: '2026-07-01', to: '2026-07-01' });
    expect(r.elapsedDays).toBe(1);
  });

  it('el rango anterior nunca sale invertido', () => {
    for (const fecha of ['2026-01-01', '2026-02-28', '2024-02-29', '2026-12-31', '2026-08-07']) {
      for (const periodo of ['day', 'week', 'month', 'year'] as const) {
        const { previous } = getPreviousPeriodRange(periodo, fecha);
        expect(previous.from <= previous.to).toBe(true);
      }
    }
  });
});

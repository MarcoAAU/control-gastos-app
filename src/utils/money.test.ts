import { describe, expect, it } from 'vitest';
import {
  formatAmountInput,
  formatMoney,
  formatSignedMoney,
  parseAmountInput,
  toAmountInputValue,
} from './money';

/**
 * El separador de miles en vivo es un requisito EXPLÍCITO del usuario, ya
 * resuelto en v1 y fácil de perder al reescribir. Estos tests existen para que
 * no se pierda.
 */

describe('formatMoney — paridad con fmtMoney de v1', () => {
  it('agrupa los miles con punto, al estilo es-CO', () => {
    expect(formatMoney(1250000)).toBe('$1.250.000');
    expect(formatMoney(45000)).toBe('$45.000');
    expect(formatMoney(999)).toBe('$999');
  });

  it('pone el signo delante del símbolo, como v1', () => {
    expect(formatMoney(-420000)).toBe('-$420.000');
  });

  it('redondea: el peso colombiano no usa céntimos', () => {
    expect(formatMoney(1000.4)).toBe('$1.000');
    expect(formatMoney(1000.6)).toBe('$1.001');
  });

  it('no muestra "$NaN" ante un valor inválido', () => {
    expect(formatMoney(Number.NaN)).toBe('$0');
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe('$0');
  });

  it('formatea el cero', () => {
    expect(formatMoney(0)).toBe('$0');
  });
});

describe('formatSignedMoney', () => {
  it('distingue ingreso de gasto con el signo', () => {
    expect(formatSignedMoney(400000, 'income')).toBe('+$400.000');
    expect(formatSignedMoney(150000, 'expense')).toBe('-$150.000');
  });

  it('el importe se guarda positivo, así que el signo lo pone el tipo', () => {
    expect(formatSignedMoney(150000, 'expense')).toBe('-$150.000');
  });
});

describe('formatAmountInput — separadores mientras se escribe', () => {
  it('agrupa según se teclea', () => {
    expect(formatAmountInput('1')).toBe('1');
    expect(formatAmountInput('12')).toBe('12');
    expect(formatAmountInput('1234')).toBe('1.234');
    expect(formatAmountInput('1234567')).toBe('1.234.567');
  });

  it('ignora lo que no sea dígito: da igual pegar "$ 1.250.000"', () => {
    expect(formatAmountInput('$ 1.250.000')).toBe('1.250.000');
    expect(formatAmountInput('abc123')).toBe('123');
  });

  it('devuelve cadena vacía si no hay dígitos', () => {
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('abc')).toBe('');
  });

  it('sólo admite negativo cuando se le permite (ajustes de saldo)', () => {
    expect(formatAmountInput('-5000', true)).toBe('-5.000');
    expect(formatAmountInput('-5000', false)).toBe('5.000');
  });

  it('deja escribir el signo menos antes del primer dígito', () => {
    expect(formatAmountInput('-', true)).toBe('-');
  });
});

describe('parseAmountInput', () => {
  it('recupera el número del texto formateado', () => {
    expect(parseAmountInput('1.250.000')).toBe(1250000);
    expect(parseAmountInput('45.000')).toBe(45000);
  });

  it('devuelve null —y no NaN— si no hay número', () => {
    // NaN se propagaría en silencio hasta acabar como "$NaN" en pantalla.
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
    expect(parseAmountInput('-')).toBeNull();
  });

  it('respeta el negativo cuando se permite', () => {
    expect(parseAmountInput('-5.000', true)).toBe(-5000);
    expect(parseAmountInput('-5.000', false)).toBe(5000);
  });

  it('hace ida y vuelta con formatAmountInput', () => {
    for (const value of [1, 999, 1000, 45000, 1250000, 999999999]) {
      expect(parseAmountInput(formatAmountInput(String(value)))).toBe(value);
    }
  });
});

describe('toAmountInputValue', () => {
  it('prepara el campo al editar un movimiento existente', () => {
    expect(toAmountInputValue(1250000)).toBe('1.250.000');
  });

  it('deja el campo vacío ante ausencia de valor', () => {
    expect(toAmountInputValue(null)).toBe('');
    expect(toAmountInputValue(undefined)).toBe('');
    expect(toAmountInputValue(Number.NaN)).toBe('');
  });
});

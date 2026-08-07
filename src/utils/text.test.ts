import { describe, expect, it } from 'vitest';
import { normalizeText, tokenizeQuery } from './text';

describe('normalizeText', () => {
  it('quita las tildes', () => {
    // Es LA razón de existir de esta función: nadie escribe "café" con tilde
    // mientras busca en el móvil.
    expect(normalizeText('Café')).toBe('cafe');
    expect(normalizeText('Cumpleaños')).toBe('cumpleanos');
    expect(normalizeText('Bogotá')).toBe('bogota');
  });

  it('pasa a minúsculas', () => {
    expect(normalizeText('MERCADO')).toBe('mercado');
  });

  it('deja intacto lo que ya está normalizado', () => {
    expect(normalizeText('taxi')).toBe('taxi');
  });

  it('no rompe con cadena vacía', () => {
    expect(normalizeText('')).toBe('');
  });

  it('la ñ se vuelve n — efecto colateral aceptado y documentado', () => {
    // Buscar "nino" debe encontrar "niño". El dato guardado no se toca.
    expect(normalizeText('niño')).toBe(normalizeText('nino'));
  });
});

describe('tokenizeQuery', () => {
  it('trocea por palabras', () => {
    expect(tokenizeQuery('taxi aeropuerto')).toEqual(['taxi', 'aeropuerto']);
  });

  it('ignora los espacios sobrantes', () => {
    expect(tokenizeQuery('  taxi   aeropuerto  ')).toEqual(['taxi', 'aeropuerto']);
  });

  it('una consulta vacía no produce ninguna palabra', () => {
    // Importa: cero palabras significa "sin criterio", y por eso la lista
    // entera pasa el filtro en vez de quedarse vacía.
    expect(tokenizeQuery('')).toEqual([]);
    expect(tokenizeQuery('   ')).toEqual([]);
  });

  it('normaliza cada palabra', () => {
    expect(tokenizeQuery('Café Bogotá')).toEqual(['cafe', 'bogota']);
  });
});

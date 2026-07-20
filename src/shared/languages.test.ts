import { describe, expect, it } from 'vitest';
import { AUTO_DETECT, LANGUAGES, getLanguage } from './languages';

describe('languages', () => {
  it('includes an auto-detect entry matching AUTO_DETECT', () => {
    expect(LANGUAGES.some((l) => l.code === AUTO_DETECT)).toBe(true);
  });

  it('has unique language codes', () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('resolves a known language', () => {
    expect(getLanguage('es').label).toBe('Spanish');
  });

  it('throws on an unknown language code', () => {
    expect(() => getLanguage('xx')).toThrow();
  });
});

import { normalizeTag, normalizeTags } from './tag-normalize';

describe('tag-normalize', () => {
  it('une las etiquetas bilingües en su forma en español', () => {
    expect(normalizeTag('arquitectura')).toBe('arquitectura');
    expect(normalizeTag('Architecture')).toBe('arquitectura');
    expect(normalizeTag('design')).toBe('diseno');
    expect(normalizeTag('journal')).toBe('diario');
    expect(normalizeTag('typography')).toBe('tipografia');
  });

  it('leaves distinct technical tags alone', () => {
    expect(normalizeTag('dotnet')).toBe('dotnet');
    expect(normalizeTag('nestjs')).toBe('nestjs');
  });

  it('deduplicates a mixed list', () => {
    expect(normalizeTags(['arquitectura', 'architecture', 'Angular', 'nestjs'])).toEqual([
      'angular',
      'arquitectura',
      'nestjs',
    ]);
  });
});

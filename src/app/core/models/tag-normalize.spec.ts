import { normalizeTag, normalizeTags } from './tag-normalize';

describe('tag-normalize', () => {
  it('collapses bilingual architecture tags', () => {
    expect(normalizeTag('arquitectura')).toBe('architecture');
    expect(normalizeTag('Architecture')).toBe('architecture');
  });

  it('leaves distinct technical tags alone', () => {
    expect(normalizeTag('dotnet')).toBe('dotnet');
    expect(normalizeTag('nestjs')).toBe('nestjs');
  });

  it('deduplicates a mixed list', () => {
    expect(normalizeTags(['arquitectura', 'architecture', 'Angular', 'nestjs'])).toEqual([
      'angular',
      'architecture',
      'nestjs',
    ]);
  });
});

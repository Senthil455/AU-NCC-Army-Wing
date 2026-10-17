import { describe, it, expect } from 'vitest';
import { parseColumns } from '../src/modules/cadets/service.js';

describe('cadet export columns', () => {
  it('accepts default whitelist', () => {
    expect(parseColumns('name,regdNo', undefined, 'OFFICER_ANO_CTO')).toEqual(['name', 'regdNo']);
  });
  it('rejects unknown columns', () => {
    expect(() => parseColumns('name,aadhaar', undefined, 'OFFICER_ANO_CTO')).toThrow();
  });
  it('blocks sensitive columns for non-officers', () => {
    expect(() => parseColumns('name,phone', undefined, 'CADET')).toThrow();
  });
});

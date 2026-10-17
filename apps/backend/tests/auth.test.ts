import { describe, it, expect } from 'vitest';
import { loginSchema } from '../src/modules/auth/validators.js';

describe('auth validators', () => {
  it('accepts AU email or regd no login', () => {
    expect(loginSchema.parse({ emailOrRegdNo: 'ano@annauniv.edu', password: 'x' }).emailOrRegdNo).toBe('ano@annauniv.edu');
    expect(loginSchema.parse({ emailOrRegdNo: '2023CS001', password: 'x' }).emailOrRegdNo).toBe('2023CS001');
  });
  it('rejects empty password', () => {
    expect(() => loginSchema.parse({ emailOrRegdNo: 'a', password: '' })).toThrow();
  });
});

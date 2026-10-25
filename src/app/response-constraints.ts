import { Field, supportsPattern } from './project.model';

export type LengthViolation = 'minimum' | 'maximum';

/** Programmatic values do not reliably set native tooShort/tooLong flags. */
export function responseLengthViolation(field: Field, value: string): LengthViolation | null {
  if (!supportsPattern(field) || !value) return null;
  if (field.minLength && value.length < field.minLength) return 'minimum';
  if (field.maxLength && value.length > field.maxLength) return 'maximum';
  return null;
}

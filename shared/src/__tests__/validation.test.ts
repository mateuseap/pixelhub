import { describe, expect, it } from 'vitest';
import { MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH } from '../constants';
import { validateChatMessage, validateDisplayName } from '../validation';

describe('validateDisplayName', () => {
  it('accepts a normal name and trims it', () => {
    expect(validateDisplayName('  Alice  ')).toEqual({ ok: true, value: 'Alice' });
  });

  it('accepts unicode names', () => {
    expect(validateDisplayName('Zoé ✨').ok).toBe(true);
  });

  it('rejects non-strings', () => {
    expect(validateDisplayName(42).ok).toBe(false);
    expect(validateDisplayName(undefined).ok).toBe(false);
    expect(validateDisplayName({ evil: true }).ok).toBe(false);
  });

  it('rejects empty and whitespace-only names', () => {
    expect(validateDisplayName('').ok).toBe(false);
    expect(validateDisplayName('   ').ok).toBe(false);
  });

  it('rejects names longer than the limit', () => {
    expect(validateDisplayName('a'.repeat(MAX_NAME_LENGTH + 1)).ok).toBe(false);
    expect(validateDisplayName('a'.repeat(MAX_NAME_LENGTH)).ok).toBe(true);
  });

  it('rejects control characters', () => {
    expect(validateDisplayName('bad\u0000name').ok).toBe(false);
    expect(validateDisplayName('bad\tname').ok).toBe(false);
  });
});

describe('validateChatMessage', () => {
  it('accepts a normal message and trims it', () => {
    expect(validateChatMessage(' hi there ')).toEqual({ ok: true, value: 'hi there' });
  });

  it('rejects non-strings', () => {
    expect(validateChatMessage(null).ok).toBe(false);
    expect(validateChatMessage(['a']).ok).toBe(false);
  });

  it('rejects empty messages', () => {
    expect(validateChatMessage('   ').ok).toBe(false);
  });

  it('enforces the max length boundary', () => {
    expect(validateChatMessage('a'.repeat(MAX_MESSAGE_LENGTH)).ok).toBe(true);
    expect(validateChatMessage('a'.repeat(MAX_MESSAGE_LENGTH + 1)).ok).toBe(false);
  });
});

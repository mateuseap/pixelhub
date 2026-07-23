import { MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, MIN_NAME_LENGTH } from './constants';

export type ValidationResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: string };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** Validates an untrusted display name. Returns the trimmed value on success. */
export function validateDisplayName(raw: unknown): ValidationResult {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Display name must be text.' };
  }
  const value = raw.trim();
  if (value.length < MIN_NAME_LENGTH) {
    return { ok: false, error: 'Display name cannot be empty.' };
  }
  if (value.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Display name must be at most ${MAX_NAME_LENGTH} characters.` };
  }
  if (CONTROL_CHARS.test(value)) {
    return { ok: false, error: 'Display name contains invalid characters.' };
  }
  return { ok: true, value };
}

/** Validates an untrusted chat message. Returns the trimmed value on success. */
export function validateChatMessage(raw: unknown): ValidationResult {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Message must be text.' };
  }
  const value = raw.trim();
  if (value.length === 0) {
    return { ok: false, error: 'Message cannot be empty.' };
  }
  if (value.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message must be at most ${MAX_MESSAGE_LENGTH} characters.` };
  }
  return { ok: true, value };
}

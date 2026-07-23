import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupJoinScreen } from '../src/ui/joinScreen';

const FIXTURE = `
  <div id="join" class="join">
    <form id="join-form">
      <input id="join-name" type="text" />
      <button type="submit">Enter the world</button>
      <p id="join-error" role="alert"></p>
    </form>
  </div>
`;

function elements() {
  return {
    overlay: document.getElementById('join') as HTMLDivElement,
    input: document.getElementById('join-name') as HTMLInputElement,
    error: document.getElementById('join-error') as HTMLParagraphElement,
  };
}

function submitName(name: string): void {
  const { input } = elements();
  input.value = name;
  (document.getElementById('join-form') as HTMLFormElement).dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  );
}

async function flushMicrotasks(): Promise<void> {
  // Enough ticks for a rejection to travel the then/catch chain in joinScreen.
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
});

describe('setupJoinScreen validation', () => {
  it('shows an error for an empty name and never calls onJoin', () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    setupJoinScreen({ onJoin });
    submitName('   ');
    expect(elements().error.textContent).toBe('Display name cannot be empty.');
    expect(onJoin).not.toHaveBeenCalled();
    expect(elements().input.disabled).toBe(false);
  });

  it('shows an error for a name over 20 characters', () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    setupJoinScreen({ onJoin });
    submitName('x'.repeat(21));
    expect(elements().error.textContent).toBe('Display name must be at most 20 characters.');
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('clears a previous error once a valid name is submitted', async () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    setupJoinScreen({ onJoin });
    submitName('');
    expect(elements().error.textContent).not.toBe('');
    submitName('Ada');
    expect(elements().error.textContent).toBe('');
    await flushMicrotasks();
  });
});

describe('setupJoinScreen submit flow', () => {
  it('joins with the trimmed name, disables the input, and hides the overlay', async () => {
    const onJoin = vi.fn().mockResolvedValue(undefined);
    setupJoinScreen({ onJoin });

    submitName('  Ada  ');
    expect(onJoin).toHaveBeenCalledWith('Ada');
    expect(elements().input.disabled).toBe(true);

    await flushMicrotasks();
    expect(elements().overlay.classList.contains('hidden')).toBe(true);
  });

  it('re-enables the input and shows the failure message when join rejects', async () => {
    const onJoin = vi.fn().mockRejectedValue(new Error('World is full'));
    setupJoinScreen({ onJoin });

    submitName('Ada');
    await flushMicrotasks();

    expect(elements().overlay.classList.contains('hidden')).toBe(false);
    expect(elements().input.disabled).toBe(false);
    expect(elements().error.textContent).toBe('World is full');
  });

  it('falls back to a generic message for non-Error failures', async () => {
    const onJoin = vi.fn().mockRejectedValue('nope');
    setupJoinScreen({ onJoin });

    submitName('Ada');
    await flushMicrotasks();

    expect(elements().error.textContent).toBe('Could not join the world. Is the server running?');
  });

  it('allows retrying after a failed join', async () => {
    const onJoin = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);
    setupJoinScreen({ onJoin });

    submitName('Ada');
    await flushMicrotasks();
    submitName('Ada');
    await flushMicrotasks();

    expect(onJoin).toHaveBeenCalledTimes(2);
    expect(elements().overlay.classList.contains('hidden')).toBe(true);
  });
});

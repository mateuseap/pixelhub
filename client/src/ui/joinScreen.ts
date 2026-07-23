import { validateDisplayName } from '@pixelhub/shared';

interface JoinScreenOptions {
  readonly onJoin: (name: string) => Promise<void>;
}

const getElement = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element #${id}`);
  }
  return el as T;
};

/** Wires the join form: validates the name locally, then hands off to onJoin. */
export function setupJoinScreen({ onJoin }: JoinScreenOptions): void {
  const overlay = getElement<HTMLDivElement>('join');
  const form = getElement<HTMLFormElement>('join-form');
  const input = getElement<HTMLInputElement>('join-name');
  const error = getElement<HTMLParagraphElement>('join-error');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const result = validateDisplayName(input.value);
    if (!result.ok) {
      error.textContent = result.error;
      return;
    }

    error.textContent = '';
    input.disabled = true;

    onJoin(result.value)
      .then(() => {
        overlay.classList.add('hidden');
      })
      .catch((cause: unknown) => {
        input.disabled = false;
        error.textContent =
          cause instanceof Error && cause.message
            ? cause.message
            : 'Could not join the world. Is the server running?';
      });
  });
}

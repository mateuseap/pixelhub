import { validateChatMessage, type ChatBroadcast } from '@pixelhub/shared';

const MAX_RENDERED_MESSAGES = 100;

export interface ChatPanel {
  addMessage(message: ChatBroadcast, isSelf: boolean): void;
  addSystem(text: string): void;
  setNearby(names: readonly string[]): void;
  show(): void;
}

interface ChatPanelOptions {
  readonly onSend: (text: string) => void;
}

const getElement = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element #${id}`);
  }
  return el as T;
};

/** Proximity chat panel: nearby roster, message log, and composer. */
export function setupChatPanel({ onSend }: ChatPanelOptions): ChatPanel {
  const panel = getElement<HTMLElement>('chat');
  const messages = getElement<HTMLUListElement>('chat-messages');
  const nearby = getElement<HTMLUListElement>('nearby-list');
  const form = getElement<HTMLFormElement>('chat-form');
  const input = getElement<HTMLInputElement>('chat-input');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = validateChatMessage(input.value);
    if (!result.ok) {
      return;
    }
    onSend(result.value);
    input.value = '';
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      input.blur();
    }
    // Keep game hotkeys from reacting while typing.
    event.stopPropagation();
  });

  const append = (item: HTMLLIElement): void => {
    messages.appendChild(item);
    while (messages.childElementCount > MAX_RENDERED_MESSAGES) {
      messages.firstElementChild?.remove();
    }
    messages.scrollTop = messages.scrollHeight;
  };

  return {
    addMessage(message, isSelf) {
      const item = document.createElement('li');
      const sender = document.createElement('span');
      sender.className = 'sender';
      sender.style.color = isSelf ? '#61afef' : '#98c379';
      sender.textContent = `${message.senderName}: `;
      const body = document.createElement('span');
      body.textContent = message.text;
      item.append(sender, body);
      append(item);
    },

    addSystem(text) {
      const item = document.createElement('li');
      item.className = 'system';
      item.textContent = text;
      append(item);
    },

    setNearby(names) {
      nearby.replaceChildren(
        ...(names.length === 0
          ? [Object.assign(document.createElement('li'), { className: 'empty', textContent: 'nobody in range' })]
          : names.map((name) => Object.assign(document.createElement('li'), { textContent: name }))),
      );
    },

    show() {
      panel.classList.remove('hidden');
    },
  };
}

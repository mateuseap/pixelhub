import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatBroadcast } from '@pixelhub/shared';
import { setupChatPanel, type ChatPanel } from '../src/ui/chatPanel';

const FIXTURE = `
  <aside id="chat" class="chat hidden">
    <ul id="nearby-list"></ul>
    <ul id="chat-messages"></ul>
    <form id="chat-form">
      <input id="chat-input" type="text" />
      <button type="submit">Send</button>
    </form>
  </aside>
`;

function broadcast(overrides: Partial<ChatBroadcast> = {}): ChatBroadcast {
  return {
    senderId: 'sess-1',
    senderName: 'Ada',
    text: 'hello there',
    sentAt: 1234,
    ...overrides,
  };
}

function messagesEl(): HTMLUListElement {
  return document.getElementById('chat-messages') as HTMLUListElement;
}

function nearbyEl(): HTMLUListElement {
  return document.getElementById('nearby-list') as HTMLUListElement;
}

function submitChat(text: string): void {
  const input = document.getElementById('chat-input') as HTMLInputElement;
  input.value = text;
  (document.getElementById('chat-form') as HTMLFormElement).dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true }),
  );
}

let panel: ChatPanel;
let onSend: ReturnType<typeof vi.fn>;

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
  onSend = vi.fn();
  panel = setupChatPanel({ onSend });
});

describe('chat messages', () => {
  it('appends sender name and body as one list item', () => {
    panel.addMessage(broadcast(), false);
    const item = messagesEl().lastElementChild as HTMLLIElement;
    expect(messagesEl().childElementCount).toBe(1);
    expect(item.textContent).toBe('Ada: hello there');
    expect(item.querySelector('.sender')?.textContent).toBe('Ada: ');
  });

  it('renders message text as text content, not HTML', () => {
    panel.addMessage(broadcast({ text: '<img src=x onerror=alert(1)>' }), false);
    expect(messagesEl().querySelector('img')).toBeNull();
    expect(messagesEl().textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('styles own messages differently from others', () => {
    panel.addMessage(broadcast({ senderName: 'Me' }), true);
    panel.addMessage(broadcast({ senderName: 'Them' }), false);
    const [own, other] = Array.from(messagesEl().querySelectorAll('.sender')) as HTMLElement[];
    expect(own.style.color).not.toBe(other.style.color);
  });

  it('marks system messages with the system class', () => {
    panel.addSystem('Ada joined');
    const item = messagesEl().lastElementChild as HTMLLIElement;
    expect(item.className).toBe('system');
    expect(item.textContent).toBe('Ada joined');
  });

  it('caps the rendered log at 100 messages, dropping the oldest', () => {
    for (let i = 0; i < 105; i += 1) {
      panel.addMessage(broadcast({ text: `msg ${i}` }), false);
    }
    expect(messagesEl().childElementCount).toBe(100);
    expect(messagesEl().firstElementChild?.textContent).toBe('Ada: msg 5');
    expect(messagesEl().lastElementChild?.textContent).toBe('Ada: msg 104');
  });
});

describe('chat composer', () => {
  it('sends a valid message and clears the input', () => {
    submitChat('  hi folks  ');
    expect(onSend).toHaveBeenCalledWith('hi folks');
    expect((document.getElementById('chat-input') as HTMLInputElement).value).toBe('');
  });

  it('does not send empty or whitespace-only messages', () => {
    submitChat('');
    submitChat('    ');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send messages over the length limit', () => {
    submitChat('x'.repeat(501));
    expect(onSend).not.toHaveBeenCalled();
  });
});

describe('nearby roster', () => {
  it('lists nearby player names', () => {
    panel.setNearby(['Ada', 'Grace']);
    const items = Array.from(nearbyEl().children).map((li) => li.textContent);
    expect(items).toEqual(['Ada', 'Grace']);
  });

  it('leaves the fresh panel untouched when the roster starts empty', () => {
    // The dedupe key starts as '', which matches an empty roster, so the
    // very first setNearby([]) is intentionally a no-op.
    panel.setNearby([]);
    expect(nearbyEl().childElementCount).toBe(0);
  });

  it('shows a placeholder when the roster empties out', () => {
    panel.setNearby(['Ada']);
    panel.setNearby([]);
    expect(nearbyEl().childElementCount).toBe(1);
    expect(nearbyEl().firstElementChild?.textContent).toBe('nobody in range');
    expect(nearbyEl().firstElementChild?.className).toBe('empty');
  });

  it('skips the DOM rebuild when the roster is unchanged', () => {
    panel.setNearby(['Ada', 'Grace']);
    const before = nearbyEl().firstElementChild;
    panel.setNearby(['Ada', 'Grace']);
    expect(nearbyEl().firstElementChild).toBe(before);
  });

  it('rebuilds when the roster changes', () => {
    panel.setNearby(['Ada']);
    const before = nearbyEl().firstElementChild;
    panel.setNearby(['Grace']);
    expect(nearbyEl().firstElementChild).not.toBe(before);
    expect(nearbyEl().firstElementChild?.textContent).toBe('Grace');
  });
});

describe('panel visibility', () => {
  it('show() unhides the chat panel', () => {
    const chat = document.getElementById('chat') as HTMLElement;
    expect(chat.classList.contains('hidden')).toBe(true);
    panel.show();
    expect(chat.classList.contains('hidden')).toBe(false);
  });
});

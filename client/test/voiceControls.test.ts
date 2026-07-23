import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setupVoiceControls } from '../src/ui/voiceControls';
import type { VoiceStatus } from '../src/audio/voiceManager';

const FIXTURE = `
  <section id="voice" class="voice hidden">
    <button id="voice-toggle" type="button" class="voice__button">Enable voice</button>
    <p id="voice-status" class="voice__status">Voice is off</p>
  </section>
`;

interface Elements {
  readonly section: HTMLElement;
  readonly button: HTMLButtonElement;
  readonly status: HTMLParagraphElement;
}

function elements(): Elements {
  return {
    section: document.getElementById('voice') as HTMLElement,
    button: document.getElementById('voice-toggle') as HTMLButtonElement,
    status: document.getElementById('voice-status') as HTMLParagraphElement,
  };
}

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
});

describe('setupVoiceControls', () => {
  it('throws when the voice DOM fixture is missing', () => {
    document.body.innerHTML = '';
    expect(() => setupVoiceControls({ onToggle: vi.fn() })).toThrow('#voice');
  });

  const CASES: readonly {
    status: VoiceStatus;
    label: string;
    text: string;
    disabled: boolean;
  }[] = [
    { status: 'off', label: 'Enable voice', text: 'Voice is off', disabled: false },
    {
      status: 'connecting',
      label: 'Connecting...',
      text: 'Asking for your microphone...',
      disabled: true,
    },
    {
      status: 'live',
      label: 'Mute mic',
      text: 'Mic on. People nearby can hear you.',
      disabled: false,
    },
    {
      status: 'muted',
      label: 'Unmute mic',
      text: 'Mic muted. You still hear people nearby.',
      disabled: false,
    },
    {
      status: 'reconnecting',
      label: 'Reconnecting...',
      text: 'Voice connection dropped, reconnecting...',
      disabled: true,
    },
    { status: 'error', label: 'Enable voice', text: '', disabled: false },
  ];

  it.each(CASES)('renders the $status state', ({ status, label, text, disabled }) => {
    const controls = setupVoiceControls({ onToggle: vi.fn() });
    const { button, status: statusEl } = elements();

    controls.setStatus(status);

    expect(button.textContent).toBe(label);
    expect(button.disabled).toBe(disabled);
    expect(button.classList.contains('is-live')).toBe(status === 'live');
    expect(statusEl.textContent).toBe(text);
    expect(statusEl.classList.contains('error')).toBe(status === 'error');
  });

  it('shows the detail message instead of the canned status text', () => {
    const controls = setupVoiceControls({ onToggle: vi.fn() });
    controls.setStatus('error', 'Microphone permission denied.');
    expect(elements().status.textContent).toBe('Microphone permission denied.');
  });

  it('clears the error styling when leaving the error state', () => {
    const controls = setupVoiceControls({ onToggle: vi.fn() });
    controls.setStatus('error', 'boom');
    controls.setStatus('live');
    const { button, status } = elements();
    expect(status.classList.contains('error')).toBe(false);
    expect(button.classList.contains('is-live')).toBe(true);
  });

  it('show() unhides the voice section', () => {
    const controls = setupVoiceControls({ onToggle: vi.fn() });
    expect(elements().section.classList.contains('hidden')).toBe(true);
    controls.show();
    expect(elements().section.classList.contains('hidden')).toBe(false);
  });

  it('invokes onToggle when the button is clicked', () => {
    const onToggle = vi.fn();
    setupVoiceControls({ onToggle });
    elements().button.click();
    elements().button.click();
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});

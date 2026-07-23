import type { VoiceStatus } from '../audio/voiceManager';

export interface VoiceControls {
  setStatus(status: VoiceStatus, detail?: string): void;
  show(): void;
}

interface VoiceControlsOptions {
  readonly onToggle: () => void;
}

const BUTTON_LABEL: Readonly<Record<VoiceStatus, string>> = {
  off: 'Enable voice',
  connecting: 'Connecting...',
  live: 'Mute mic',
  muted: 'Unmute mic',
  reconnecting: 'Reconnecting...',
  error: 'Enable voice',
};

const STATUS_TEXT: Readonly<Record<VoiceStatus, string>> = {
  off: 'Voice is off',
  connecting: 'Asking for your microphone...',
  live: 'Mic on. People nearby can hear you.',
  muted: 'Mic muted. You still hear people nearby.',
  reconnecting: 'Voice connection dropped, reconnecting...',
  error: '',
};

const getElement = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required element #${id}`);
  }
  return el as T;
};

/**
 * Voice section of the side panel: one toggle button (enable, then
 * mute/unmute) and a status line. Hidden until the server confirms that
 * LiveKit is configured, so a voiceless deployment shows no voice UI at all.
 */
export function setupVoiceControls({ onToggle }: VoiceControlsOptions): VoiceControls {
  const section = getElement<HTMLElement>('voice');
  const button = getElement<HTMLButtonElement>('voice-toggle');
  const status = getElement<HTMLParagraphElement>('voice-status');

  button.addEventListener('click', () => {
    onToggle();
  });

  return {
    setStatus(state, detail) {
      button.textContent = BUTTON_LABEL[state];
      button.disabled = state === 'connecting' || state === 'reconnecting';
      button.classList.toggle('is-live', state === 'live');
      status.textContent = detail ?? STATUS_TEXT[state];
      status.classList.toggle('error', state === 'error');
    },

    show() {
      section.classList.remove('hidden');
    },
  };
}

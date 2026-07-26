import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupTouchControls } from '../src/ui/touchControls';

const FIXTURE = `
  <div id="touch-joystick" class="joystick hidden">
    <div class="joystick__base">
      <div class="joystick__knob"></div>
    </div>
  </div>
`;

/** jsdom has no PointerEvent constructor; a plain Event carries the fields our code reads. */
function pointerEvent(
  type: string,
  init: { pointerId: number; clientX: number; clientY: number },
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  return Object.assign(event, init);
}

function mockPointerCoarse(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)' ? matches : false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

function joystickRoot(): HTMLDivElement {
  return document.getElementById('touch-joystick') as HTMLDivElement;
}

function stubGeometry(root: HTMLDivElement): void {
  // Fixed 110x110 box at (50, 500), so the base center sits at (105, 555).
  root.getBoundingClientRect = () =>
    ({ left: 50, top: 500, right: 160, bottom: 610, width: 110, height: 110, x: 50, y: 500, toJSON() {} }) as DOMRect;
  root.setPointerCapture = vi.fn();
}

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('setupTouchControls on a fine-pointer (mouse/keyboard) device', () => {
  it('stays hidden and always reads IDLE_INPUT', () => {
    mockPointerCoarse(false);
    const controls = setupTouchControls();

    expect(joystickRoot().classList.contains('hidden')).toBe(true);
    expect(controls.read()).toEqual({ up: false, down: false, left: false, right: false });
  });
});

describe('setupTouchControls on a coarse-pointer (touch) device', () => {
  it('reveals the joystick', () => {
    mockPointerCoarse(true);
    setupTouchControls();

    expect(joystickRoot().classList.contains('hidden')).toBe(false);
  });

  it('reads IDLE_INPUT before any touch', () => {
    mockPointerCoarse(true);
    const controls = setupTouchControls();

    expect(controls.read()).toEqual({ up: false, down: false, left: false, right: false });
  });

  it('reports right when the knob is dragged past the dead zone to the right', () => {
    mockPointerCoarse(true);
    const controls = setupTouchControls();
    const root = joystickRoot();
    stubGeometry(root);

    // Base center is (105, 555); dragging to (145, 555) is +40px on x, 0 on y.
    root.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 145, clientY: 555 }));

    expect(controls.read()).toEqual({ up: false, down: false, left: false, right: true });
  });

  it('reports a diagonal (down-left) direction from a diagonal drag', () => {
    mockPointerCoarse(true);
    const controls = setupTouchControls();
    const root = joystickRoot();
    stubGeometry(root);

    // dx = -30, dy = +30 relative to the base center (105, 555).
    root.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 75, clientY: 585 }));

    expect(controls.read()).toEqual({ up: false, down: true, left: true, right: false });
  });

  it('ignores tiny movements inside the dead zone', () => {
    mockPointerCoarse(true);
    const controls = setupTouchControls();
    const root = joystickRoot();
    stubGeometry(root);

    // 5px nudge is well under the 25% dead zone of a 40px radius.
    root.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 110, clientY: 555 }));

    expect(controls.read()).toEqual({ up: false, down: false, left: false, right: false });
  });

  it('resets to IDLE_INPUT and snaps the knob back on release', () => {
    mockPointerCoarse(true);
    const controls = setupTouchControls();
    const root = joystickRoot();
    stubGeometry(root);
    const knob = root.querySelector('.joystick__knob') as HTMLDivElement;

    root.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 145, clientY: 555 }));
    expect(controls.read().right).toBe(true);

    root.dispatchEvent(pointerEvent('pointerup', { pointerId: 1, clientX: 145, clientY: 555 }));

    expect(controls.read()).toEqual({ up: false, down: false, left: false, right: false });
    expect(knob.style.transform).toBe('translate(0, 0)');
  });

  it('ignores a second finger while the first is still active', () => {
    mockPointerCoarse(true);
    const controls = setupTouchControls();
    const root = joystickRoot();
    stubGeometry(root);

    root.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1, clientX: 145, clientY: 555 }));
    expect(controls.read().right).toBe(true);

    // A different pointerId should not hijack the drag.
    root.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2, clientX: 105, clientY: 595 }));

    expect(controls.read()).toEqual({ up: false, down: false, left: false, right: true });
  });
});

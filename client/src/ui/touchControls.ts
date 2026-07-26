import { IDLE_INPUT, type MovementInput } from '@pixelhub/shared';

/** Portion of the max travel radius the knob must cross before a direction registers. */
const DEAD_ZONE_RATIO = 0.25;
/** Portion of the max travel radius an axis must cross to count as pressed. */
const AXIS_THRESHOLD = 0.3;
/** How far the knob can travel from the base center, in CSS pixels. */
const MAX_RADIUS = 40;

export interface TouchControls {
  /** Current movement input from the on-screen joystick (IDLE_INPUT when untouched). */
  read(): MovementInput;
}

const getElement = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

/**
 * On-screen virtual joystick for touch devices. Only activates on
 * coarse-pointer inputs (touch/stylus primary), so it never appears for
 * mouse/keyboard players and never competes with WASD.
 */
export function setupTouchControls(): TouchControls {
  const root = getElement<HTMLDivElement>('touch-joystick');
  const knob = root?.querySelector<HTMLDivElement>('.joystick__knob') ?? null;

  if (!root || !knob || !window.matchMedia('(pointer: coarse)').matches) {
    return { read: () => IDLE_INPUT };
  }

  root.classList.remove('hidden');

  let input: MovementInput = IDLE_INPUT;
  let activePointerId: number | null = null;
  let originX = 0;
  let originY = 0;

  const resetKnob = (): void => {
    knob.style.transform = 'translate(0, 0)';
  };

  const applyVector = (dx: number, dy: number): void => {
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(distance, MAX_RADIUS);
    const angle = Math.atan2(dy, dx);
    const kx = distance === 0 ? 0 : Math.cos(angle) * clamped;
    const ky = distance === 0 ? 0 : Math.sin(angle) * clamped;
    knob.style.transform = `translate(${kx}px, ${ky}px)`;

    const ratio = clamped / MAX_RADIUS;
    if (ratio < DEAD_ZONE_RATIO) {
      input = IDLE_INPUT;
      return;
    }
    // Independent per-axis thresholds mirror stepPlayer's axis-independent
    // resolution, so diagonal drags produce diagonal movement.
    const nx = kx / MAX_RADIUS;
    const ny = ky / MAX_RADIUS;
    input = {
      up: ny < -AXIS_THRESHOLD,
      down: ny > AXIS_THRESHOLD,
      left: nx < -AXIS_THRESHOLD,
      right: nx > AXIS_THRESHOLD,
    };
  };

  const beginTouch = (event: PointerEvent): void => {
    if (activePointerId !== null) {
      return;
    }
    activePointerId = event.pointerId;
    root.setPointerCapture(activePointerId);
    const rect = root.getBoundingClientRect();
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;
    applyVector(event.clientX - originX, event.clientY - originY);
    event.preventDefault();
  };

  const continueTouch = (event: PointerEvent): void => {
    if (event.pointerId !== activePointerId) {
      return;
    }
    applyVector(event.clientX - originX, event.clientY - originY);
    event.preventDefault();
  };

  const endTouch = (event: PointerEvent): void => {
    if (event.pointerId !== activePointerId) {
      return;
    }
    activePointerId = null;
    input = IDLE_INPUT;
    resetKnob();
  };

  root.addEventListener('pointerdown', beginTouch);
  root.addEventListener('pointermove', continueTouch);
  root.addEventListener('pointerup', endTouch);
  root.addEventListener('pointercancel', endTouch);

  return {
    read: () => input,
  };
}

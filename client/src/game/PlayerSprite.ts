import Phaser from 'phaser';
import {
  PALETTE,
  TEXTURE_AVATAR_BODY_0,
  TEXTURE_AVATAR_BODY_1,
  TEXTURE_AVATAR_HEAD,
  TEXTURE_AVATAR_SHADOW,
} from './textures';

const BUBBLE_LIFETIME_MS = 4000;
const BUBBLE_MAX_WIDTH = 150;
const WALK_FRAME_MS = 150;
const FEET_Y = 12;
const FADE_MS = 250;

/**
 * Pixel avatar: soft shadow, tinted body with a 2-frame walk cycle, untinted
 * head, name label, and a reusable speech bubble. One container per player.
 */
export class PlayerSprite {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly body: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private currentFrame = 0;

  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleBg: Phaser.GameObjects.Graphics | null = null;
  private bubbleText: Phaser.GameObjects.Text | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string, color: string) {
    this.scene = scene;

    const shadow = scene.add
      .image(0, FEET_Y + 1, TEXTURE_AVATAR_SHADOW)
      .setAlpha(0.25);

    this.body = scene.add
      .image(0, FEET_Y, TEXTURE_AVATAR_BODY_0)
      .setOrigin(0.5, 1)
      .setTint(Number.parseInt(color.replace('#', ''), 16));

    this.head = scene.add.image(0, -2, TEXTURE_AVATAR_HEAD).setOrigin(0.5, 1);

    const label = scene.add
      .text(0, -18, name, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#f2ead8',
        backgroundColor: 'rgba(23, 19, 29, 0.75)',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1);

    this.container = scene.add.container(x, y, [shadow, this.body, this.head, label]);
    this.container.setDepth(y);
    this.container.setAlpha(0);
    scene.tweens.add({ targets: this.container, alpha: 1, duration: FADE_MS });
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
    this.container.setDepth(y);
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  /** Advances the 2-frame walk bob. Call once per scene update. */
  updateWalk(timeMs: number, moving: boolean): void {
    const frame = moving ? Math.floor(timeMs / WALK_FRAME_MS) % 2 : 0;
    if (frame === this.currentFrame) {
      return;
    }
    this.currentFrame = frame;
    this.body.setTexture(frame === 0 ? TEXTURE_AVATAR_BODY_0 : TEXTURE_AVATAR_BODY_1);
    const hop = frame === 1 ? -1 : 0;
    this.body.setY(FEET_Y + hop);
    this.head.setY(-2 + hop);
  }

  /** Shows a speech bubble above the avatar; bubble objects are reused. */
  showBubble(text: string): void {
    this.bubbleTimer?.remove();
    const preview = text.length > 120 ? `${text.slice(0, 120)}...` : text;

    if (!this.bubble || !this.bubbleBg || !this.bubbleText) {
      this.bubbleBg = this.scene.add.graphics();
      this.bubbleText = this.scene.add
        .text(0, 0, '', {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#2a2233',
          wordWrap: { width: BUBBLE_MAX_WIDTH },
          align: 'center',
        })
        .setOrigin(0.5, 0.5);
      this.bubble = this.scene.add.container(0, 0, [this.bubbleBg, this.bubbleText]);
      this.container.add(this.bubble);
    }

    this.bubbleText.setText(preview);
    const paddingX = 7;
    const paddingY = 5;
    const w = this.bubbleText.width + paddingX * 2;
    const h = this.bubbleText.height + paddingY * 2;

    const bg = this.bubbleBg;
    bg.clear();
    bg.fillStyle(PALETTE.paper, 1);
    bg.lineStyle(2, PALETTE.ink, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
    // Tail pointing down at the avatar.
    bg.fillTriangle(-5, h / 2 - 1, 5, h / 2 - 1, 0, h / 2 + 6);
    bg.lineBetween(-5, h / 2, 0, h / 2 + 6);
    bg.lineBetween(5, h / 2, 0, h / 2 + 6);

    this.bubble.setPosition(0, -34 - h / 2);
    this.bubble.setVisible(true);
    this.bubble.setAlpha(0);
    this.scene.tweens.add({ targets: this.bubble, alpha: 1, duration: 150 });

    this.bubbleTimer = this.scene.time.delayedCall(BUBBLE_LIFETIME_MS, () => this.hideBubble());
  }

  /** Fades the whole avatar out, then invokes the callback (for leave). */
  fadeOut(onComplete: () => void): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: FADE_MS,
      onComplete,
    });
  }

  private hideBubble(): void {
    this.bubbleTimer = null;
    const bubble = this.bubble;
    if (!bubble) {
      return;
    }
    this.scene.tweens.add({
      targets: bubble,
      alpha: 0,
      duration: 200,
      onComplete: () => bubble.setVisible(false),
    });
  }

  destroy(): void {
    this.bubbleTimer?.remove();
    this.bubbleTimer = null;
    this.scene.tweens.killTweensOf(this.container);
    if (this.bubble) {
      this.scene.tweens.killTweensOf(this.bubble);
    }
    this.container.destroy();
  }
}

import Phaser from 'phaser';
import { TEXTURE_AVATAR } from './textures';

const BUBBLE_LIFETIME_MS = 4000;
const BUBBLE_MAX_WIDTH = 180;

/** Avatar + name label + optional speech bubble, grouped in one container. */
export class PlayerSprite {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, name: string, color: string) {
    this.scene = scene;

    const body = scene.add.image(0, 0, TEXTURE_AVATAR);
    body.setTint(Number.parseInt(color.replace('#', ''), 16));

    const label = scene.add
      .text(0, -24, name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#ffffff',
        stroke: '#14151f',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);

    this.container = scene.add.container(x, y, [body, label]);
    this.container.setDepth(10);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  get x(): number {
    return this.container.x;
  }

  get y(): number {
    return this.container.y;
  }

  /** Shows a speech bubble above the avatar for a few seconds. */
  showBubble(text: string): void {
    this.clearBubble();

    const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text;
    const content = this.scene.add
      .text(0, 0, preview, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#14151f',
        wordWrap: { width: BUBBLE_MAX_WIDTH },
        align: 'center',
      })
      .setOrigin(0.5, 0.5);

    const paddingX = 8;
    const paddingY = 6;
    const w = content.width + paddingX * 2;
    const h = content.height + paddingY * 2;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 6);
    bg.fillTriangle(-5, h / 2, 5, h / 2, 0, h / 2 + 6);

    this.bubble = this.scene.add.container(0, -40 - h / 2, [bg, content]);
    this.container.add(this.bubble);

    this.bubbleTimer = this.scene.time.delayedCall(BUBBLE_LIFETIME_MS, () => this.clearBubble());
  }

  private clearBubble(): void {
    this.bubbleTimer?.remove();
    this.bubbleTimer = null;
    this.bubble?.destroy();
    this.bubble = null;
  }

  destroy(): void {
    this.clearBubble();
    this.container.destroy();
  }
}

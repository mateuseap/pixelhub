import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorldMap, TILE_SIZE } from '@pixelhub/shared';

// Phaser is only consumed through the tiny surface below; a real canvas is
// never involved in these tests.
vi.mock('phaser', () => ({ default: {} }));

import {
  createAvatarTextures,
  createWorldTexture,
  TEXTURE_AVATAR_BODY_0,
  TEXTURE_AVATAR_BODY_1,
  TEXTURE_AVATAR_HEAD,
  TEXTURE_AVATAR_SHADOW,
  TEXTURE_WORLD,
} from '../src/game/textures';

interface GeneratedTexture {
  readonly width: number;
  readonly height: number;
}

class FakeGraphics {
  destroyed = false;
  readonly generated: string[] = [];

  constructor(private readonly scene: FakeScene) {}

  fillStyle(): void {}
  fillRect(): void {}
  fillEllipse(): void {}
  generateTexture(key: string, width: number, height: number): void {
    this.generated.push(key);
    this.scene.registered.set(key, { width, height });
  }
  destroy(): void {
    this.destroyed = true;
  }
}

class FakeScene {
  readonly registered = new Map<string, GeneratedTexture>();
  readonly graphics: FakeGraphics[] = [];
  readonly textures = {
    exists: (key: string): boolean => this.registered.has(key),
  };
  readonly add = {
    graphics: (): FakeGraphics => {
      const g = new FakeGraphics(this);
      this.graphics.push(g);
      return g;
    },
  };
}

// The fakes intentionally cover only the Phaser members textures.ts touches.
const asScene = (scene: FakeScene): Parameters<typeof createWorldTexture>[0] =>
  scene as unknown as Parameters<typeof createWorldTexture>[0];

let scene: FakeScene;

beforeEach(() => {
  scene = new FakeScene();
});

describe('createWorldTexture', () => {
  it('bakes the whole map into one texture sized to the tile grid', () => {
    const map = createWorldMap();
    createWorldTexture(asScene(scene), map);

    expect(scene.registered.get(TEXTURE_WORLD)).toEqual({
      width: map.width * TILE_SIZE,
      height: map.height * TILE_SIZE,
    });
    // The scratch graphics object is destroyed after baking.
    expect(scene.graphics).toHaveLength(1);
    expect(scene.graphics[0].destroyed).toBe(true);
  });

  it('is idempotent: skips work when the texture already exists', () => {
    const map = createWorldMap();
    createWorldTexture(asScene(scene), map);
    createWorldTexture(asScene(scene), map);
    expect(scene.graphics).toHaveLength(1);
  });
});

describe('createAvatarTextures', () => {
  it('generates the four avatar part textures', () => {
    createAvatarTextures(asScene(scene));
    expect([...scene.registered.keys()].sort()).toEqual(
      [
        TEXTURE_AVATAR_BODY_0,
        TEXTURE_AVATAR_BODY_1,
        TEXTURE_AVATAR_HEAD,
        TEXTURE_AVATAR_SHADOW,
      ].sort(),
    );
    // Both body frames share dimensions so animation can swap them freely.
    expect(scene.registered.get(TEXTURE_AVATAR_BODY_0)).toEqual(
      scene.registered.get(TEXTURE_AVATAR_BODY_1),
    );
    // Every scratch graphics object is destroyed.
    expect(scene.graphics.every((g) => g.destroyed)).toBe(true);
  });

  it('is idempotent: skips work when the avatar textures already exist', () => {
    createAvatarTextures(asScene(scene));
    const count = scene.graphics.length;
    createAvatarTextures(asScene(scene));
    expect(scene.graphics).toHaveLength(count);
  });
});

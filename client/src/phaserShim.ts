/**
 * The vite config aliases the bare "phaser" specifier to this module so the
 * app ships the official terser-minified ESM build, which is about 400 kB
 * smaller than re-minifying the readable ESM dist. The dist file only has
 * named exports, so this shim restores the default export the app imports.
 * Type information still comes from the regular phaser package.
 */
// @ts-expect-error the dist build ships no type declarations
import * as PhaserDist from 'phaser/dist/phaser.esm.min.js';

export default PhaserDist as unknown as typeof import('phaser');

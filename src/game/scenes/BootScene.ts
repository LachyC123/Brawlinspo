import Phaser from 'phaser';
import { MENU_W, MENU_H, PALETTE } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { SaveSystem } from '../systems/SaveSystem';
import { px } from '../render/pixel';

/**
 * Boot: initialise audio with persisted settings, show a brief loading beat,
 * then move to the main menu. No external assets to preload (art is procedural).
 */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.scale.setGameSize(MENU_W, MENU_H);
    const saved = SaveSystem.loadSettings();
    AudioManager.init(saved ?? { music: true, sfx: true, volume: 0.7, reducedMotion: false, reducedShake: false, highContrast: false, leftHanded: false, textScale: 1 });

    const g = this.add.graphics();
    px(g, 0, 0, MENU_W, MENU_H, PALETTE.bgDeep);
    this.add.text(MENU_W / 2, MENU_H / 2, 'LOCAL LEGEND', {
      fontFamily: '"Trebuchet MS", sans-serif', fontSize: '18px', color: '#f2e6c8', fontStyle: 'bold', resolution: 3,
    }).setOrigin(0.5).setAlpha(0).setName('boot');

    const t = this.children.getByName('boot') as Phaser.GameObjects.Text;
    this.tweens.add({ targets: t, alpha: 1, duration: 400, yoyo: true, hold: 300, onComplete: () => this.scene.start('Menu') });
  }
}

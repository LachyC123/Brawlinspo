import Phaser from 'phaser';
import { MENU_W, MENU_H, PALETTE } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CareerCreationScene } from './scenes/CareerCreationScene';
import { OpeningScene } from './scenes/OpeningScene';
import { HomeScene } from './scenes/HomeScene';
import { TrainingScene } from './scenes/TrainingScene';
import { EventScene } from './scenes/EventScene';
import { MatchScene } from './scenes/MatchScene';
import { PostMatchScene } from './scenes/PostMatchScene';
import { SquadScene } from './scenes/SquadScene';
import { CareerScene } from './scenes/CareerScene';
import { TownScene } from './scenes/TownScene';
import { TransferScene } from './scenes/TransferScene';
import { SettingsScene } from './scenes/SettingsScene';

/**
 * Phaser game configuration. Menus render at a portrait 270×480 base; the
 * MatchScene switches the canvas to a 384×216 landscape frame (§24). FIT
 * scaling + pixelArt keeps everything crisp with nearest-neighbour scaling.
 */
export function startGame(): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-root',
    backgroundColor: '#' + PALETTE.bg.toString(16).padStart(6, '0'),
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: MENU_W,
      height: MENU_H,
    },
    input: {
      activePointers: 2,
    },
    scene: [
      BootScene,
      MenuScene,
      CareerCreationScene,
      OpeningScene,
      HomeScene,
      TrainingScene,
      EventScene,
      MatchScene,
      PostMatchScene,
      SquadScene,
      CareerScene,
      TownScene,
      TransferScene,
      SettingsScene,
    ],
  };

  const game = new Phaser.Game(config);
  attachDebug(game);
  return game;
}

/**
 * Optional debugging hooks, only attached when the page is loaded with a
 * `?debug` query param. Used by the automated smoke test to drive scenes and
 * inspect career state. Has no effect on the shipped game.
 */
function attachDebug(game: Phaser.Game) {
  if (!new URLSearchParams(location.search).has('debug')) return;
  // Lazy imports keep these out of the normal path.
  void import('./state').then(async ({ Store }) => {
    const { CareerSystem } = await import('./systems/CareerSystem');
    const w = window as unknown as Record<string, unknown>;
    w.__LL = game;
    w.__LLStore = Store;
    w.__llStart = (key: string, data?: object) => {
      game.scene.getScenes(true).forEach((s) => game.scene.stop(s.scene.key));
      game.scene.start(key, data);
    };
    w.__llNewCareer = () => {
      const state = CareerSystem.create(
        {
          firstName: 'Test', surname: 'Rivers', shirtName: 'RIVERS', shirtNumber: 10,
          foot: 'Right', nationality: 'Wex-Albion', position: 'ST', background: 'street',
          age: 16, appearance: { skinTone: 1, hairStyle: 1, hairColor: 2, eyeColor: 0, build: 2 },
        },
        0,
      );
      Store.set(state, 0);
      Store.autosave();
      (w.__llStart as (key: string, data?: object) => void)('Home');
      return state;
    };
  });
}

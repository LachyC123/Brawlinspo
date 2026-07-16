import { startGame } from './game/Game';

// Entry point. Kicks off Phaser once the DOM is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  startGame();
}

import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { panel, px } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { Store } from '../state';
import { TransferSystem } from '../systems/TransferSystem';
import { AudioManager } from '../systems/AudioManager';

/** Transfer decision (§14). Leaving is emotional and never obviously correct. */
export class TransferScene extends BaseScene {
  constructor() { super('Transfer'); }

  create() {
    this.ensureMenuSize();
    this.fadeIn();
    const s = Store.get();
    const offer = s.pendingTransfer;
    this.drawBackdrop(false);
    this.header('TRANSFER OFFER', () => this.goTo('Home'));

    if (!offer) {
      this.add.text(MENU_W / 2, 200, 'No offer on the table.', { fontFamily: FONT.body, fontSize: '10px', color: hex(PALETTE.creamDim), resolution: 3 }).setOrigin(0.5);
      new PixelButton(this, 40, 260, { w: MENU_W - 80, h: 28, label: 'BACK', fontSize: 10, onClick: () => this.goTo('Home') });
      return;
    }

    const suitor = Store.club(offer.clubId);
    const from = Store.club();

    // Cool railway-station lighting for the transfer scene (§31).
    const g = this.add.graphics();
    panel(g, 8, 40, MENU_W - 16, 200, { fill: PALETTE.panelDark, border: PALETTE.ink, accent: PALETTE.gold });
    px(g, 8, 40, MENU_W - 16, 2, PALETTE.gold);

    this.add.text(MENU_W / 2, 48, `${suitor.name} want you`, { fontFamily: FONT.heading, fontSize: '13px', color: hex(PALETTE.gold), fontStyle: 'bold', align: 'center', wordWrap: { width: MENU_W - 30 }, resolution: 3 }).setOrigin(0.5, 0);

    const rows = [
      ['Buying club', suitor.name],
      ['Division', ['Premier', 'Championship', 'Regional', 'Community'][suitor.division]],
      ['Wage / week', `£${offer.wage.toLocaleString()}`],
      ['Squad role', offer.role],
      ['Playing time', offer.playingTime],
      ['Style', offer.style],
      ['Distance', offer.distance],
      ['Transfer fee', `£${offer.fee.toLocaleString()}`],
      ['Leaving cost', `${from.name} supporters heartbroken`],
    ];
    let y = 74;
    for (const [k, v] of rows) {
      this.add.text(16, y, k, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.bluegrey), resolution: 3 });
      this.add.text(MENU_W - 16, y, v, { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.cream), align: 'right', wordWrap: { width: 150 }, resolution: 3 }).setOrigin(1, 0);
      y += 16;
    }

    this.add.text(MENU_W / 2, 236, 'A move up the divisions — but Greywick is home.', { fontFamily: FONT.body, fontSize: '7px', color: hex(PALETTE.creamDim), fontStyle: 'italic', align: 'center', wordWrap: { width: MENU_W - 30 }, resolution: 3 }).setOrigin(0.5, 0);

    // Options
    let by = 256;
    const opt = (label: string, accent: number, fn: () => void) => { new PixelButton(this, 12, by, { w: MENU_W - 24, h: 26, label, fontSize: 9, accent, onClick: fn }); by += 30; };
    opt('Reject — stay a Greywick man', PALETTE.good, () => this.finish(TransferSystem.reject(s)));
    opt('Accept — join at season’s end', PALETTE.gold, () => this.finish(TransferSystem.accept(s)));
    opt('Request improved terms', PALETTE.amber, () => {
      if (s.pendingTransfer) { s.pendingTransfer.wage = Math.round(s.pendingTransfer.wage * 1.25); Store.autosave(); AudioManager.play('notify'); this.toast('They improve the wage offer.', PALETTE.gold); this.time.delayedCall(700, () => this.scene.restart()); }
    });
    opt('Delay the decision', PALETTE.bluegrey, () => this.finish(TransferSystem.delay(s)));
  }

  private finish(outcome: string) {
    Store.autosave();
    AudioManager.play('paper');
    const g = this.add.graphics().setDepth(500);
    px(g, 0, 0, MENU_W, MENU_H, PALETTE.bgDeep, 0.9);
    this.add.text(MENU_W / 2, 180, outcome, { fontFamily: FONT.body, fontSize: '10px', color: hex(PALETTE.cream), align: 'center', wordWrap: { width: MENU_W - 40 }, lineSpacing: 3, resolution: 3 }).setOrigin(0.5).setDepth(501);
    new PixelButton(this, 40, 280, { w: MENU_W - 80, h: 28, label: 'CONTINUE', fontSize: 10, accent: PALETTE.amber, onClick: () => this.goTo('Home') }).setDepth(501);
  }
}

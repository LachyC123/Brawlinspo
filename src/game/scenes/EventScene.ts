import { BaseScene } from './BaseScene';
import { MENU_W, MENU_H, PALETTE, FONT, hex } from '../config';
import { px } from '../render/pixel';
import { PixelButton } from '../ui/PixelButton';
import { DialogueBox } from '../ui/DialogueBox';
import { Store } from '../state';
import { EventSystem } from '../systems/EventSystem';
import { MemorySystem } from '../systems/MemorySystem';
import { ReputationSystem } from '../systems/ReputationSystem';
import { RelationshipSystem } from '../systems/RelationshipSystem';
import { AudioManager } from '../systems/AudioManager';
import type { GameEvent } from '../data/events';

/**
 * Story event beat (§12, §43). Picks one eligible, off-cooldown event, presents
 * it, applies the chosen consequence, spawns any Football Memory, then hands
 * back to the weekly loop.
 */
export class EventScene extends BaseScene {
  constructor() { super('Event'); }

  create() {
    this.ensureMenuSize();
    this.fadeIn();
    this.drawBackdrop(false);
    const s = Store.get();
    const event = EventSystem.pick(s);

    if (!event) {
      this.quietWeek();
      return;
    }
    this.present(s, event);
  }

  private present(s: ReturnType<typeof Store.get>, event: GameEvent) {
    AudioManager.play('notify');
    // Choose a portrait if the event clearly involves a teammate.
    const involved = this.guessCharacter(event);
    new DialogueBox(this, MENU_W / 2, MENU_H / 2, {
      title: event.title,
      body: event.body(s),
      speaker: involved ? `${involved.firstName} ${involved.surname}` : undefined,
      portrait: involved ? { appearance: involved.appearance, kit: Store.club().primary, expr: 'neutral' } : undefined,
      choices: event.choices.map((ch) => ({
        label: ch.label,
        onClick: () => {
          const outcome = ch.apply(s);
          if (ch.memory) {
            const m = ch.memory(s);
            MemorySystem.add(s, {
              type: m.type, headline: m.headline, clubId: s.clubId, impact: m.impact,
              publicImportance: m.pub, emotionalImportance: m.emo, repEffect: m.rep,
              tags: m.tags, characters: m.characters,
            });
          }
          EventSystem.resolve(s, event, ch.id);
          RelationshipSystem.refreshStates(s);
          ReputationSystem.recompute(s);
          s.weekEventResolved = true;
          Store.autosave();
          this.showOutcome(outcome);
        },
      })),
    });
  }

  private guessCharacter(event: GameEvent) {
    const s = Store.get();
    const map: Record<string, string> = {
      captain_attitude: 'reece', young_advice: 'ollie', financial_crisis: 'kasper',
      extra_training: 'sekou', hidden_injury: 'mason', transfer_help: 'sekou', jealous_striker: 'mason',
    };
    const id = map[event.id];
    return id ? s.teammates.find((t) => t.id === id) : undefined;
  }

  private showOutcome(text: string) {
    const g = this.add.graphics().setDepth(1500);
    px(g, 0, 0, MENU_W, MENU_H, PALETTE.bgDeep, 0.85);
    this.add.text(MENU_W / 2, 150, text, {
      fontFamily: FONT.body, fontSize: '10px', color: hex(PALETTE.cream), align: 'center',
      wordWrap: { width: MENU_W - 50 }, lineSpacing: 3, resolution: 3,
    }).setOrigin(0.5).setDepth(1501);
    new PixelButton(this, 40, 300, { w: MENU_W - 80, h: 30, label: 'CONTINUE', fontSize: 11, accent: PALETTE.amber, onClick: () => this.goTo('Home') }).setDepth(1501);
  }

  private quietWeek() {
    const s = Store.get();
    s.weekEventResolved = true;
    Store.autosave();
    this.add.text(MENU_W / 2, 160, 'A quiet week around the club.', { fontFamily: FONT.body, fontSize: '10px', color: hex(PALETTE.creamDim), align: 'center', resolution: 3 }).setOrigin(0.5);
    this.add.text(MENU_W / 2, 180, 'Heads down. The match is coming.', { fontFamily: FONT.body, fontSize: '8px', color: hex(PALETTE.bluegrey), align: 'center', resolution: 3 }).setOrigin(0.5);
    new PixelButton(this, 40, 300, { w: MENU_W - 80, h: 30, label: 'CONTINUE', fontSize: 11, accent: PALETTE.amber, onClick: () => this.goTo('Home') });
  }
}

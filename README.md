# LOCAL LEGEND
### From Muddy Pitches to Football Immortality

A pixel-art, mobile-first football **career game** for the browser. You start as a
16-year-old unknown at struggling semi-pro **Greywick Rovers**, playing the key
moments of matches, building (and breaking) relationships in the dressing room,
and making decisions that the football world *remembers*.

This repository is the **first playable vertical slice**: a complete weekly
career loop, the signature **Football Memory** system, expressive procedural
pixel art, and satisfying touch-first match interactions.

> Working title — designed so `LOCAL LEGEND` can be renamed later (see
> `src/game/config.ts` and `MenuScene`).

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # type-checks, then bundles to dist/
npm run preview  # serve the built dist/ locally
```

No API keys and no network services are required — the whole game runs
client-side and saves to your browser.

---

## Tech

- **TypeScript** + **Vite** (build/dev)
- **Phaser 3** for rendering, scenes, input and animation
- **Web Audio API** for procedural sound (no audio binaries shipped)
- **localStorage** for saves (3 slots + JSON export/import)

All art is drawn **procedurally** from pixel primitives at a fixed low internal
resolution and scaled with nearest-neighbour (`image-rendering: pixelated`).
Menus render at a portrait `270×480` frame; matches switch to a landscape
`384×216` frame.

### Project layout

```
src/
  main.ts
  styles/main.css
  game/
    Game.ts, config.ts, types.ts, state.ts
    scenes/    Boot, Menu, CareerCreation, Opening, Home, Training,
               Event, Match, PostMatch, Squad, Career, Town,
               Transfer, Settings, BaseScene
    systems/   Career, Match, Memory, Relationship, Event, Reputation,
               Transfer, Training, Save, News, Audio
    data/      clubs, players, events, names, competitions
    entities/  Footballer
    ui/        PixelButton, StatBar, DialogueBox, CharacterPortrait,
               ScrollView
    render/    pixel (primitives), pitch
    util/      rng
```

Gameplay logic lives in `systems/` and is kept separate from rendering.
Balancing values live in `config.ts` and the `data/` files.

---

## Controls guide

**Menus / hub** — tap buttons and cards. The single **Continue** button on the
Home screen drives the weekly loop: *Train → club event → match → advance*.

**Match (touch-first, works with mouse too):**

| Situation | Gesture |
|---|---|
| **Through-ball** | Drag from near the ball to *lead the runner* into space. Drag toward goal instead and you'll take a selfish shot — teammates notice. |
| **One-on-one / long shot** | Drag to aim: direction = placement, distance = power. Beat the keeper into the open corner. |
| **Penalty** | Drag to place it. Low composure widens the wobble. |
| **Dribble** | Wait for the defender to commit, then **swipe the opposite way**. Then **tap** to shoot. |

Rotate your phone to **landscape** for matches (a hint appears automatically).

---

## What's in the slice (§40 checklist)

Main menu · career creation (identity, look, position, background) · opening
cinematic · one starting club + 8-team Community League · six important
teammates + manager + local rival (Ashmoor) · full weekly loop · 8 training
sessions incl. interactive drills · **13 conditional story events** · teammate
relationship values (trust/respect/jealousy) that change from play · five match
situation types (through-ball, one-on-one, dribble, penalty, long shot) with
passing/shooting/dribbling · 1.0–10.0 match ratings with live deltas · league
table with promotion/relegation & golden boot · post-match news that references
the actual game · dynamic supporter comments · **Football Memory** system ·
emotional transfer offer · reputation archetypes · automatic saving · responsive
portrait-menu / landscape-match UI · coherent procedural pixel art ·
accessibility options (reduced motion/shake, high-contrast flag, volume, etc.).

---

## Known limitations (this pass)

- **Fonts** use a system/pixel-style fallback stack rather than a bundled pixel
  webfont (a fallback stack is explicitly allowed). Dropping in a `.woff2` pixel
  font is a clean future upgrade.
- Audio is **procedurally synthesised** through named hooks — real samples can
  replace the synths without touching call sites.
- `High-contrast text` and `Text size` settings are **persisted but not yet
  fully wired** into every text object.
- Accepting a transfer is resolved **narratively** (you agree to move at
  season's end) so the single-club league sim stays consistent; actually
  switching clubs mid-career arrives with multi-division support.
- Only the **early career** stage is tuned, though the data is structured for
  mid/late-career stages and additional divisions.
- Character animation covers idle / run / kick / celebrate / fall poses; the
  full animation-state list (§27) is a future art pass.
- The production JS bundle is dominated by Phaser (~1.6 MB / ~380 KB gzip).

---

## Roadmap — next development pass

1. **World depth:** promotion/relegation across all four divisions, procedural
   rosters for every club, other players developing/declining/retiring, and
   encountering former teammates later in your career.
2. **Actual transfers:** move clubs, inherit a new dressing room, and feel the
   reception when you return to the Foundry Ground.
3. **More match moments:** crossing, holding up play, tracking back, defending a
   late lead, plus goalkeeper/defender positions.
4. **Richer memories:** memories feeding rival behaviour, manager decisions and
   retirement summaries even more directly.
5. **Art & audio:** bundled pixel font, full animation states, real sound design
   and a lo-fi soundtrack; deeper stadium/town upgrade visuals.
6. **Accessibility polish:** wire text-scale and high-contrast through all UI.

---

## Deploying

The build is fully static and uses relative asset paths (`base: './'`), so
`dist/` deploys as-is to:

- **GitHub Pages** — publish the `dist/` folder (e.g. via an action or the
  `gh-pages` branch).
- **Netlify / Vercel** — build command `npm run build`, publish directory
  `dist`.
- **itch.io (HTML5)** — zip the contents of `dist/` and upload as an HTML game;
  set `index.html` as the entry.

---

## Saves

Careers autosave after every week and every match to `localStorage` (3 slots).
Export a career to JSON from **Career → Export Save**, and re-import it from the
main menu. Corrupted or future-version saves are refused gracefully rather than
crashing.

All clubs, players, competitions and stories are **original and fictional**.

# Finding Nuridana — Game Design Document

> "A small journey through forgotten memories."
> A Game Boy inspired, story-driven adventure made with love by Musaab.

---

## 1. Overview

**Finding Nuridana** is a short, gentle, emotional adventure that runs entirely in
the browser. The player controls **Nuridana**, who wakes in a mysterious *memory
garden* having forgotten most of who she is. By visiting glowing memory markers she
slowly rediscovers her personality, the things she loves, moments she lived, and the
people who cared for her — eventually finding that someone, **Musaab**, has been
quietly searching for her.

The game is intentionally **not** an apology simulator. It is warm, nostalgic, and
honest. It acknowledges that love includes mistakes, space, and growth.

| | |
|---|---|
| **Genre** | Narrative top-down adventure with light mini-games |
| **Platform** | Browser (mobile-first, also desktop) |
| **Tech** | Vanilla HTML / CSS / JavaScript, Canvas 2D, Web Audio. No build step, no backend. |
| **Resolution** | 160×144 internal (true Game Boy), scaled with `image-rendering: pixelated` |
| **Session length** | ~15–25 minutes |
| **Save** | `localStorage` (auto-saved on each checkpoint / secret) |

### Tone pillars
- Gentle, playful, mature.
- Never begs, never guilt-trips, never claims to be "perfect now".
- Honest about hurt as well as warmth.
- References to *Pokémon* (overworld feel), *Zelda GBC* (exploration), *Stardew*
  (cozy emotional beats) and *To The Moon* (memory storytelling).

---

## 2. Core Loop

1. **Explore** the memory garden (free roam, top-down).
2. **Reach** the next glowing memory marker.
3. **Play** a short themed mini-game / scene.
4. **Recover a memory** — a quote card is unlocked into the Memory Album.
5. The next marker activates. Repeat through 8 checkpoints.
6. **Wander** off-path to find 5 hidden secret memories at any time.

There is **no fail state**. The game is about remembering, slowly.

---

## 3. Controls

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrow keys | Left virtual joystick |
| Interact / Confirm | Space / Enter | Green **●** Interact button, **A** button |
| Advance dialogue | Space / Enter / tap screen | Tap screen / A / Interact |
| Menu select | Arrow Up/Down | Tap the choice |
| Pause | ☰ HUD button | ☰ HUD button |

`A` doubles as confirm/interact for convenience. `B` is reserved.

---

## 4. Checkpoints (8 memories)

| # | Title | Ambience | Mini-game | Memory unlocked |
|---|---|---|---|---|
| 1 | The Forgotten Appetite | day | Collect 6 favourite foods | *I always smile when food tastes like comfort.* |
| 2 | The Friend's Staycation | day | Gather picnic items | *Someone who cares for me should also respect my space.* |
| 3 | The Storm of Thoughts | storm | Navigate a maze of intrusive thoughts | *Not every thought I have is the truth.* |
| 4 | The Bus Journey | sunset | Catch memory fragments from the window | *Sincere effort is its own kind of language.* |
| 5 | The Golden Promise | sunset | Open 3 gifts, look past the wrapping | *The most valuable thing was never the gift. It was the intention.* |
| 6 | The Broken Mirror | night | Gather honest, painful shards | *Love cannot grow where pain is ignored.* |
| 7 | The Path Forward | sunset | Rebuild 4 bridges (patience, communication, trust, consistency) | *Growth is not proving you've changed once. It is choosing better every day.* |
| 8 | The Final Garden | sunset | Walk the hill, quiet conversation, 3 choices | *You are not what you forgot. You are everything you chose to remember.* |

**Foods (CP1):** Ayam Gepuk, Mee Celup, Sukiya, Zus Coffee, Baskin Robbins, Inside Scoop.

**CP6 honesty rule:** Musaab's anger, silence, careless words and broken plans are
shown directly — not hidden. The narrator line *"Love cannot grow where pain is
ignored"* closes the chapter.

**CP8 final scene:** No running, no crying, no begging. A short conversation, then
3 equally-valid choices: *Sit and watch the sunset*, *Walk through the garden*, or
*Keep exploring the world*.

---

## 5. Secret Collectibles

Five hidden memories are scattered off the main path. Finding all of them, plus the
8 checkpoint memories, completes the **Memory Album**.

1. The First Laugh
2. The Favourite Drink
3. A Random 2AM Talk
4. The Inside Joke
5. The Cat Detour

---

## 6. Story Script (beats)

1. **Wake.** Nuridana opens her eyes in a garden that "should not exist." She knows
   only her name.
2. **The Gardener.** An old gardener explains this is a memory garden and invites her
   to follow the glowing places — gently, with no rush.
3. **Comfort (CP1).** Small joys: food, shared bites, little arguments.
4. **Space (CP2).** Friends are happy without her present; love is not possession.
5. **Calm (CP3).** Overthinking visualised as a storm; thoughts are not facts.
6. **Effort (CP4).** Someone travelled far by bus — sincerity over grand gestures.
7. **Intention (CP5).** Gifts matter for the attention behind them, not the price.
8. **Honesty (CP6).** The hard memories: anger, silence, hurt. Not erased.
9. **Growth (CP7).** Rebuilding takes consistent small acts, not one performance.
10. **Reunion (CP8).** Musaab is found — ordinary, flawed, paying attention now. The
    player chooses how the evening unfolds.

### Final conversation (verbatim direction)
- Musaab: "I spent a long time looking for answers."
- Nuridana: "Did you find them?"
- Musaab: "Not all of them." … "But I found something important."
- Nuridana: "What is it?"
- Musaab: "That caring for someone means learning every day how to care for them better."
- Musaab: "I got a lot wrong. I'm not going to pretend I didn't."
- Musaab: "Some people hurt the ones they love before they learn how precious they are."

Full dialogue lives in `js/data.js` (`INTRO`, each checkpoint's `intro`/`outro`, and
`CHECKPOINTS[7].final`).

---

## 7. UI / Wireframe

```
+----------------------------------------------------+
|  [Chapter name]                      ✦ 4/13   [☰]  |  <- HUD (DOM)
|                                                    |
|                 PIXEL GAME WORLD                   |  <- Canvas 160x144 (scaled)
|              (camera follows player)               |
|                                                    |
|  +----------------------------------------------+  |
|  | NAME                                         |  |  <- Dialogue box (DOM)
|  | Typewriter text...                       ▶   |  |
|  +----------------------------------------------+  |
+----------------------------------------------------+
|   ( joystick )                       (B)  (A)      |  <- Touch controls (DOM)
|        ◉                              (●)          |
+----------------------------------------------------+
```

- **Title screen:** sunset gradient, falling petals, `Finding Nuridana`, subtitle,
  Begin / Continue / Memory Album, "Made with love by Musaab."
- **Memory card:** parchment card with icon, title, and the unlocked quote.
- **Memory Album:** responsive grid of cards (locked cards show 🔒).
- **Pause:** Resume / Album / Sound toggle / Return to title.

Rendering is a **hybrid**: the world is drawn on the Canvas; all text-heavy UI
(dialogue, menus, album, HUD) is DOM for crispness and accessibility.

---

## 8. Asset List

All visuals are **drawn procedurally in code** (`js/render.js`) — there are no image
files to download. All audio is **synthesised** with the Web Audio API
(`js/audio.js`) — no sound files.

**Procedural sprites / tiles:** grass, path, water, tree, bush, rock, flower, fence,
memory node marker, character (Nuridana / Musaab / Gardener with 4 facings + walk
frames), food items, picnic items, gift, mirror shard, memory fragment, shadow
"thought" creature, bus, bridge plank, hill, sun, moon, stars.

**Procedural particles:** petals, fireflies, birds, collect sparkles.

**Synthesised audio:**
- Music loops: `title`, `garden`, `hope`, `sad`, `ending` (lead + bass + sparkle).
- SFX: `blip`, `confirm`, `collect`, `secret`, `success`, `hurt`, `step`, `wind`.
- Ambient: birdsong loop, wind gusts.

**Fonts (CDN):** *Press Start 2P* (titles/HUD), *Quicksand* (body). The game degrades
gracefully to system fonts if offline.

---

## 9. Folder Structure

```
finding-nuridana/
├── index.html            # Shell: canvas, HUD, dialogue, overlays, touch controls
├── css/
│   └── style.css         # Responsive layout, sunset palette, controls, overlays
├── js/
│   ├── data.js           # Palette, ambience, full story & checkpoint data
│   ├── audio.js          # Web Audio chiptune engine (music + sfx + ambient)
│   ├── save.js           # localStorage save/load/reset
│   ├── input.js          # Keyboard + touch joystick + action buttons
│   ├── particles.js      # Petals, fireflies, birds, sparkles
│   ├── render.js         # Procedural pixel renderer (sky, tiles, sprites, text)
│   ├── dialogue.js       # DOM typewriter dialogue + choices
│   ├── scenes.js         # OverworldScene + MiniGameScene (5 modes)
│   ├── game.js           # State machine, loop, HUD, overlays, checkpoint flow
│   └── main.js           # Bootstrap: wires DOM, unlocks audio, starts loop
└── docs/
    └── GAME_DESIGN.md     # This document
```

---

## 10. Architecture

- **`Game`** (singleton) owns the loop and a small state machine (`title` / `play`)
  plus overlay flags (`paused`, `albumOpen`, `memoryOpen`). It orchestrates
  checkpoints: `startCheckpoint → intro dialogue → MiniGameScene → outro → memory
  card → save → next marker`.
- **Scenes** implement `enter() / update() / draw()`. `OverworldScene` is the garden;
  `MiniGameScene` switches between modes `collect | maze | runner | bridge | final`.
- **Renderer** draws at 160×144 with a camera that clamps to world bounds.
- **DialogueManager** handles the DOM typewriter and choice navigation.
- **AudioEngine** schedules note sequences via a lookahead `setInterval` and renders
  SFX from oscillators — fully offline-capable.
- **SaveManager** persists progress, unlocked memories, found secrets, the final
  choice, and the mute setting.

---

## 11. Mobile Optimisation

- `viewport-fit=cover`, `touch-action: none`, no text selection, no tap highlight.
- Layout uses `100dvh` and flex so the screen sits on top and controls sit below,
  fitting notched phones.
- Canvas keeps a strict 160:144 aspect ratio and scales to the available space.
- Audio is unlocked on first touch/keypress to satisfy autoplay policies.
- Touch joystick uses pointer tracking with a dead-zone; action buttons are large and
  spaced for thumbs.

---

## 12. How to Run

No build step. Either:

- **Double-click `index.html`** (works offline; fonts fall back to system fonts), or
- Serve the folder for the best experience:

```
# from finding-nuridana/
python -m http.server 8000
# then open http://localhost:8000
```

Open on a phone for the full touch experience. Progress saves automatically.

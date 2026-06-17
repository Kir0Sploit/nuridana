/* =====================================================================
   scenes.js — OverworldScene (the memory garden) and MiniGameScene
   (collect / maze / runner / bridge / final).
   Scenes read input from game.input and draw with game.r (Renderer).
   ===================================================================== */

/* ---------- small helpers ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

/* =====================================================================
   OVERWORLD
   ===================================================================== */
window.OverworldScene = class OverworldScene {
  constructor(game) {
    this.g = game;
    this.TILE = 16;
    this.WT = 42; this.HT = 26;
    this.worldW = this.WT * this.TILE;
    this.worldH = this.HT * this.TILE;
    this.blocked = new Set();
    this.decos = [];
    this.flowers = [];
    this.nodes = [];
    this.secrets = [];
    this.npc = null;
    this._build();
    this.player = { x: this.spawn.x, y: this.spawn.y, dir: 'down', moving: false, flip: false };
    this.toastTimer = 0;
  }

  _key(tx, ty) { return tx + ',' + ty; }
  isBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.WT || ty >= this.HT) return true;
    return this.blocked.has(this._key(tx, ty));
  }

  _build() {
    const T = this.TILE;
    const rng = mulberry32(20240617);
    // node positions (tiles)
    const nodeTiles = [
      [5, 21], [13, 18], [21, 21], [29, 17],
      [35, 12], [27, 8], [17, 9], [9, 5]
    ];
    this.nodes = nodeTiles.map((p, i) => ({ id: i + 1, tx: p[0], ty: p[1], x: p[0] * T, y: p[1] * T }));
    this.spawn = { x: 6 * T + 8, y: 23 * T + 8 };

    // base ground grid: default grass
    this.ground = [];
    for (let y = 0; y < this.HT; y++) { this.ground[y] = []; for (let x = 0; x < this.WT; x++) this.ground[y][x] = 'grass'; }

    // carve a guiding path between spawn and nodes in order
    const waypoints = [[6, 23], ...nodeTiles];
    for (let i = 0; i < waypoints.length - 1; i++) this._carvePath(waypoints[i], waypoints[i + 1]);

    // border trees
    for (let x = 0; x < this.WT; x++) { this._tree(x, 0); this._tree(x, this.HT - 1); }
    for (let y = 1; y < this.HT - 1; y++) { this._tree(0, y); this._tree(this.WT - 1, y); }

    // pond (top-left)
    for (let y = 2; y <= 5; y++) for (let x = 2; x <= 6; x++) {
      this.ground[y][x] = 'water'; this.blocked.add(this._key(x, y));
    }

    // tree clusters (avoid nodes & path)
    const clusters = [[10, 12], [24, 13], [32, 21], [33, 6], [16, 22], [20, 6]];
    for (const c of clusters) {
      for (let k = 0; k < 4; k++) {
        const tx = c[0] + (rng() * 3 | 0) - 1;
        const ty = c[1] + (rng() * 3 | 0) - 1;
        if (this._farFromNodes(tx, ty, 2) && this.ground[ty] && this.ground[ty][tx] === 'grass')
          this._tree(tx, ty);
      }
    }

    // scattered bushes (collidable) and rocks
    for (let i = 0; i < 10; i++) {
      const tx = 2 + (rng() * (this.WT - 4) | 0);
      const ty = 2 + (rng() * (this.HT - 4) | 0);
      if (this.ground[ty][tx] === 'grass' && !this.isBlocked(tx, ty) && this._farFromNodes(tx, ty, 2)) {
        const type = rng() < 0.5 ? 'bush' : 'rock';
        this.decos.push({ type, tx, ty });
        this.blocked.add(this._key(tx, ty));
      }
    }

    // flowers (decorative, walkable)
    const flowerColors = [COLORS.red, COLORS.purple, COLORS.yellow, COLORS.pink, COLORS.white];
    for (let i = 0; i < 60; i++) {
      const tx = 1 + (rng() * (this.WT - 2) | 0);
      const ty = 1 + (rng() * (this.HT - 2) | 0);
      if (this.ground[ty][tx] === 'grass' && !this.isBlocked(tx, ty))
        this.flowers.push({ tx, ty, color: flowerColors[rng() * flowerColors.length | 0] });
    }

    // gardener NPC near spawn
    this.npc = { type: 'gardener', tx: 8, ty: 22, x: 8 * T, y: 22 * T };
    this.blocked.add(this._key(8, 22));

    // secrets hidden around the map (walkable tiles, off the obvious path)
    const secretTiles = [[3, 9], [38, 4], [37, 23], [2, 16], [21, 3]];
    this.secrets = window.SECRETS.map((s, i) => {
      const t = secretTiles[i] || [3 + i, 3];
      // ensure walkable
      this.blocked.delete(this._key(t[0], t[1]));
      if (this.ground[t[1]]) this.ground[t[1]][t[0]] = 'grass';
      return { id: s.id, data: s, tx: t[0], ty: t[1], x: t[0] * T + 8, y: t[1] * T + 8 };
    });

    // clear node tiles of obstacles
    for (const n of this.nodes) this.blocked.delete(this._key(n.tx, n.ty));
  }

  _farFromNodes(tx, ty, d) {
    for (const p of [[5, 21], [13, 18], [21, 21], [29, 17], [35, 12], [27, 8], [17, 9], [9, 5], [6, 23], [8, 22]])
      if (Math.abs(p[0] - tx) <= d && Math.abs(p[1] - ty) <= d) return false;
    return true;
  }
  _tree(tx, ty) {
    if (ty < 0 || ty >= this.HT || tx < 0 || tx >= this.WT) return;
    this.decos.push({ type: 'tree', tx, ty });
    this.blocked.add(this._key(tx, ty));
  }
  _carvePath(a, b) {
    let [x, y] = a; const [bx, by] = b;
    const lay = (cx, cy) => { if (this.ground[cy] && this.ground[cy][cx]) this.ground[cy][cx] = 'path'; };
    while (x !== bx) { lay(x, y); lay(x, y + 1); x += x < bx ? 1 : -1; }
    while (y !== by) { lay(x, y); lay(x + 1, y); y += y < by ? 1 : -1; }
    lay(bx, by);
  }

  /* ---------- node state ---------- */
  nodeState(id) {
    const s = this.g.save.data;
    if (s.completed.includes(id)) return 'done';
    if (id === s.progress + 1) return 'active';
    return 'locked';
  }

  enter() {
    const amb = this.g.save.data.progress >= 6 ? 'sunset' : 'day';
    this.ambience = amb;
    this.g.setAmbience(amb);
    this.g.audio.playMusic(this.g.save.data.progress >= 6 ? 'hope' : 'garden');
    this.g.setHudChapter('The Memory Garden');
    this.g.clearMiniHud();
    this.g.input.setControlsVisible(true);
    this.g.refreshHud();
  }

  update() {
    const g = this.g;
    if (g.dlg.isActive()) return;
    const p = this.player;
    const mv = g.input.movement();
    let mag = Math.hypot(mv.x, mv.y);
    p.moving = mag > 0.1;
    if (p.moving) {
      let nx = mv.x, ny = mv.y;
      if (mag > 1) { nx /= mag; ny /= mag; }
      const sp = 1.15;
      this._tryMove(p, nx * sp, ny * sp);
      if (Math.abs(nx) > Math.abs(ny)) { p.dir = 'side'; p.flip = nx < 0; }
      else p.dir = ny < 0 ? 'up' : 'down';
    }

    // secrets pickup
    for (const s of this.secrets) {
      if (!g.save.hasSecret(s.id) && dist(p.x, p.y, s.x, s.y) < 12) {
        if (g.save.findSecret(s.id)) {
          g.audio.sfx('secret');
          g.particles.burst(s.x - g.r.cam.x, s.y - g.r.cam.y, '#ffd0e0', 14);
          g.addMemory();
          g.showToast('Hidden memory found: ' + s.data.title);
          g.refreshHud();
        }
      }
    }

    // interact: nodes / gardener
    if (g.input.pressed('interact')) {
      // gardener
      if (dist(p.x, p.y, this.npc.x + 8, this.npc.y + 8) < 22) {
        const hint = window.GARDENER_HINTS[Math.min(g.save.data.progress, window.GARDENER_HINTS.length - 1)];
        g.dlg.show([{ name: 'Old Gardener', text: hint }]);
        return;
      }
      // nodes
      for (const n of this.nodes) {
        if (dist(p.x, p.y, n.x + 8, n.y + 8) < 20) {
          const st = this.nodeState(n.id);
          if (st === 'active') { g.startCheckpoint(n.id - 1); return; }
          if (st === 'done')   { g.dlg.show([{ name: 'Nuridana', text: 'I remember this one already. It still makes me smile.' }]); return; }
          g.dlg.show([{ name: 'Nuridana', text: 'This memory is still hidden. I should follow the ones I can reach first.' }]); return;
        }
      }
    }
  }

  _tryMove(p, dx, dy) {
    const hw = 5, hh = 4; // half collision box (feet area)
    // X axis
    let nx = p.x + dx;
    if (!this._boxBlocked(nx, p.y + 4, hw, hh)) p.x = nx;
    // Y axis
    let ny = p.y + dy;
    if (!this._boxBlocked(p.x, ny + 4, hw, hh)) p.y = ny;
    p.x = Math.max(8, Math.min(this.worldW - 8, p.x));
    p.y = Math.max(10, Math.min(this.worldH - 6, p.y));
  }
  _boxBlocked(cx, cy, hw, hh) {
    const T = this.TILE;
    const pts = [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx - hw, cy + hh], [cx + hw, cy + hh]];
    for (const [px, py] of pts) if (this.isBlocked(Math.floor(px / T), Math.floor(py / T))) return true;
    return false;
  }

  draw() {
    const g = this.g, r = g.r;
    r.setCamera(this.player.x, this.player.y, this.worldW, this.worldH);
    r.sky(this.ambience);

    // visible tile range
    const T = this.TILE;
    const x0 = Math.max(0, Math.floor(r.cam.x / T) - 1);
    const y0 = Math.max(0, Math.floor(r.cam.y / T) - 1);
    const x1 = Math.min(this.WT, x0 + (r.VW / T) + 3);
    const y1 = Math.min(this.HT, y0 + (r.VH / T) + 3);

    // ground
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const t = this.ground[y][x];
      if (t === 'grass') r.grass(x * T, y * T, x * 31 + y * 17);
      else if (t === 'path') r.path(x * T, y * T, x * 13 + y * 7);
      else if (t === 'water') r.water(x * T, y * T);
    }

    // flowers
    for (const f of this.flowers) if (f.tx >= x0 && f.tx < x1 && f.ty >= y0 && f.ty < y1) r.flower(f.tx * T, f.ty * T, f.color);

    // nodes (under entities)
    for (const n of this.nodes) r.node(n.x, n.y, this.nodeState(n.id));

    // secrets (subtle shimmer)
    for (const s of this.secrets) if (!g.save.hasSecret(s.id)) {
      const tw = (Math.sin(r.t * 0.07 + s.tx) + 1) / 2;
      r.ctx.globalAlpha = 0.2 + tw * 0.3;
      r.circle(s.x - r.cam.x, s.y - r.cam.y, 3, '#ffe9b0');
      r.ctx.globalAlpha = 1;
    }

    // build a y-sorted draw list of decorations + npc + player
    const drawables = [];
    for (const d of this.decos) {
      if (d.tx < x0 - 1 || d.tx > x1 || d.ty < y0 - 1 || d.ty > y1) continue;
      drawables.push({ y: d.ty * T + 16, fn: () => {
        if (d.type === 'tree') r.tree(d.tx * T, d.ty * T);
        else if (d.type === 'bush') r.bush(d.tx * T, d.ty * T);
        else if (d.type === 'rock') r.rock(d.tx * T, d.ty * T);
      }});
    }
    drawables.push({ y: this.npc.y + 16, fn: () =>
      r.character(this.npc.x, this.npc.y, { skin: COLORS.skin, hair: COLORS.gardBeard, cloth: COLORS.gardRobe, clothD: COLORS.gardRobeD, dir: 'down', beard: true }) });
    const p = this.player;
    drawables.push({ y: p.y + 16, fn: () =>
      r.character(Math.round(p.x) - 8, Math.round(p.y) - 12, { dir: p.dir, flip: p.flip, moving: p.moving, blush: true }) });

    drawables.sort((a, b) => a.y - b.y);
    drawables.forEach(d => d.fn());

    // particles overlay
    g.particles.draw(r.ctx);
  }
};

/* =====================================================================
   MINI-GAME SCENE
   ===================================================================== */
window.MiniGameScene = class MiniGameScene {
  constructor(game, cp) {
    this.g = game;
    this.cp = cp;
    this.mode = cp.mode;
    this.done = false;
    this.TILE = 16;
    this._init();
  }

  _init() {
    this.g.setAmbience(this.cp.ambience);
    const cp = this.cp;
    if (this.mode === 'collect') this._initCollect();
    else if (this.mode === 'maze') this._initMaze();
    else if (this.mode === 'runner') this._initRunner();
    else if (this.mode === 'bridge') this._initBridge();
    else if (this.mode === 'final') this._initFinal();
    this.g.input.setControlsVisible(true);
    this.g.setHudChapter(cp.chapter + ' — ' + cp.title);
  }

  enter() {
    const cp = this.cp;
    const dark = cp.ambience === 'night' || cp.ambience === 'storm';
    this.g.audio.playMusic(dark ? (cp.mode === 'collect' ? 'sad' : 'sad') :
      (cp.mode === 'final' ? 'ending' : 'garden'));
    this._refreshHud();
  }

  _refreshHud() {
    const cp = this.cp;
    if (this.mode === 'collect') {
      this.g.miniHud(cp.task, this.items.map(it => ({ label: it.label, done: it.taken })));
    } else if (this.mode === 'maze') {
      this.g.miniHud(cp.task, []);
    } else if (this.mode === 'runner') {
      this.g.miniHud(cp.task, [{ label: 'Fragments ' + this.collected + ' / ' + this.need, done: false }]);
    } else if (this.mode === 'bridge') {
      this.g.miniHud(cp.task, this.gaps.map(gp => ({ label: gp.label, done: gp.built })));
    } else if (this.mode === 'final') {
      this.g.miniHud(cp.task, []);
    }
  }

  /* =================== COLLECT =================== */
  _initCollect() {
    const cp = this.cp;
    this.worldW = this.g.r.VW; this.worldH = this.g.r.VH;
    this.player = { x: this.worldW / 2, y: this.worldH - 30, dir: 'up', moving: false, flip: false };
    this.dark = !!cp.collect.dark;
    this.interactCollect = !!cp.collect.interact;
    this.perItemMessage = !!cp.collect.perItemMessage;
    const list = cp.collect.items;
    const cx = this.worldW / 2, cy = this.worldH / 2 - 8;
    this.items = list.map((it, i) => {
      const ang = (i / list.length) * Math.PI * 2 - Math.PI / 2;
      const rad = 44 + (i % 2) * 14;
      return {
        label: it.label, icon: it.icon, msg: it.msg, taken: false,
        x: Math.max(20, Math.min(this.worldW - 20, cx + Math.cos(ang) * rad)),
        y: Math.max(28, Math.min(this.worldH - 36, cy + Math.sin(ang) * rad * 0.8))
      };
    });
    this.remaining = this.items.length;
  }

  _updateCollect() {
    const g = this.g, p = this.player;
    if (g.dlg.isActive()) return;
    const mv = g.input.movement();
    const mag = Math.hypot(mv.x, mv.y);
    p.moving = mag > 0.1;
    if (p.moving) {
      let nx = mv.x, ny = mv.y; if (mag > 1) { nx /= mag; ny /= mag; }
      p.x += nx * 1.2; p.y += ny * 1.2;
      p.x = Math.max(10, Math.min(this.worldW - 10, p.x));
      p.y = Math.max(24, Math.min(this.worldH - 12, p.y));
      if (Math.abs(nx) > Math.abs(ny)) { p.dir = 'side'; p.flip = nx < 0; } else p.dir = ny < 0 ? 'up' : 'down';
    }
    const grab = (it) => {
      it.taken = true; this.remaining--;
      g.audio.sfx('collect');
      g.particles.burst(it.x - g.r.cam.x, it.y - g.r.cam.y, '#ffd266', 10);
      this._refreshHud();
      const finishOrMsg = () => { if (this.remaining <= 0) this._complete(); };
      if (this.perItemMessage && it.msg) g.dlg.show([{ name: '', text: it.msg }], finishOrMsg);
      else finishOrMsg();
    };
    for (const it of this.items) {
      if (it.taken) continue;
      const d = dist(p.x, p.y, it.x, it.y);
      if (this.interactCollect) { if (d < 18 && g.input.pressed('interact')) { grab(it); break; } }
      else if (d < 12) { grab(it); break; }
    }
  }

  _drawCollect() {
    const g = this.g, r = g.r;
    r.setCamera(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH);
    r.sky(this.cp.ambience);
    const T = this.TILE;
    for (let y = 0; y < Math.ceil(this.worldH / T); y++)
      for (let x = 0; x < Math.ceil(this.worldW / T); x++)
        r.grass(x * T, y * T, x * 31 + y * 17 + this.cp.id * 7);
    // a soft frame of flowers
    for (let i = 0; i < 6; i++) r.flower((12 + i * 22), this.worldH - 16, [COLORS.pink, COLORS.purple, COLORS.yellow][i % 3]);

    const draw = [];
    for (const it of this.items) if (!it.taken) draw.push({ y: it.y, fn: () => r.item(it.x - 8, it.y - 8, it.icon) });
    const p = this.player;
    draw.push({ y: p.y, fn: () => r.character(Math.round(p.x) - 8, Math.round(p.y) - 12, { dir: p.dir, flip: p.flip, moving: p.moving, blush: true }) });
    draw.sort((a, b) => a.y - b.y); draw.forEach(d => d.fn());

    if (this.dark) r.vignetteDark(0.42);
    g.particles.draw(r.ctx);
  }

  /* =================== MAZE =================== */
  _initMaze() {
    const cp = this.cp;
    const cols = cp.maze.cols | 1, rows = cp.maze.rows | 1;
    this.cols = cols; this.rows = rows;
    this.worldW = cols * 16; this.worldH = rows * 16;
    const rng = mulberry32(cp.id * 7919 + 13);
    // generate maze (1 = wall)
    const grid = []; for (let y = 0; y < rows; y++) { grid[y] = []; for (let x = 0; x < cols; x++) grid[y][x] = 1; }
    const carve = (cx, cy) => {
      grid[cy][cx] = 0;
      const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
      for (let i = dirs.length - 1; i > 0; i--) { const j = rng() * (i + 1) | 0; [dirs[i], dirs[j]] = [dirs[j], dirs[i]]; }
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && grid[ny][nx] === 1) {
          grid[cy + dy / 2][cx + dx / 2] = 0; carve(nx, ny);
        }
      }
    };
    carve(1, 1);
    this.grid = grid;
    this.blocked = new Set();
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (grid[y][x] === 1) this.blocked.add(x + ',' + y);
    this.start = { tx: 1, ty: 1 };
    this.exit = { tx: cols - 2, ty: rows - 2 };
    this.player = { x: 1 * 16 + 8, y: 1 * 16 + 8, dir: 'down', moving: false, flip: false };

    // floor cells for shadows
    const floors = [];
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++)
      if (grid[y][x] === 0 && !(x < 3 && y < 3) && !(x === this.exit.tx && y === this.exit.ty)) floors.push([x, y]);
    this.shadows = [];
    const count = Math.min(4, cp.maze.thoughts.length);
    for (let i = 0; i < count; i++) {
      const c = floors[(rng() * floors.length) | 0] || [cols - 3, rows - 2];
      this.shadows.push({ x: c[0] * 16 + 8, y: c[1] * 16 + 8, tx: c[0], ty: c[1], txTarget: c[0], tyTarget: c[1], spd: 0.5 + rng() * 0.3 });
    }
    this.thoughts = cp.maze.thoughts.slice();
    this.thoughtIdx = 0;
    this.hitCooldown = 0;
  }

  _mazeBlocked(cx, cy) {
    const tx = Math.floor(cx / 16), ty = Math.floor(cy / 16);
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    return this.blocked.has(tx + ',' + ty);
  }

  _updateMaze() {
    const g = this.g, p = this.player;
    if (g.dlg.isActive()) return;
    if (this.hitCooldown > 0) this.hitCooldown--;
    const mv = g.input.movement();
    const mag = Math.hypot(mv.x, mv.y);
    p.moving = mag > 0.1;
    if (p.moving) {
      let nx = mv.x, ny = mv.y; if (mag > 1) { nx /= mag; ny /= mag; }
      const sp = 1.1, hw = 4, hh = 4;
      let tx = p.x + nx * sp;
      if (!this._mazeBoxBlocked(tx, p.y, hw, hh)) p.x = tx;
      let ty = p.y + ny * sp;
      if (!this._mazeBoxBlocked(p.x, ty, hw, hh)) p.y = ty;
      if (Math.abs(nx) > Math.abs(ny)) { p.dir = 'side'; p.flip = nx < 0; } else p.dir = ny < 0 ? 'up' : 'down';
    }
    // shadows move
    for (const s of this.shadows) {
      const tgx = s.txTarget * 16 + 8, tgy = s.tyTarget * 16 + 8;
      const dx = tgx - s.x, dy = tgy - s.y;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
        // pick new neighbor
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([ox, oy]) => {
          const nx = s.tx + ox, ny = s.ty + oy;
          return nx > 0 && ny > 0 && nx < this.cols - 1 && ny < this.rows - 1 && this.grid[ny][nx] === 0;
        });
        if (opts.length) { const o = opts[(Math.random() * opts.length) | 0]; s.tx += o[0]; s.ty += o[1]; s.txTarget = s.tx; s.tyTarget = s.ty; }
      } else {
        s.x += Math.sign(dx) * s.spd; s.y += Math.sign(dy) * s.spd;
      }
      if (this.hitCooldown === 0 && dist(p.x, p.y, s.x, s.y) < 11) {
        this.hitCooldown = 90;
        g.audio.sfx('hurt');
        const th = this.thoughts[this.thoughtIdx % this.thoughts.length]; this.thoughtIdx++;
        g.dlg.show([{ name: 'A thought', text: th }, { name: 'Nuridana', text: 'It\'s only a thought. I can keep walking.' }]);
        // gently send back toward start
        p.x = this.start.tx * 16 + 8; p.y = this.start.ty * 16 + 8;
        return;
      }
    }
    // reached exit?
    if (Math.floor(p.x / 16) === this.exit.tx && Math.floor(p.y / 16) === this.exit.ty) this._complete();
  }
  _mazeBoxBlocked(cx, cy, hw, hh) {
    return this._mazeBlocked(cx - hw, cy - hh) || this._mazeBlocked(cx + hw, cy - hh) ||
           this._mazeBlocked(cx - hw, cy + hh) || this._mazeBlocked(cx + hw, cy + hh);
  }
  _drawMaze() {
    const g = this.g, r = g.r;
    r.setCamera(this.player.x, this.player.y, this.worldW, this.worldH);
    r.sky('storm');
    const T = 16;
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.cols; x++) {
      const sx = x * T - r.cam.x, sy = y * T - r.cam.y;
      if (sx < -16 || sy < -16 || sx > r.VW || sy > r.VH) continue;
      if (this.grid[y][x] === 1) { r.r(x * T, y * T, 16, 16, '#241f33'); r.r(x * T, y * T, 16, 2, '#34304a'); }
      else r.r(x * T, y * T, 16, 16, '#3a3550');
    }
    // exit light
    const ex = this.exit.tx * T, ey = this.exit.ty * T;
    const pulse = (Math.sin(r.t * 0.1) + 1) / 2;
    r.ctx.globalAlpha = 0.4 + pulse * 0.4;
    r.circle(ex + 8 - r.cam.x, ey + 8 - r.cam.y, 8, 'rgba(255,225,160,0.7)'); r.ctx.globalAlpha = 1;
    r.r(ex + 5, ey + 5, 6, 6, '#ffe9b0');
    // shadows
    for (const s of this.shadows) r.shadow(s.x - 8, s.y - 8);
    // player
    const p = this.player;
    r.character(Math.round(p.x) - 8, Math.round(p.y) - 12, { dir: p.dir, flip: p.flip, moving: p.moving, cloth: COLORS.nuriDress });
    r.vignetteDark(0.32);
    g.particles.draw(r.ctx);
  }

  /* =================== RUNNER (bus) =================== */
  _initRunner() {
    const cp = this.cp;
    this.need = cp.runner.need;
    this.collected = 0;
    this.fragTexts = cp.runner.fragments.slice();
    this.fragIdx = 0;
    this.winTop = 70; this.winBot = 118;
    this.player = { x: 46, y: (this.winTop + this.winBot) / 2, dir: 'side', flip: false, moving: false };
    this.frags = [];
    this.spawnTimer = 0;
    this.scrollX = 0;
    this.caption = '';
    this.captionTimer = 0;
  }
  _updateRunner() {
    const g = this.g; const r = g.r;
    if (g.dlg.isActive()) return;
    this.scrollX += 1.4;
    const p = this.player;
    const mv = g.input.movement();
    p.y += mv.y * 1.6;
    p.y = Math.max(this.winTop + 4, Math.min(this.winBot - 4, p.y));
    p.moving = Math.abs(mv.y) > 0.1;
    // spawn fragments
    this.spawnTimer--;
    if (this.spawnTimer <= 0 && this.collected < this.need) {
      this.spawnTimer = 40 + (Math.random() * 30 | 0);
      this.frags.push({ x: r.VW + 10, y: this.winTop + 6 + Math.random() * (this.winBot - this.winTop - 12), taken: false });
    }
    for (let i = this.frags.length - 1; i >= 0; i--) {
      const f = this.frags[i];
      f.x -= 1.6;
      if (!f.taken && dist(f.x, f.y, p.x, p.y) < 12) {
        f.taken = true; this.collected++;
        g.audio.sfx('collect');
        g.particles.burst(f.x, f.y, '#ffe9b0', 10);
        this.caption = this.fragTexts[this.fragIdx % this.fragTexts.length]; this.fragIdx++;
        this.captionTimer = 150;
        this._refreshHud();
        if (this.collected >= this.need) { this._complete(); return; }
      }
      if (f.x < -12) this.frags.splice(i, 1);
    }
    if (this.captionTimer > 0) this.captionTimer--;
  }
  _drawRunner() {
    const g = this.g, r = g.r;
    r.cam.x = 0; r.cam.y = 0;
    r.sky('sunset');
    // parallax hills
    r.ctx.fillStyle = '#9a5a7a';
    for (let i = 0; i < 4; i++) {
      const hx = (i * 70 - (this.scrollX * 0.3) % 70);
      r.circle(hx + 30, 64, 30, '#a86a86');
    }
    // ground line
    r.r(0, 60, r.VW, 10, '#7a4a5a');
    // road
    r.r(0, 66, r.VW, 8, '#4a3a4a');
    for (let i = 0; i < 8; i++) { const dx = (i * 28 - (this.scrollX) % 28); r.r(dx, 69, 12, 2, '#ffe08a'); }

    // bus interior strip
    r.r(0, this.winTop - 4, r.VW, r.VH - (this.winTop - 4), '#caa37a');
    r.r(0, this.winTop - 4, r.VW, 4, '#8a6a4a');
    // window frame (where fragments drift)
    r.r(6, this.winTop, r.VW - 12, this.winBot - this.winTop + 6, '#bfe2f2');
    r.r(6, this.winTop, r.VW - 12, 3, '#8fc6dc');
    // passing scenery inside window
    r.ctx.save();
    for (let i = 0; i < 6; i++) {
      const tx = ((i * 40 - this.scrollX) % (r.VW + 40));
      const xx = tx < -20 ? tx + (r.VW + 40) : tx;
      r.r(xx + 8, this.winTop + 6, 3, 10, '#5a8a4a');
      r.circle(xx + 9, this.winTop + 6, 5, '#6bab4d');
    }
    r.ctx.restore();
    // seats
    r.r(0, this.winBot + 6, r.VW, 18, '#9a6a4a');
    for (let i = 0; i < 4; i++) r.r(i * 44 + 8, this.winBot + 4, 28, 8, '#7a5230');

    // fragments
    for (const f of this.frags) if (!f.taken) r.item(f.x - 8, f.y - 8, 'fragment');
    // Nuridana sitting / leaning to catch
    const p = this.player;
    r.character(Math.round(p.x) - 8, Math.round(p.y) - 10, { dir: 'side', flip: false, moving: p.moving, cloth: COLORS.nuriDress });

    // caption
    if (this.captionTimer > 0) {
      r.ctx.globalAlpha = Math.min(1, this.captionTimer / 30);
      r.r(8, 6, r.VW - 16, 16, 'rgba(20,12,30,0.7)');
      r.text(this.caption, r.VW / 2, 10, { align: 'center', size: 7, color: '#ffe9cf' });
      r.ctx.globalAlpha = 1;
    }
    g.particles.draw(r.ctx);
  }

  /* =================== BRIDGE =================== */
  _initBridge() {
    const cp = this.cp;
    this.rowY = 5; // band center tile row
    this.colsN = 34;
    this.worldW = this.colsN * 16; this.worldH = 9 * 16;
    const planks = cp.bridge.planks;
    // gaps at columns
    const gapCols = [6, 12, 18, 24];
    this.gaps = planks.map((pl, i) => ({ label: pl.label, col: gapCols[i], width: 2, built: false }));
    this.endCol = 30;
    this.player = { x: 2 * 16 + 8, y: this.rowY * 16 + 8, dir: 'side', flip: false, moving: false };
    this.builtCount = 0;
  }
  _bridgeBlockedTile(tx, ty) {
    // band rows rowY-1..rowY+1 walkable ground (unless gap), others blocked
    if (tx < 1 || tx >= this.colsN - 1) return true;
    if (ty < this.rowY - 1 || ty > this.rowY + 1) return true;
    for (const gp of this.gaps) if (!gp.built && tx >= gp.col && tx < gp.col + gp.width) return true;
    return false;
  }
  _updateBridge() {
    const g = this.g, p = this.player;
    if (g.dlg.isActive()) return;
    const mv = g.input.movement();
    const mag = Math.hypot(mv.x, mv.y);
    p.moving = mag > 0.1;
    if (p.moving) {
      let nx = mv.x, ny = mv.y; if (mag > 1) { nx /= mag; ny /= mag; }
      const sp = 1.15, hw = 4, hh = 4;
      let tx = p.x + nx * sp;
      if (!this._bridgeBox(tx, p.y, hw, hh)) p.x = tx;
      let ty = p.y + ny * sp;
      if (!this._bridgeBox(p.x, ty, hw, hh)) p.y = ty;
      if (Math.abs(nx) > Math.abs(ny)) { p.dir = 'side'; p.flip = nx < 0; } else p.dir = ny < 0 ? 'up' : 'down';
    }
    // build
    if (g.input.pressed('interact')) {
      const ptx = Math.floor(p.x / 16);
      for (const gp of this.gaps) {
        if (!gp.built && (ptx === gp.col - 1 || ptx === gp.col + gp.width || (ptx >= gp.col - 1 && ptx <= gp.col + gp.width))) {
          gp.built = true; this.builtCount++;
          g.audio.sfx('success');
          g.particles.burst(gp.col * 16 + 16 - g.r.cam.x, this.rowY * 16 + 8 - g.r.cam.y, '#ffd266', 14);
          g.dlg.show([{ name: '', text: gp.label + ' — laid down, one plank at a time.' }]);
          this._refreshHud();
          break;
        }
      }
    }
    if (Math.floor(p.x / 16) >= this.endCol && this.builtCount >= this.gaps.length) this._complete();
  }
  _bridgeBox(cx, cy, hw, hh) {
    const T = 16;
    return this._bridgeBlockedTile(Math.floor((cx - hw) / T), Math.floor((cy - hh) / T)) ||
           this._bridgeBlockedTile(Math.floor((cx + hw) / T), Math.floor((cy - hh) / T)) ||
           this._bridgeBlockedTile(Math.floor((cx - hw) / T), Math.floor((cy + hh) / T)) ||
           this._bridgeBlockedTile(Math.floor((cx + hw) / T), Math.floor((cy + hh) / T));
  }
  _drawBridge() {
    const g = this.g, r = g.r;
    r.setCamera(this.player.x, this.player.y, this.worldW, this.worldH);
    r.sky('sunset');
    const T = 16;
    // water everywhere below band
    for (let y = 0; y < 9; y++) for (let x = 0; x < this.colsN; x++) {
      const sx = x * T - r.cam.x; if (sx < -16 || sx > r.VW) continue;
      if (y >= this.rowY - 1 && y <= this.rowY + 1) {
        let gap = false; for (const gp of this.gaps) if (x >= gp.col && x < gp.col + gp.width) { gap = true; r.plank(x * T, y * T, gp.built); }
        if (!gap) { if (x < 1 || x >= this.colsN - 1) r.water(x * T, y * T); else { r.r(x*T,y*T,16,16,COLORS.grass); r.r(x*T,y*T,16,3,COLORS.grassHi); } }
      } else r.water(x * T, y * T);
    }
    // gap labels
    for (const gp of this.gaps) {
      const sx = gp.col * 16 + 16 - r.cam.x;
      r.text(gp.label, sx, (this.rowY - 1) * 16 - 10 - r.cam.y, { align: 'center', size: 7, color: gp.built ? '#b8e08a' : '#fff4e2' });
    }
    // goal flag
    const gx = this.endCol * 16 - r.cam.x;
    r.r(gx, (this.rowY - 1) * 16 - r.cam.y, 1, 18, '#fff');
    r.r(gx + 1, (this.rowY - 1) * 16 - r.cam.y, 6, 4, '#e8556a');
    // player
    const p = this.player;
    r.character(Math.round(p.x) - 8, Math.round(p.y) - 12, { dir: p.dir, flip: p.flip, moving: p.moving, cloth: COLORS.nuriDress });
    g.particles.draw(r.ctx);
  }

  /* =================== FINAL =================== */
  _initFinal() {
    this.worldW = this.g.r.VW; this.worldH = this.g.r.VH;
    this.player = { x: this.worldW / 2, y: this.worldH - 24, dir: 'up', flip: false, moving: false };
    this.musaab = { x: this.worldW / 2, y: 44 };
    this.state = 'approach';
  }
  _updateFinal() {
    const g = this.g, p = this.player;
    if (g.dlg.isActive()) return;
    if (this.state === 'approach') {
      const mv = g.input.movement();
      const mag = Math.hypot(mv.x, mv.y);
      p.moving = mag > 0.1;
      if (p.moving) {
        let nx = mv.x, ny = mv.y; if (mag > 1) { nx /= mag; ny /= mag; }
        p.x += nx * 1.0; p.y += ny * 1.0;
        p.x = Math.max(12, Math.min(this.worldW - 12, p.x));
        p.y = Math.max(this.musaab.y + 16, Math.min(this.worldH - 12, p.y));
        if (Math.abs(nx) > Math.abs(ny)) { p.dir = 'side'; p.flip = nx < 0; } else p.dir = ny < 0 ? 'up' : 'down';
      }
      if (dist(p.x, p.y, this.musaab.x, this.musaab.y + 6) < 26 && g.input.pressed('interact')) {
        this.state = 'talking';
        this._runFinalConvo();
      }
    }
  }
  _runFinalConvo() {
    const g = this.g, cp = this.cp;
    g.audio.playMusic('ending');
    g.dlg.show(cp.final.convo, () => {
      g.dlg.showChoices('', 'How do you want to spend this evening?', cp.final.choices, (value) => {
        g.save.data.ending = value; g.save.save();
        g.dlg.show([{ name: '', text: cp.final.endings[value] }], () => this._complete());
      });
    });
  }
  _drawFinal() {
    const g = this.g, r = g.r;
    r.cam.x = 0; r.cam.y = 0;
    r.sky('sunset');
    // hill
    r.ctx.fillStyle = COLORS.grass;
    r.ctx.beginPath();
    r.ctx.ellipse(r.VW / 2, r.VH + 40, r.VW * 0.9, 90, 0, Math.PI, 0);
    r.ctx.fill();
    r.ctx.fillStyle = COLORS.grassLight;
    r.ctx.beginPath();
    r.ctx.ellipse(r.VW / 2, r.VH + 44, r.VW * 0.9, 86, 0, Math.PI, 0);
    r.ctx.fill();
    // a lone tree + flowers
    r.tree(20, 70); r.tree(128, 78);
    for (let i = 0; i < 7; i++) r.flower(18 + i * 18, 120, [COLORS.pink, COLORS.yellow, COLORS.purple][i % 3]);
    // Musaab (flawed, ordinary, waiting)
    const m = this.musaab;
    r.character(Math.round(m.x) - 8, Math.round(m.y) - 6, { dir: 'down', cloth: COLORS.musShirt, clothD: COLORS.musShirtD, hair: COLORS.musHair });
    // Nuridana
    const p = this.player;
    r.character(Math.round(p.x) - 8, Math.round(p.y) - 12, { dir: p.dir, flip: p.flip, moving: p.moving, cloth: COLORS.nuriDress, blush: true });
    if (this.state === 'approach') r.text('Walk up the hill', r.VW / 2, 8, { align: 'center', size: 8, color: '#fff4e2' });
    g.particles.draw(r.ctx);
  }

  /* =================== shared update/draw/complete =================== */
  update() {
    if (this.done) return;
    if (this.mode === 'collect') this._updateCollect();
    else if (this.mode === 'maze') this._updateMaze();
    else if (this.mode === 'runner') this._updateRunner();
    else if (this.mode === 'bridge') this._updateBridge();
    else if (this.mode === 'final') this._updateFinal();
  }
  draw() {
    if (this.mode === 'collect') this._drawCollect();
    else if (this.mode === 'maze') this._drawMaze();
    else if (this.mode === 'runner') this._drawRunner();
    else if (this.mode === 'bridge') this._drawBridge();
    else if (this.mode === 'final') this._drawFinal();
  }
  _complete() {
    if (this.done) return;
    this.done = true;
    this.g.audio.sfx('success');
    this.g.clearMiniHud();
    this.g.onMiniGameComplete(this.cp);
  }
};

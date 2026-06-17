/* =====================================================================
   render.js — Procedural pixel renderer (Game Boy resolution 160x144).
   Everything is drawn from code primitives, so there are no image assets
   to load. The canvas is scaled up with CSS image-rendering: pixelated.
   ===================================================================== */

window.Renderer = class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.VW = canvas.width;   // 160
    this.VH = canvas.height;  // 144
    this.TILE = 16;
    this.cam = { x: 0, y: 0 };
    this.ctx.imageSmoothingEnabled = false;
    this.t = 0; // global tick for animations
  }

  begin() { this.t++; this.ctx.imageSmoothingEnabled = false; }

  setCamera(cx, cy, worldW, worldH) {
    // center camera on (cx, cy) and clamp to world bounds
    let x = cx - this.VW / 2;
    let y = cy - this.VH / 2;
    if (worldW > this.VW) x = Math.max(0, Math.min(x, worldW - this.VW));
    else x = (worldW - this.VW) / 2;
    if (worldH > this.VH) y = Math.max(0, Math.min(y, worldH - this.VH));
    else y = (worldH - this.VH) / 2;
    this.cam.x = Math.round(x);
    this.cam.y = Math.round(y);
  }

  /* ---------- primitives ---------- */
  _r(x, y, w, h, color) { // screen space
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }
  // world-space rect (offset by camera)
  r(wx, wy, w, h, color) { this._r(wx - this.cam.x, wy - this.cam.y, w, h, color); }

  circle(sx, sy, rad, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, rad, 0, Math.PI * 2);
    this.ctx.fill();
  }

  text(str, x, y, opts) {
    opts = opts || {};
    const ctx = this.ctx;
    ctx.font = (opts.bold ? '700 ' : '600 ') + (opts.size || 8) + 'px Quicksand, sans-serif';
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'top';
    if (opts.shadow !== false) {
      ctx.fillStyle = 'rgba(20,12,30,0.7)';
      ctx.fillText(str, x + 1, y + 1);
    }
    ctx.fillStyle = opts.color || '#fff4e2';
    ctx.fillText(str, x, y);
  }

  /* ---------- sky ---------- */
  sky(ambKey) {
    const a = window.AMBIENCE[ambKey] || window.AMBIENCE.day;
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, this.VH);
    g.addColorStop(0, a.top);
    g.addColorStop(1, a.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.VW, this.VH);

    if (ambKey === 'sunset') {
      // soft sun low on the horizon
      const sy = this.VH * 0.62;
      this.circle(this.VW * 0.5, sy, 26, 'rgba(255,210,140,0.35)');
      this.circle(this.VW * 0.5, sy, 18, 'rgba(255,225,160,0.6)');
      this.circle(this.VW * 0.5, sy, 12, '#ffe9b0');
    } else if (ambKey === 'night') {
      ctx.fillStyle = '#fff6c8';
      for (let i = 0; i < 28; i++) {
        const sx = (i * 47 + (this.t >> 3)) % this.VW;
        const syy = (i * 31) % (this.VH * 0.7);
        const tw = (Math.sin(this.t * 0.05 + i) + 1) / 2;
        ctx.globalAlpha = 0.3 + tw * 0.6;
        ctx.fillRect(sx, syy, 1, 1);
      }
      ctx.globalAlpha = 1;
      // moon
      this.circle(this.VW * 0.78, 28, 10, '#fdf6d0');
      this.circle(this.VW * 0.74, 25, 8, a.top);
    }
  }

  /* ---------- ground / tiles ---------- */
  grass(wx, wy, seed) {
    const C = window.COLORS;
    this.r(wx, wy, 16, 16, C.grass);
    // deterministic blades
    const h = ((seed * 2654435761) >>> 0);
    if (h & 1)  this.r(wx + 3,  wy + 4,  2, 3, C.grassDark);
    if (h & 2)  this.r(wx + 10, wy + 9,  2, 3, C.grassDark);
    if (h & 4)  this.r(wx + 6,  wy + 12, 2, 2, C.grassLight);
    if (h & 8)  this.r(wx + 12, wy + 2,  2, 2, C.grassLight);
    if (h & 16) this.r(wx + 1,  wy + 10, 1, 2, C.grassHi);
  }
  path(wx, wy, seed) {
    const C = window.COLORS;
    this.r(wx, wy, 16, 16, C.path);
    const h = ((seed * 40503) >>> 0);
    if (h & 1) this.r(wx + 4, wy + 5, 3, 2, C.pathDark);
    if (h & 2) this.r(wx + 10, wy + 10, 3, 2, C.pathDark);
    if (h & 4) this.r(wx + 7, wy + 2, 2, 2, C.pathLight);
  }
  floor(wx, wy, color) { this.r(wx, wy, 16, 16, color); }

  /* ---------- decorations (anchored by bottom-center of a tile) ---------- */
  tree(wx, wy) {
    const C = window.COLORS;
    // trunk
    this.r(wx + 6, wy + 8, 4, 8, C.trunk);
    this.r(wx + 6, wy + 8, 1, 8, C.trunkDark);
    // canopy
    this.r(wx + 1, wy - 6, 14, 12, C.leafDark);
    this.r(wx + 2, wy - 8, 12, 8, C.leaf);
    this.r(wx + 4, wy - 9, 8, 5, C.leafLight);
    this.r(wx + 5, wy - 4, 3, 3, C.leafLight);
    this.r(wx + 9, wy - 2, 2, 2, C.leafLight);
  }
  bush(wx, wy) {
    const C = window.COLORS;
    this.r(wx + 1, wy + 6, 14, 8, C.bush);
    this.r(wx + 2, wy + 4, 12, 6, C.bushHi);
    this.r(wx + 4, wy + 3, 4, 3, C.leafLight);
  }
  rock(wx, wy) {
    const C = window.COLORS;
    this.r(wx + 3, wy + 7, 10, 7, C.rockDark);
    this.r(wx + 4, wy + 6, 8, 5, C.rock);
    this.r(wx + 5, wy + 6, 3, 2, '#c4c4cf');
  }
  flower(wx, wy, color) {
    const C = window.COLORS;
    const sway = Math.sin(this.t * 0.06 + wx * 0.3) * 1;
    this.r(wx + 7, wy + 9, 1, 5, C.grassDark);              // stem
    const cx = wx + 7 + (sway | 0);
    this.r(cx, wy + 6, 2, 2, color);                         // center petals
    this.r(cx - 2, wy + 6, 2, 2, color);
    this.r(cx + 2, wy + 6, 2, 2, color);
    this.r(cx, wy + 4, 2, 2, color);
    this.r(cx, wy + 8, 2, 2, color);
    this.r(cx, wy + 6, 1, 1, C.yellow);
  }
  water(wx, wy) {
    const C = window.COLORS;
    this.r(wx, wy, 16, 16, C.water);
    const ph = Math.sin(this.t * 0.08 + wx * 0.2 + wy * 0.2);
    if (ph > 0.3) this.r(wx + 3, wy + 5, 4, 1, C.waterLight);
    if (ph < -0.3) this.r(wx + 9, wy + 10, 4, 1, C.waterLight);
  }
  fence(wx, wy) {
    const C = window.COLORS;
    this.r(wx + 2, wy + 2, 2, 12, C.trunk);
    this.r(wx + 11, wy + 2, 2, 12, C.trunk);
    this.r(wx, wy + 5, 16, 2, C.trunkDark);
    this.r(wx, wy + 10, 16, 2, C.trunkDark);
  }

  /* ---------- memory node marker ---------- */
  node(wx, wy, state) {
    // state: 'locked' | 'active' | 'done'
    const pulse = (Math.sin(this.t * 0.08) + 1) / 2;
    const cxs = wx - this.cam.x + 8;
    const cys = wy - this.cam.y + 8;
    if (state === 'done') {
      this.circle(cxs, cys, 5, 'rgba(120,200,120,0.5)');
      this.r(wx + 5, wy + 5, 6, 6, '#8fce63');
      return;
    }
    if (state === 'locked') {
      this.circle(cxs, cys, 4 + pulse * 2, 'rgba(160,140,200,0.25)');
      this.r(wx + 6, wy + 6, 4, 4, '#7a6a9a');
      return;
    }
    // active: glowing gold
    this.ctx.globalAlpha = 0.3 + pulse * 0.4;
    this.circle(cxs, cys, 7 + pulse * 3, 'rgba(255,210,120,0.6)');
    this.ctx.globalAlpha = 1;
    this.circle(cxs, cys, 4, '#ffe9b0');
    this.r(wx + 6, wy + 5, 4, 6, '#ffd266');
    this.r(wx + 5, wy + 7, 6, 2, '#ffe9b0');
  }

  /* ---------- generic collectible item ---------- */
  item(wx, wy, type, frame) {
    const C = window.COLORS;
    const bob = Math.sin(this.t * 0.1 + wx) * 1.5;
    const y = wy + (bob | 0);
    // soft shadow
    this.r(wx + 4, wy + 14, 8, 2, 'rgba(20,12,30,0.25)');
    switch (type) {
      case 'rice':
        this.r(wx + 4, y + 6, 8, 6, '#e8a23a'); this.r(wx + 5, y + 4, 6, 3, '#fff0d0'); break;
      case 'noodle':
        this.r(wx + 3, y + 6, 10, 5, '#e8b04a'); this.r(wx + 4, y + 4, 8, 3, '#ffd98a'); this.r(wx+6,y+8,1,2,'#c8553a'); break;
      case 'bowl':
        this.r(wx + 3, y + 7, 10, 5, '#c8553a'); this.r(wx + 4, y + 5, 8, 3, '#ffcaa0'); break;
      case 'coffee':
        this.r(wx + 5, y + 4, 6, 8, '#6b4a2b'); this.r(wx + 5, y + 4, 6, 2, '#caa37a'); this.r(wx+11,y+6,2,3,'#6b4a2b'); break;
      case 'icecream':
        this.r(wx + 6, y + 8, 4, 5, '#d9a05a'); this.r(wx + 4, y + 4, 8, 5, '#ff9ac0'); this.r(wx+5,y+3,6,2,'#fff'); break;
      case 'scoop':
        this.r(wx + 5, y + 4, 6, 4, '#ffd0e0'); this.r(wx + 5, y + 8, 6, 4, '#caa37a'); break;
      case 'blanket':
        this.r(wx + 2, y + 6, 12, 7, '#e8556a'); this.r(wx+2,y+6,12,1,'#fff'); this.r(wx+2,y+9,12,1,'#fff'); break;
      case 'basket':
        this.r(wx + 3, y + 6, 10, 7, '#b07a3a'); this.r(wx + 4, y + 4, 8, 2, '#7a5230'); break;
      case 'fruit':
        this.r(wx + 5, y + 6, 5, 5, '#e8556a'); this.r(wx + 8, y + 6, 4, 5, '#f6a93a'); this.r(wx+6,y+4,2,2,'#6bab4d'); break;
      case 'drink':
        this.r(wx + 5, y + 4, 6, 9, '#ffe08a'); this.r(wx+5,y+4,6,2,'#fff6d0'); this.r(wx+7,y+1,1,4,'#fff'); break;
      case 'gift':
        this.r(wx + 3, y + 6, 10, 7, '#9a6bd0'); this.r(wx + 7, y + 4, 2, 9, '#ffd266'); this.r(wx + 3, y + 8, 10, 2, '#ffd266'); break;
      case 'shard':
        this.ctx.fillStyle = '#cfe9ff';
        this.ctx.globalAlpha = 0.85;
        this.ctx.beginPath();
        this.ctx.moveTo(wx + 8 - this.cam.x, y + 3 - this.cam.y);
        this.ctx.lineTo(wx + 12 - this.cam.x, y + 13 - this.cam.y);
        this.ctx.lineTo(wx + 5 - this.cam.x, y + 11 - this.cam.y);
        this.ctx.closePath(); this.ctx.fill();
        this.ctx.globalAlpha = 1;
        this.r(wx + 7, y + 5, 1, 5, '#ffffff'); break;
      case 'fragment':
        this.circle(wx - this.cam.x + 8, y - this.cam.y + 8, 4, 'rgba(255,225,160,0.5)');
        this.r(wx + 6, y + 6, 4, 4, '#ffe9b0'); break;
      default:
        this.r(wx + 6, y + 6, 4, 4, C.gold);
    }
  }

  /* ---------- shadow "thought" creature ---------- */
  shadow(wx, wy) {
    const wob = Math.sin(this.t * 0.12 + wx) * 1.5;
    const x = wx + (wob | 0);
    this.ctx.globalAlpha = 0.85;
    this.r(x + 2, wy + 4, 12, 10, window.COLORS.thought);
    this.r(x + 1, wy + 6, 14, 6, window.COLORS.thought);
    this.r(x + 3, wy + 13, 2, 2, window.COLORS.thought);
    this.r(x + 7, wy + 14, 2, 2, window.COLORS.thought);
    this.r(x + 11, wy + 13, 2, 2, window.COLORS.thought);
    this.ctx.globalAlpha = 1;
    // eyes
    this.r(x + 5, wy + 7, 2, 2, '#ff9a6a');
    this.r(x + 9, wy + 7, 2, 2, '#ff9a6a');
  }

  /* ---------- character (chibi) ---------- */
  character(wx, wy, o) {
    const C = window.COLORS;
    const skin = o.skin || C.skin;
    const hair = o.hair || C.nuriHair;
    const cloth = o.cloth || C.nuriDress;
    const clothD = o.clothD || C.nuriDressD;
    const dir = o.dir || 'down';
    const moving = o.moving;
    const step = moving ? (Math.floor(this.t / 8) % 2) : 0;
    const legA = step === 0 ? 0 : 1;

    // shadow
    this.r(wx + 4, wy + 14, 8, 2, 'rgba(20,12,30,0.28)');

    // legs
    const ly = wy + 12;
    if (dir === 'side') {
      this.r(wx + 6, ly, 2, 3, skin);
      this.r(wx + 8 + (legA ? 1 : -1), ly, 2, 3, skin);
    } else {
      this.r(wx + 5 + (legA ? 1 : 0), ly, 2, 3, skin);
      this.r(wx + 9 - (legA ? 1 : 0), ly, 2, 3, skin);
    }

    // body / cloth
    this.r(wx + 4, wy + 7, 8, 6, cloth);
    this.r(wx + 4, wy + 11, 8, 2, clothD);
    // arms
    this.r(wx + 3, wy + 8, 1, 3, skin);
    this.r(wx + 12, wy + 8, 1, 3, skin);

    // head
    this.r(wx + 4, wy + 1, 8, 7, skin);

    if (dir === 'up') {
      // back of head: hair covers face
      this.r(wx + 3, wy, 10, 7, hair);
      this.r(wx + 4, wy + 6, 8, 1, hair);
    } else if (dir === 'side') {
      const flip = o.flip; // facing left when flip true
      // hair across top + back
      this.r(wx + 3, wy, 10, 4, hair);
      if (flip) this.r(wx + 3, wy, 4, 7, hair);
      else      this.r(wx + 9, wy, 4, 7, hair);
      // one eye
      const ex = flip ? wx + 5 : wx + 9;
      this.r(ex, wy + 4, 2, 2, C.black);
      // nose hint
      const nx = flip ? wx + 3 : wx + 11;
      this.r(nx, wy + 5, 1, 1, C.skinShade);
    } else {
      // facing down: hair frames the face, two eyes, tiny smile
      this.r(wx + 3, wy, 10, 4, hair);
      this.r(wx + 3, wy, 2, 6, hair);
      this.r(wx + 11, wy, 2, 6, hair);
      this.r(wx + 6, wy + 4, 1, 2, C.black);   // left eye
      this.r(wx + 9, wy + 4, 1, 2, C.black);   // right eye
      this.r(wx + 7, wy + 6, 2, 1, C.skinShade); // mouth
      if (o.blush) { this.r(wx + 5, wy + 5, 1, 1, '#ff9aa2'); this.r(wx + 10, wy + 5, 1, 1, '#ff9aa2'); }
    }

    // optional beard (gardener)
    if (o.beard) {
      this.r(wx + 4, wy + 6, 8, 3, C.gardBeard);
      this.r(wx + 5, wy + 8, 6, 2, C.gardBeard);
    }
  }

  /* ---------- bus ---------- */
  bus(sx, sy) {
    const C = window.COLORS;
    this._r(sx, sy, 84, 40, '#e8a93a');
    this._r(sx, sy + 28, 84, 12, '#c8853a');
    this._r(sx + 6, sy + 8, 16, 12, C.glass);
    this._r(sx + 26, sy + 8, 16, 12, C.glass);
    this._r(sx + 46, sy + 8, 16, 12, C.glass);
    this._r(sx + 66, sy + 8, 12, 12, C.glass);
    this._r(sx + 78, sy + 12, 6, 8, '#fff2a0'); // headlight
    // wheels
    this.circle(sx + 20, sy + 40, 7, '#241b2f');
    this.circle(sx + 64, sy + 40, 7, '#241b2f');
    this.circle(sx + 20, sy + 40, 3, '#6a6a78');
    this.circle(sx + 64, sy + 40, 3, '#6a6a78');
  }

  /* ---------- bridge plank ---------- */
  plank(wx, wy, built) {
    const C = window.COLORS;
    if (built) {
      this.r(wx, wy + 6, 16, 5, C.trunk);
      this.r(wx, wy + 6, 16, 1, C.brown);
      this.r(wx + 1, wy + 9, 16, 1, C.trunkDark);
    } else {
      // gap (water below)
      this.r(wx, wy, 16, 16, C.water);
      const ph = Math.sin(this.t * 0.08 + wx * 0.2);
      if (ph > 0) this.r(wx + 3, wy + 6, 5, 1, C.waterLight);
    }
  }

  /* ---------- hill (final scene backdrop element) ---------- */
  hill(wx, wy, w, h) {
    this.ctx.fillStyle = window.COLORS.grass;
    this.ctx.beginPath();
    this.ctx.ellipse(wx - this.cam.x + w / 2, wy - this.cam.y + h, w / 2, h, 0, Math.PI, 0);
    this.ctx.fill();
  }

  vignetteDark(alpha) {
    this.ctx.fillStyle = `rgba(10,6,18,${alpha})`;
    this.ctx.fillRect(0, 0, this.VW, this.VH);
  }

  /* ---------- cottage (2x2 tiles footprint, drawn 32 wide) ---------- */
  house(wx, wy) {
    const C = window.COLORS;
    // body
    this.r(wx + 2, wy + 12, 28, 20, '#caa37a');
    this.r(wx + 2, wy + 12, 28, 3, '#b08a5a');
    // roof
    this.ctx.fillStyle = '#9a4a3a';
    this.ctx.beginPath();
    this.ctx.moveTo(wx - 1 - this.cam.x, wy + 13 - this.cam.y);
    this.ctx.lineTo(wx + 16 - this.cam.x, wy - 2 - this.cam.y);
    this.ctx.lineTo(wx + 33 - this.cam.x, wy + 13 - this.cam.y);
    this.ctx.closePath(); this.ctx.fill();
    this.r(wx + 13, wy - 4, 4, 8, '#7a5230'); // chimney
    // door + window
    this.r(wx + 12, wy + 20, 8, 12, '#7a5230');
    this.r(wx + 14, wy + 25, 2, 2, '#ffd266');
    this.r(wx + 5, wy + 17, 6, 6, '#bfe2f2');
    this.r(wx + 21, wy + 17, 6, 6, '#bfe2f2');
    // little smoke
    const s = Math.sin(this.t * 0.06) * 1;
    this.ctx.globalAlpha = 0.5;
    this.r(wx + 14 + (s | 0), wy - 9, 3, 3, '#e8e0e8');
    this.r(wx + 15 - (s | 0), wy - 13, 2, 2, '#e8e0e8');
    this.ctx.globalAlpha = 1;
  }

  /* ---------- market stall (2x2 footprint) ---------- */
  stall(wx, wy) {
    const C = window.COLORS;
    // counter
    this.r(wx + 2, wy + 18, 28, 12, '#9b6a3a');
    this.r(wx + 2, wy + 18, 28, 3, '#b89060');
    // posts
    this.r(wx + 3, wy + 4, 2, 16, '#7a5230');
    this.r(wx + 27, wy + 4, 2, 16, '#7a5230');
    // striped awning
    for (let i = 0; i < 7; i++) this.r(wx + 1 + i * 4, wy + 2, 4, 6, i % 2 ? '#e8556a' : '#fdf6e3');
    this.r(wx + 1, wy + 7, 30, 2, '#c84a5a');
    // goods on counter
    this.r(wx + 6, wy + 14, 4, 4, '#ef8f43');
    this.r(wx + 12, wy + 14, 4, 4, '#9a6bd0');
    this.r(wx + 18, wy + 14, 4, 4, '#6bab4d');
    this.r(wx + 24, wy + 13, 3, 5, '#ffe08a');
  }

  /* ---------- a little message marker above an NPC ---------- */
  messageMarker(wx, wy) {
    const bob = Math.sin(this.t * 0.12 + wx) * 1.5;
    const x = wx, y = wy + (bob | 0);
    this.r(x, y, 9, 7, '#fff6e6');
    this.r(x, y, 9, 1, '#e8a93a');
    this.r(x + 1, y + 1, 7, 1, '#e8556a');
    this.r(x + 1, y + 3, 7, 1, '#e8556a');
    this.r(x + 3, y + 7, 3, 2, '#fff6e6'); // little tail
  }
};

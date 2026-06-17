/* =====================================================================
   particles.js — ambient life: petals, fireflies, birds, sparkles.
   Drawn in SCREEN space over the world for a soft, alive feeling.
   ===================================================================== */

window.ParticleSystem = class ParticleSystem {
  constructor(vw, vh) {
    this.vw = vw; this.vh = vh;
    this.petals = [];
    this.fireflies = [];
    this.birds = [];
    this.sparkles = [];
    this.profile = { petals: true, fireflies: false, birds: true };
  }

  setProfile(p) {
    this.profile = Object.assign({ petals: false, fireflies: false, birds: false }, p);
    this.petals.length = 0;
    this.fireflies.length = 0;
    this.birds.length = 0;
    if (this.profile.petals)    for (let i = 0; i < 14; i++) this.petals.push(this._newPetal(true));
    if (this.profile.fireflies) for (let i = 0; i < 18; i++) this.fireflies.push(this._newFirefly());
  }

  _newPetal(spread) {
    return {
      x: Math.random() * this.vw,
      y: spread ? Math.random() * this.vh : -4,
      vy: 0.15 + Math.random() * 0.35,
      sway: Math.random() * Math.PI * 2,
      swaySpd: 0.02 + Math.random() * 0.03,
      size: 2 + (Math.random() * 2 | 0),
      hue: Math.random() < 0.5 ? '#ffd0e0' : '#ffc7a8'
    };
  }
  _newFirefly() {
    return {
      x: Math.random() * this.vw,
      y: Math.random() * this.vh,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      blink: Math.random() * Math.PI * 2,
      blinkSpd: 0.04 + Math.random() * 0.05
    };
  }
  _newBird() {
    const fromLeft = Math.random() < 0.5;
    return {
      x: fromLeft ? -8 : this.vw + 8,
      y: 12 + Math.random() * 40,
      vx: (fromLeft ? 1 : -1) * (0.4 + Math.random() * 0.3),
      flap: Math.random() * Math.PI * 2,
      dir: fromLeft ? 1 : -1
    };
  }

  burst(x, y, color, n) {
    n = n || 10;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.5 + Math.random() * 1.6;
      this.sparkles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.4,
        life: 1, color: color || '#ffd266', size: 1 + (Math.random() * 2 | 0)
      });
    }
  }

  update() {
    // petals
    for (const p of this.petals) {
      p.sway += p.swaySpd;
      p.y += p.vy;
      p.x += Math.sin(p.sway) * 0.4;
      if (p.y > this.vh + 4) Object.assign(p, this._newPetal(false), { x: Math.random() * this.vw });
    }
    // fireflies
    for (const f of this.fireflies) {
      f.blink += f.blinkSpd;
      f.x += f.vx; f.y += f.vy;
      if (Math.random() < 0.02) { f.vx = (Math.random() - 0.5) * 0.3; f.vy = (Math.random() - 0.5) * 0.3; }
      if (f.x < 0) f.x = this.vw; if (f.x > this.vw) f.x = 0;
      if (f.y < 0) f.y = this.vh; if (f.y > this.vh) f.y = 0;
    }
    // birds
    if (this.profile.birds && Math.random() < 0.004 && this.birds.length < 3) this.birds.push(this._newBird());
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      b.x += b.vx; b.flap += 0.25;
      if (b.x < -12 || b.x > this.vw + 12) this.birds.splice(i, 1);
    }
    // sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.06; s.life -= 0.03;
      if (s.life <= 0) this.sparkles.splice(i, 1);
    }
  }

  draw(ctx) {
    // petals
    for (const p of this.petals) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = p.hue;
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    // fireflies
    for (const f of this.fireflies) {
      const glow = (Math.sin(f.blink) + 1) / 2;
      ctx.globalAlpha = 0.25 + glow * 0.6;
      ctx.fillStyle = '#fff2a0';
      ctx.fillRect(f.x | 0, f.y | 0, 2, 2);
      ctx.globalAlpha = (0.25 + glow * 0.6) * 0.4;
      ctx.fillRect((f.x | 0) - 1, (f.y | 0) - 1, 4, 4);
    }
    // birds (simple V)
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#2a2438';
    for (const b of this.birds) {
      const w = Math.sin(b.flap) * 2;
      const x = b.x | 0, y = b.y | 0;
      ctx.fillRect(x, y, 2, 1);
      ctx.fillRect(x - 2, y - (w | 0) - 1, 2, 1);
      ctx.fillRect(x + 2, y - (w | 0) - 1, 2, 1);
    }
    // sparkles
    for (const s of this.sparkles) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x | 0, s.y | 0, s.size, s.size);
    }
    ctx.globalAlpha = 1;
  }
};

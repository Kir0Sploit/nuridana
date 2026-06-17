/* =====================================================================
   input.js — Unified input: keyboard + touch joystick + action buttons.
   Exposes:
     input.dir   -> {x, y} normalized-ish movement vector (-1..1)
     input.pressed(name) -> true once per press (edge), names: a,b,interact
     input.held(name)
   ===================================================================== */

window.InputManager = class InputManager {
  constructor() {
    this.dir = { x: 0, y: 0 };
    this.keys = {};
    this._edge = { a: false, b: false, interact: false };
    this._held = { a: false, b: false, interact: false };
    this._menuEdge = { up: false, down: false, left: false, right: false };

    this.joy = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0, max: 42 };

    this._bindKeyboard();
    this._bindButtons();
    this._bindJoystick();
  }

  /* ---------- keyboard ---------- */
  _bindKeyboard() {
    const down = (e) => {
      const k = e.key;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(k)) e.preventDefault();
      this.keys[k] = true;
      if (k === 'ArrowUp') this._menuEdge.up = true;
      if (k === 'ArrowDown') this._menuEdge.down = true;
      if (k === 'ArrowLeft') this._menuEdge.left = true;
      if (k === 'ArrowRight') this._menuEdge.right = true;
      if (k === ' ' || k === 'Enter') this._press('interact');
      if (k === 'z' || k === 'Z') this._press('a');
      if (k === 'x' || k === 'X') this._press('b');
      if (k === 'Enter') this._press('a');
    };
    const up = (e) => { this.keys[e.key] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
  }

  _press(name) {
    if (!this._held[name]) this._edge[name] = true;
    this._held[name] = true;
  }
  _release(name) { this._held[name] = false; }

  /* ---------- action buttons ---------- */
  _bindButtons() {
    const map = { 'btn-a': 'a', 'btn-b': 'b', 'btn-interact': 'interact' };
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const name = map[id];
      // The A button doubles as a confirm/interact for convenience.
      const press = (e) => { e.preventDefault(); this._press(name); if (name === 'a') this._press('interact'); };
      const release = (e) => { e.preventDefault(); this._release(name); if (name === 'a') this._release('interact'); };
      el.addEventListener('touchstart', press, { passive: false });
      el.addEventListener('touchend', release, { passive: false });
      el.addEventListener('touchcancel', release, { passive: false });
      el.addEventListener('mousedown', press);
      el.addEventListener('mouseup', release);
      el.addEventListener('mouseleave', release);
    });
  }

  /* ---------- virtual joystick ---------- */
  _bindJoystick() {
    const base = document.getElementById('joy-base');
    const knob = document.getElementById('joy-knob');
    if (!base || !knob) return;
    this._joyBase = base; this._joyKnob = knob;

    const start = (cx, cy, id) => {
      const r = base.getBoundingClientRect();
      this.joy.active = true;
      this.joy.id = id;
      this.joy.cx = r.left + r.width / 2;
      this.joy.cy = r.top + r.height / 2;
      move(cx, cy);
    };
    const move = (cx, cy) => {
      if (!this.joy.active) return;
      let dx = cx - this.joy.cx;
      let dy = cy - this.joy.cy;
      const dist = Math.hypot(dx, dy);
      const max = this.joy.max;
      if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
      this.joy.dx = dx; this.joy.dy = dy;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      // deadzone
      const dead = 8;
      this.dir.x = Math.abs(dx) > dead ? dx / max : 0;
      this.dir.y = Math.abs(dy) > dead ? dy / max : 0;
    };
    const end = () => {
      this.joy.active = false; this.joy.id = null;
      this.joy.dx = this.joy.dy = 0;
      this.dir.x = this.dir.y = 0;
      knob.style.transform = 'translate(0,0)';
    };

    // touch
    base.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      start(t.clientX, t.clientY, t.identifier);
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      if (!this.joy.active) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) { e.preventDefault(); move(t.clientX, t.clientY); }
      }
    }, { passive: false });
    window.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.joy.id) end();
    });
    window.addEventListener('touchcancel', () => end());

    // mouse (desktop testing)
    base.addEventListener('mousedown', (e) => { e.preventDefault(); start(e.clientX, e.clientY, 'mouse'); });
    window.addEventListener('mousemove', (e) => { if (this.joy.active) move(e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => { if (this.joy.active) end(); });
  }

  /* ---------- query API ---------- */
  // combined movement vector from keyboard + joystick
  movement() {
    let x = this.dir.x, y = this.dir.y;
    if (this.keys['ArrowLeft'])  x = -1;
    if (this.keys['ArrowRight']) x = 1;
    if (this.keys['ArrowUp'])    y = -1;
    if (this.keys['ArrowDown'])  y = 1;
    return { x, y };
  }

  pressed(name) {
    if (this._edge[name]) { this._edge[name] = false; return true; }
    return false;
  }
  held(name) { return !!this._held[name]; }

  // menu directional edge (consumed once)
  menu(name) {
    if (this._menuEdge[name]) { this._menuEdge[name] = false; return true; }
    return false;
  }

  // call at end of each frame to clear stale edges
  endFrame() {
    this._edge.a = this._edge.b = this._edge.interact = false;
    this._menuEdge.up = this._menuEdge.down = this._menuEdge.left = this._menuEdge.right = false;
  }

  setControlsVisible(v) {
    const c = document.getElementById('controls');
    if (c) c.classList.toggle('hidden', !v);
  }
};

/* =====================================================================
   game.js — Central controller: state machine, loop, HUD, overlays,
   and checkpoint orchestration.
   ===================================================================== */

window.Game = class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.r = new Renderer(this.canvas);
    this.audio = new AudioEngine();
    this.save = new SaveManager();
    this.save.load();
    this.input = new InputManager();
    this.dlg = new DialogueManager(this.audio);
    this.particles = new ParticleSystem(this.r.VW, this.r.VH);

    this.state = 'title';           // 'title' | 'play'
    this.scene = null;
    this.overworld = null;
    this.ambience = 'sunset';

    this.paused = false;
    this.albumOpen = false;
    this.memoryOpen = false;
    this._memoryClose = null;

    this.audio.setMuted(!!this.save.data.settings.muted);
    this._lastTime = 0;
    this.STEP = 1000 / 60;   // fixed simulation step (stable across refresh rates)
    this._acc = 0;
    this._raf = this._loop.bind(this);
  }

  /* ---------- boot ---------- */
  start() {
    this.setAmbience('sunset');
    requestAnimationFrame(this._raf);
  }

  /* ---------- ambience ---------- */
  setAmbience(key) {
    this.ambience = key;
    const prof = window.AMBIENCE[key] || window.AMBIENCE.day;
    this.particles.setProfile(prof);
    this.audio.startAmbient(prof);
  }

  /* ---------- main loop: fixed timestep so speed is stable on any display ---------- */
  _loop(ts) {
    if (!this._lastTime) this._lastTime = ts;
    let dt = ts - this._lastTime;
    this._lastTime = ts;
    if (dt > 250) dt = 250; // avoid a huge catch-up after a tab switch
    this._acc += dt;

    let steps = 0;
    while (this._acc >= this.STEP && steps < 5) {
      this._step();
      this._acc -= this.STEP;
      steps++;
    }
    // ensure at least one logic step even if the browser throttles timestamps
    if (steps === 0) this._step();

    this._draw();
    this.input.endFrame();
    requestAnimationFrame(this._raf);
  }

  // one fixed simulation tick
  _step() {
    this.particles.update();

    if (this.dlg.isActive()) {
      if (this.dlg.choiceMode) {
        if (this.input.menu('up')) this.dlg.moveChoice(-1);
        if (this.input.menu('down')) this.dlg.moveChoice(1);
      }
      if (this.input.pressed('interact') || this.input.pressed('a')) this.dlg.advance();
    }

    if (this.state === 'play') {
      const blocked = this.paused || this.albumOpen || this.memoryOpen;
      if (!blocked && this.scene) this.scene.update();
    }
  }

  // one render pass
  _draw() {
    this.r.begin();
    if (this.state === 'play' && this.scene) {
      this.scene.draw();
    } else {
      this.r.sky('sunset');
      this.particles.draw(this.r.ctx);
    }
  }

  setScene(scene) { this.scene = scene; if (scene.enter) scene.enter(); }

  /* ---------- story flow ---------- */
  newGame() {
    this.save.reset();
    this.audio.setMuted(false);
    this._beginStory(true);
  }
  continueGame() { this._beginStory(false); }

  _beginStory(fresh) {
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    this.state = 'play';
    this.overworld = new OverworldScene(this);
    this.setScene(this.overworld);
    if (fresh || this.save.data.progress === 0) {
      this.dlg.show(window.INTRO);
    }
  }

  gotoTitle() {
    this.state = 'title';
    this.scene = null;
    this.paused = false;
    document.getElementById('title-screen').classList.remove('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('pause').classList.add('hidden');
    this.clearMiniHud();
    this.input.setControlsVisible(false);
    this.setAmbience('sunset');
    this.audio.playMusic('title');
    this._refreshContinueButton();
  }
  _refreshContinueButton() {
    const c = document.getElementById('btn-continue');
    if (c) c.disabled = !(this.save.exists() && this.save.data.progress >= 0 && (this.save.data.progress > 0 || this.save.data.secrets.length > 0 || this.save.data.completed.length > 0));
  }

  /* ---------- checkpoints ---------- */
  startCheckpoint(index) {
    const cp = window.CHECKPOINTS[index];
    if (!cp) return;
    // auto-save: remember which checkpoint we're entering so a refresh/quit resumes here
    this.save.data.current = index;
    this.save.save();
    this.dlg.show(cp.intro, () => {
      this.fadeTo(() => {
        this.setScene(new MiniGameScene(this, cp));
        this.showToast('Checkpoint saved ✦');
      });
    });
  }

  onMiniGameComplete(cp) {
    const after = () => {
      this.showMemoryCard(cp.memory, () => {
        this.save.completeCheckpoint(cp.id, 'cp' + cp.id);
        this.refreshHud();
        this.showToast('Progress saved ✦');
        if (cp.id === 8) {
          this._finishGame();
        } else {
          this.fadeTo(() => this._returnToOverworld(cp.id));
        }
      });
    };
    if (cp.outro && cp.outro.length) this.dlg.show(cp.outro, after);
    else after();
  }

  _returnToOverworld(completedId) {
    if (!this.overworld) this.overworld = new OverworldScene(this);
    // place player on the node just completed
    const node = this.overworld.nodes[completedId - 1];
    if (node) { this.overworld.player.x = node.x + 8; this.overworld.player.y = node.y + 24; }
    this.setScene(this.overworld);
  }

  _finishGame() {
    this.fadeTo(() => {
      this.setAmbience('sunset');
      this.audio.playMusic('ending');
      this.dlg.show([
        { name: '', text: 'And so Nuridana remembered who she was — not perfectly, but honestly.' },
        { name: '', text: 'The good, the warm, the difficult, and the hopeful. All of it hers.' },
        { name: '', text: 'Thank you for walking with her.' }
      ], () => {
        this._endingAlbum = true;
        this.openAlbum();
        this.showToast('The End ♥');
      });
    });
  }

  /* ---------- HUD ---------- */
  setHudChapter(text) { const el = document.getElementById('hud-chapter'); if (el) el.textContent = text; }
  refreshHud() {
    const el = document.getElementById('hud-memories');
    const total = this.save.data.completed.length + this.save.data.secrets.length;
    const max = window.CHECKPOINTS.length + window.SECRETS.length;
    if (el) el.textContent = '✦ ' + total + '/' + max;
  }
  addMemory() { this.refreshHud(); }

  /* ---------- messenger letters from Musaab ---------- */
  deliverLetter(id) {
    const s = this.save.data;
    if (!s.letters.includes(id)) {
      s.letters.push(id);
      this.save.save();
      this.audio.sfx('secret');
      this.showToast('A message kept ✦');
    }
    if (s.letters.length >= window.NPCS.length && !s.lettersComplete) {
      s.lettersComplete = true;
      this.save.save();
      this.dlg.show(window.MUSAAB_FULL.lines, () => {
        this.showMemoryCard(
          { icon: '💞', title: 'A Message, Pieced Together', quote: window.MUSAAB_FULL.keep },
          () => {}
        );
      });
    }
  }

  miniHud(task, items) {
    const hud = document.getElementById('mg-hud');
    const t = document.getElementById('mg-task');
    const list = document.getElementById('mg-list');
    if (!hud) return;
    hud.classList.remove('hidden');
    t.textContent = task || '';
    list.innerHTML = '';
    (items || []).forEach(it => {
      const li = document.createElement('li');
      li.textContent = (it.done ? '✓ ' : '• ') + it.label;
      if (it.done) li.classList.add('done');
      list.appendChild(li);
    });
  }
  clearMiniHud() { const hud = document.getElementById('mg-hud'); if (hud) hud.classList.add('hidden'); }

  showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.classList.add('hidden'), 320);
    }, 2300);
  }

  /* ---------- memory card ---------- */
  showMemoryCard(memory, onClose) {
    this.memoryOpen = true;
    this._memoryClose = onClose || null;
    document.getElementById('memory-icon').textContent = memory.icon || '✦';
    document.getElementById('memory-title').textContent = memory.title || 'Memory Recovered';
    document.getElementById('memory-quote').textContent = '“' + memory.quote + '”';
    document.getElementById('memory-card').classList.remove('hidden');
    this.audio.sfx('secret');
  }
  closeMemoryCard() {
    document.getElementById('memory-card').classList.add('hidden');
    this.memoryOpen = false;
    const cb = this._memoryClose; this._memoryClose = null;
    if (cb) cb();
  }

  /* ---------- album ---------- */
  openAlbum() {
    this.albumOpen = true;
    const grid = document.getElementById('album-grid');
    grid.innerHTML = '';
    let found = 0;
    // checkpoint memories
    window.CHECKPOINTS.forEach(cp => {
      const got = this.save.isCompleted(cp.id);
      if (got) found++;
      grid.appendChild(this._albumCard(got, cp.memory.icon, cp.memory.title, cp.memory.quote, 'Memory ' + cp.id));
    });
    // secrets
    window.SECRETS.forEach(s => {
      const got = this.save.hasSecret(s.id);
      if (got) found++;
      grid.appendChild(this._albumCard(got, s.icon, s.title, s.quote, 'Hidden'));
    });
    // messenger letters from Musaab (bonus)
    window.NPCS.forEach(npc => {
      const got = this.save.data.letters.includes(npc.id);
      grid.appendChild(this._albumCard(got, '💌', npc.name, npc.keep, 'Message'));
    });
    grid.appendChild(this._albumCard(this.save.data.lettersComplete, '💞', 'A Message, Pieced Together', window.MUSAAB_FULL.keep, 'Message'));
    const total = window.CHECKPOINTS.length + window.SECRETS.length;
    const foot = document.getElementById('album-foot');
    foot.textContent = (found >= total) ? window.ALBUM_COMPLETE_NOTE : ('Memories found: ' + found + ' / ' + total);
    document.getElementById('album').classList.remove('hidden');
  }
  _albumCard(got, icon, title, quote, tag) {
    const card = document.createElement('div');
    card.className = 'album-card' + (got ? '' : ' locked');
    if (got) {
      card.innerHTML =
        '<div class="ac-icon">' + icon + '</div>' +
        '<div class="ac-title">' + title + '</div>' +
        '<div class="ac-quote">“' + quote + '”</div>';
    } else {
      card.innerHTML = '<div class="ac-icon">🔒</div><div class="ac-title">' + tag + '</div><div class="ac-quote">Not yet remembered.</div>';
    }
    return card;
  }
  closeAlbum() {
    document.getElementById('album').classList.add('hidden');
    this.albumOpen = false;
    if (this._endingAlbum) { this._endingAlbum = false; this.gotoTitle(); }
  }

  /* ---------- pause ---------- */
  togglePause() {
    if (this.state !== 'play') return;
    this.paused = !this.paused;
    document.getElementById('pause').classList.toggle('hidden', !this.paused);
  }

  /* ---------- fade transition ---------- */
  fadeTo(cb) {
    const fade = document.getElementById('fade');
    fade.classList.add('show');
    setTimeout(() => {
      if (cb) cb();
      setTimeout(() => fade.classList.remove('show'), 60);
    }, 480);
  }
};

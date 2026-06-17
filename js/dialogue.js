/* =====================================================================
   dialogue.js — DOM typewriter dialogue with optional choices.
   Drives the #dialogue box. Audio + advancing handled by the game loop.
   ===================================================================== */

window.DialogueManager = class DialogueManager {
  constructor(audio) {
    this.audio = audio;
    this.box = document.getElementById('dialogue');
    this.nameEl = document.getElementById('dlg-name');
    this.textEl = document.getElementById('dlg-text');
    this.choicesEl = document.getElementById('dlg-choices');
    this.nextEl = document.getElementById('dlg-next');

    this.active = false;
    this.lines = [];
    this.index = 0;
    this.onDone = null;

    this.full = '';
    this.shown = 0;
    this.typing = false;
    this.typeTimer = null;

    this.choiceMode = false;
    this.choiceSel = 0;
    this.choices = [];
    this.onPick = null;
  }

  isActive() { return this.active; }

  show(lines, onDone) {
    this.active = true;
    this.lines = Array.isArray(lines) ? lines.slice() : [lines];
    this.index = 0;
    this.onDone = onDone || null;
    this.box.classList.remove('hidden');
    this._render();
  }

  showChoices(name, text, choices, onPick) {
    this.active = true;
    this.lines = [];
    this.onDone = null;
    this.box.classList.remove('hidden');
    this._clearTimer();
    this.nameEl.textContent = name || '';
    this.textEl.textContent = text || '';
    this.typing = false;
    this.nextEl.classList.add('hidden');
    this._renderChoices(choices, onPick);
  }

  _renderChoices(choices, onPick) {
    this.choiceMode = true;
    this.choices = choices;
    this.onPick = onPick;
    this.choiceSel = 0;
    this.choicesEl.innerHTML = '';
    choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.className = 'dlg-choice' + (i === 0 ? ' sel' : '');
      b.textContent = c.label;
      b.addEventListener('click', () => this._pick(i));
      this.choicesEl.appendChild(b);
    });
  }

  _highlight() {
    [...this.choicesEl.children].forEach((el, i) =>
      el.classList.toggle('sel', i === this.choiceSel));
  }

  moveChoice(d) {
    if (!this.choiceMode) return;
    this.choiceSel = (this.choiceSel + d + this.choices.length) % this.choices.length;
    this._highlight();
    if (this.audio) this.audio.sfx('blip');
  }
  confirmChoice() { if (this.choiceMode) this._pick(this.choiceSel); }

  _pick(i) {
    if (!this.choiceMode) return;
    const c = this.choices[i];
    if (this.audio) this.audio.sfx('confirm');
    this.choiceMode = false;
    this.choicesEl.innerHTML = '';
    const cb = this.onPick;
    this.onPick = null;
    this._end();
    if (cb) cb(c.value, c);
  }

  _render() {
    this._clearTimer();
    this.choiceMode = false;
    this.choicesEl.innerHTML = '';
    const line = this.lines[this.index];
    this.nameEl.textContent = line.name || '';
    this.full = line.text || '';
    this.shown = 0;
    this.typing = true;
    this.textEl.textContent = '';
    this.nextEl.classList.add('hidden');
    if (line.sfx && this.audio) this.audio.sfx(line.sfx);

    let blip = 0;
    this.typeTimer = setInterval(() => {
      this.shown++;
      this.textEl.textContent = this.full.slice(0, this.shown);
      if (this.audio && (++blip % 3 === 0)) {
        const ch = this.full[this.shown - 1] || '';
        if (ch.trim()) this.audio.sfx('step');
      }
      if (this.shown >= this.full.length) {
        this._clearTimer();
        this.typing = false;
        this.nextEl.classList.remove('hidden');
      }
    }, 28);
  }

  _clearTimer() { if (this.typeTimer) { clearInterval(this.typeTimer); this.typeTimer = null; } }

  // advance on tap / interact / enter
  advance() {
    if (!this.active) return;
    if (this.choiceMode) { this.confirmChoice(); return; }
    if (this.typing) {
      // reveal instantly
      this._clearTimer();
      this.typing = false;
      this.textEl.textContent = this.full;
      this.nextEl.classList.remove('hidden');
      return;
    }
    if (this.audio) this.audio.sfx('blip');
    this.index++;
    if (this.index >= this.lines.length) {
      const cb = this.onDone;
      this.onDone = null;
      this._end();
      if (cb) cb();
    } else {
      this._render();
    }
  }

  _end() {
    this._clearTimer();
    this.active = false;
    this.typing = false;
    this.choiceMode = false;
    this.box.classList.add('hidden');
  }
};

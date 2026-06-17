/* =====================================================================
   audio.js — Web Audio chiptune engine. No external files.
   Provides gentle looped music tracks + soft SFX + ambient layers.
   ===================================================================== */

window.AudioEngine = class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.started = false;

    this.currentTrack = null;
    this.seqTimer = null;
    this.step = 0;
    this.ambientNodes = [];

    // Note frequency table (C2..B5)
    this.NOTES = this._buildNotes();
    this.TRACKS = this._buildTracks();
  }

  _buildNotes() {
    const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const table = {};
    for (let oct = 2; oct <= 6; oct++) {
      for (let i = 0; i < 12; i++) {
        const n = names[i] + oct;
        const midi = (oct + 1) * 12 + i;
        table[n] = 440 * Math.pow(2, (midi - 69) / 12);
      }
    }
    table['--'] = 0; // rest
    return table;
  }

  /* Each track = { bpm, lead:[...], bass:[...], wave } using note names. */
  _buildTracks() {
    return {
      title: {
        bpm: 84, wave: 'triangle',
        lead: ['E4','G4','B4','A4','G4','E4','D4','E4','C4','E4','G4','E4','D4','--','D4','--'],
        bass: ['C3','--','G2','--','A2','--','E2','--','F2','--','C3','--','G2','--','G2','--']
      },
      garden: {
        bpm: 96, wave: 'triangle',
        lead: ['C4','E4','G4','E4','F4','A4','G4','E4','D4','F4','E4','C4','D4','E4','C4','--'],
        bass: ['C3','--','F2','--','A2','--','G2','--','F2','--','C3','--','G2','--','C3','--']
      },
      hope: {
        bpm: 100, wave: 'square',
        lead: ['G4','A4','B4','D5','B4','A4','G4','A4','E4','G4','A4','B4','A4','G4','E4','--'],
        bass: ['G2','--','D3','--','E3','--','C3','--','G2','--','D3','--','C3','--','D3','--']
      },
      sad: {
        bpm: 66, wave: 'sine',
        lead: ['A4','--','G4','--','E4','--','F4','--','E4','--','D4','--','C4','--','--','--'],
        bass: ['A2','--','--','--','F2','--','--','--','E2','--','--','--','D2','--','--','--']
      },
      ending: {
        bpm: 72, wave: 'triangle',
        lead: ['C4','E4','G4','C5','B4','G4','A4','E4','F4','A4','G4','E4','C4','D4','C4','--'],
        bass: ['C3','--','G2','--','A2','--','E2','--','F2','--','C3','--','G2','--','C3','--']
      }
    };
  }

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);
  }

  // Must be called from a user gesture (browser autoplay policy)
  unlock() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    this.started = true;
  }

  setMuted(m) {
    this.muted = m;
    this._ensure();
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setValueAtTime(m ? 0 : 0.9, this.ctx.currentTime);
    }
  }

  toggleMute() { this.setMuted(!this.muted); return this.muted; }

  /* ---------- a single short voice ---------- */
  _voice(freq, t, dur, wave, gainVal, dest) {
    if (!freq) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gainVal, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || this.musicGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /* ---------- music loop ---------- */
  playMusic(name) {
    this._ensure();
    if (!this.ctx) return;
    if (this.currentTrack === name && this.seqTimer) return;
    this.stopMusic();
    const track = this.TRACKS[name];
    if (!track) return;
    this.currentTrack = name;
    this.step = 0;
    const beat = 60 / track.bpm / 2; // eighth notes
    const len = track.lead.length;

    const tick = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.05;
      const i = this.step % len;
      // lead
      this._voice(this.NOTES[track.lead[i]] || 0, t, beat * 0.9, track.wave, 0.22);
      // bass (one octave handled by note table)
      this._voice(this.NOTES[track.bass[i]] || 0, t, beat * 1.4, 'triangle', 0.26);
      // soft sparkle every 8 steps
      if (i % 8 === 0) {
        this._voice((this.NOTES[track.lead[i]] || 0) * 2, t, beat * 0.5, 'sine', 0.06);
      }
      this.step++;
    };
    tick();
    this.seqTimer = setInterval(tick, beat * 1000);
  }

  stopMusic() {
    if (this.seqTimer) { clearInterval(this.seqTimer); this.seqTimer = null; }
    this.currentTrack = null;
  }

  /* ---------- ambient layers (birds / wind) ---------- */
  startAmbient(profile) {
    this.stopAmbient();
    this._ensure();
    if (!this.ctx) return;
    if (profile && profile.birds) this._birdLoop();
    if (profile && profile.wind) this._windLoop();
  }
  stopAmbient() {
    this.ambientNodes.forEach(n => { try { clearInterval(n); } catch (e) {} });
    this.ambientNodes = [];
  }
  _birdLoop() {
    const chirp = () => {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const base = 1600 + Math.random() * 900;
      for (let k = 0; k < 2 + (Math.random() * 2 | 0); k++) {
        const tt = t + k * 0.08;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(base, tt);
        o.frequency.exponentialRampToValueAtTime(base * 1.4, tt + 0.05);
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.exponentialRampToValueAtTime(0.05, tt + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.09);
        o.connect(g); g.connect(this.sfxGain);
        o.start(tt); o.stop(tt + 0.12);
      }
    };
    const id = setInterval(() => { if (Math.random() < 0.5) chirp(); }, 2600);
    this.ambientNodes.push(id);
  }
  _windLoop() {
    // handled implicitly by the 'wind' sfx occasionally
    const id = setInterval(() => { if (!this.muted && Math.random() < 0.4) this.sfx('wind'); }, 5200);
    this.ambientNodes.push(id);
  }

  /* ---------- SFX ---------- */
  sfx(name) {
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'blip':
        this._voice(660, t, 0.07, 'square', 0.18, this.sfxGain); break;
      case 'confirm':
        this._voice(523, t, 0.08, 'square', 0.2, this.sfxGain);
        this._voice(784, t + 0.07, 0.1, 'square', 0.2, this.sfxGain); break;
      case 'collect':
        this._voice(880, t, 0.06, 'triangle', 0.22, this.sfxGain);
        this._voice(1175, t + 0.05, 0.08, 'triangle', 0.2, this.sfxGain); break;
      case 'secret':
        this._voice(1047, t, 0.07, 'sine', 0.2, this.sfxGain);
        this._voice(1319, t + 0.06, 0.07, 'sine', 0.2, this.sfxGain);
        this._voice(1568, t + 0.12, 0.12, 'sine', 0.2, this.sfxGain); break;
      case 'success':
        ['C5','E5','G5','C6'].forEach((n, k) =>
          this._voice(this.NOTES[n], t + k * 0.09, 0.16, 'triangle', 0.22, this.sfxGain));
        break;
      case 'hurt':
        this._voice(180, t, 0.18, 'sawtooth', 0.16, this.sfxGain); break;
      case 'step':
        this._voice(140, t, 0.04, 'square', 0.05, this.sfxGain); break;
      case 'wind': {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 700;
        o.type = 'sawtooth'; o.frequency.value = 90;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.6);
        g.gain.linearRampToValueAtTime(0.0001, t + 1.8);
        o.connect(f); f.connect(g); g.connect(this.sfxGain);
        o.start(t); o.stop(t + 2);
        break;
      }
      default: break;
    }
  }
};

/* =====================================================================
   save.js — localStorage persistence.
   ===================================================================== */

window.SaveManager = class SaveManager {
  constructor() {
    this.KEY = 'finding-nuridana-save-v1';
    this.data = null;
  }

  defaults() {
    return {
      progress: 0,            // index of next checkpoint to play (0..8)
      current: 0,             // checkpoint index last entered (for auto-resume)
      completed: [],          // ids of completed checkpoints
      memories: [],           // memory ids unlocked (checkpoint 'cp1'.. + secrets)
      secrets: [],            // secret ids found
      letters: [],            // NPC ids whose message from Musaab has been heard
      lettersComplete: false, // all NPC messages heard (combined note shown)
      ending: null,           // final choice value
      settings: { muted: false },
      version: 1
    };
  }

  exists() {
    try { return !!localStorage.getItem(this.KEY); }
    catch (e) { return false; }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      this.data = raw ? JSON.parse(raw) : this.defaults();
    } catch (e) {
      this.data = this.defaults();
    }
    // backfill any missing fields
    const d = this.defaults();
    for (const k in d) if (!(k in this.data)) this.data[k] = d[k];
    if (!this.data.settings) this.data.settings = { muted: false };
    return this.data;
  }

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); }
    catch (e) { /* storage may be unavailable in private mode */ }
  }

  reset() {
    this.data = this.defaults();
    this.save();
    return this.data;
  }

  /* ---------- helpers ---------- */
  completeCheckpoint(id, memoryId) {
    if (!this.data.completed.includes(id)) this.data.completed.push(id);
    if (memoryId && !this.data.memories.includes(memoryId)) this.data.memories.push(memoryId);
    this.data.progress = Math.max(this.data.progress, id);
    this.save();
  }

  findSecret(id) {
    if (!this.data.secrets.includes(id)) {
      this.data.secrets.push(id);
      this.save();
      return true;
    }
    return false;
  }

  isCompleted(id) { return this.data.completed.includes(id); }
  hasSecret(id)   { return this.data.secrets.includes(id); }
};

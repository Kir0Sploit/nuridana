/* =====================================================================
   main.js — Bootstrap. Wires DOM buttons, audio unlock, and starts loop.
   ===================================================================== */
(function () {
  const game = new window.Game();
  window.__FN = game; // handy for debugging

  /* ---------- first-touch audio unlock (autoplay policy) ---------- */
  let unlocked = false;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    game.audio.unlock();
    game.audio.playMusic('title');
  };
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
    window.addEventListener(ev, unlock, { once: false, passive: true }));

  const $ = (id) => document.getElementById(id);

  /* ---------- title buttons ---------- */
  $('btn-start').addEventListener('click', () => { unlock(); game.newGame(); });
  $('btn-continue').addEventListener('click', () => { unlock(); game.continueGame(); });
  $('btn-album-title').addEventListener('click', () => { unlock(); game.openAlbum(); });

  /* ---------- HUD menu ---------- */
  $('btn-menu').addEventListener('click', () => game.togglePause());

  /* ---------- memory card ---------- */
  $('memory-close').addEventListener('click', () => game.closeMemoryCard());

  /* ---------- album ---------- */
  $('album-close').addEventListener('click', () => game.closeAlbum());

  /* ---------- pause menu ---------- */
  $('pause-resume').addEventListener('click', () => game.togglePause());
  $('pause-album').addEventListener('click', () => game.openAlbum());
  $('pause-title').addEventListener('click', () => { game.togglePause(); game.gotoTitle(); });
  const muteBtn = $('pause-mute');
  const syncMute = () => { muteBtn.textContent = 'Sound: ' + (game.audio.muted ? 'Off' : 'On'); };
  muteBtn.addEventListener('click', () => {
    const m = game.audio.toggleMute();
    game.save.data.settings.muted = m;
    game.save.save();
    syncMute();
  });
  syncMute();

  /* ---------- tap-to-advance dialogue ---------- */
  const frame = $('screen-frame');
  const tapAdvance = (e) => {
    if (!game.dlg.isActive()) return;
    if (game.dlg.choiceMode) return;            // choices handled by their buttons
    if (e.target && e.target.closest && e.target.closest('.dlg-choice')) return;
    if (e.target && e.target.closest && (e.target.closest('#album') || e.target.closest('#pause') || e.target.closest('#memory-card'))) return;
    e.preventDefault();
    game.dlg.advance();
  };
  frame.addEventListener('click', tapAdvance);

  /* ---------- initialise title ---------- */
  game._refreshContinueButton();
  spawnTitlePetals();
  game.start();

  /* ---------- decorative falling petals on the title screen ---------- */
  function spawnTitlePetals() {
    const host = document.getElementById('title-petals');
    if (!host) return;
    for (let i = 0; i < 16; i++) {
      const p = document.createElement('div');
      const size = 5 + Math.random() * 7;
      const dur = 6 + Math.random() * 7;
      const delay = -Math.random() * dur;
      const left = Math.random() * 100;
      p.style.cssText =
        'position:absolute;top:-12px;left:' + left + '%;width:' + size + 'px;height:' + size + 'px;' +
        'background:' + (Math.random() < 0.5 ? '#ffd0e0' : '#ffc7a8') + ';border-radius:60% 40% 50% 50%;' +
        'opacity:0.8;animation:fall ' + dur + 's linear ' + delay + 's infinite;';
      host.appendChild(p);
    }
    if (!document.getElementById('petal-kf')) {
      const st = document.createElement('style');
      st.id = 'petal-kf';
      st.textContent =
        '@keyframes fall{0%{transform:translateY(0) rotate(0);opacity:0}' +
        '10%{opacity:.85}90%{opacity:.85}' +
        '100%{transform:translateY(110vh) translateX(40px) rotate(360deg);opacity:0}}';
      document.head.appendChild(st);
    }
  }
})();

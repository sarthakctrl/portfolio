/*
 * The swarm's toolbar, a comic panel along the bottom: who is building, how far along it is, and the
 * controls (Tour scrolls for you at the swarm's pace, 1× / 2× / 3×, sound, skip). When the build is done
 * it says how long it took and offers a replay, then folds down to a small "Rebuild" button.
 * One Tab stop for the whole toolbar; the arrow keys, Home and End move between its buttons.
 */
const FOLD_MS = 7000;

export function createToolbar({ onTour, onSpeed, onSound, onSkip, onReplay }) {
  const bar = document.createElement('div');
  bar.className = 'sw-bar sw-folded';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Swarm build');
  bar.innerHTML = `<span class="sw-faces" aria-hidden="true"></span>
<span class="sw-stat"><b data-agents>0</b> agents</span>
<span class="sw-stat sw-layers"><b data-built>0</b> / <span data-total>0</span> layers</span>
<span class="sw-progress" aria-hidden="true"><i></i></span>
<span class="sw-summary" data-summary hidden></span>
<span class="sw-buttons">
  <button type="button" data-act="tour" aria-pressed="false" title="Scroll at the swarm's pace">Tour</button>
  <button type="button" data-act="speed" title="Build speed">1×</button>
  <button type="button" data-act="sound" aria-pressed="false" title="Sound">Sound off</button>
  <button type="button" data-act="skip" title="Show the finished page (Esc)">Skip</button>
  <button type="button" data-act="replay" hidden>Replay</button>
  <button type="button" data-act="close" aria-label="Hide" hidden>✕</button>
</span>`;
  const rebuild = document.createElement('button');
  rebuild.type = 'button';
  rebuild.className = 'sw-rebuild';
  rebuild.hidden = true;
  rebuild.title = 'Watch the swarm build this page again';
  rebuild.innerHTML = '<span aria-hidden="true">↻</span> Rebuild';
  document.body.append(bar, rebuild);

  const $ = (sel) => bar.querySelector(sel);
  const faces = $('.sw-faces');
  const fill = $('.sw-progress i');
  const btn = (act) => $(`[data-act="${act}"]`);
  let foldTimer = 0;

  const press = (act, on) => btn(act).setAttribute('aria-pressed', String(on));
  const setSound = (on) => {
    press('sound', on);
    btn('sound').textContent = on ? 'Sound on' : 'Sound off';
  };

  bar.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'tour') {
      press('tour', onTour());
    } else if (act === 'speed') {
      btn('speed').textContent = `${onSpeed()}×`;
    } else if (act === 'sound') {
      setSound(onSound());
    } else if (act === 'skip') {
      onSkip();
      // Skip is hidden now; keep focus in the toolbar rather than dropping it on the page.
      btn('replay').focus({ preventScroll: true });
    } else if (act === 'replay') {
      onReplay();
    } else if (act === 'close') {
      fold();
    }
  });
  rebuild.addEventListener('click', () => {
    const hadFocus = document.activeElement === rebuild;
    onReplay();
    // The Rebuild button is hidden now; keep keyboard focus in the toolbar that replaced it.
    if (hadFocus) {
      btn('tour').focus({ preventScroll: true });
    }
  });

  // Roving focus: Tab reaches the toolbar once, arrows move along it.
  const buttons = () => [...bar.querySelectorAll('button:not([hidden])')];
  function rove(target) {
    for (const b of buttons()) {
      b.tabIndex = b === target ? 0 : -1;
    }
  }
  bar.addEventListener('keydown', (e) => {
    const list = buttons();
    const at = list.indexOf(document.activeElement);
    const to = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: list.length - 1 }[e.key];
    if (at < 0 || to === undefined) {
      return;
    }
    e.preventDefault();
    const next = list[(to + list.length) % list.length];
    rove(next);
    next.focus();
  });
  bar.addEventListener('focusin', (e) => {
    if (e.target.matches('button')) {
      rove(e.target);
    }
  });

  function fold() {
    clearTimeout(foldTimer);
    const hadFocus = bar.contains(document.activeElement);
    bar.classList.add('sw-folded');
    rebuild.hidden = false;
    if (hadFocus) {
      rebuild.focus({ preventScroll: true });
    }
  }

  return {
    /** No build this time: just the button to watch one. */
    offer: fold,
    building(total) {
      clearTimeout(foldTimer);
      bar.classList.remove('sw-folded', 'sw-finished');
      rebuild.hidden = true;
      $('[data-total]').textContent = total;
      $('[data-built]').textContent = 0;
      fill.style.width = '0%';
      $('[data-summary]').hidden = true;
      for (const act of ['tour', 'speed', 'sound', 'skip']) {
        btn(act).hidden = false;
      }
      btn('replay').hidden = true;
      btn('close').hidden = true;
      press('tour', false);
      rove(btn('tour'));
    },
    setAgents(agents) {
      $('[data-agents]').textContent = agents.length;
      faces.innerHTML = agents
        .slice(0, 5)
        .map((a) => `<i style="--c:${a.color}" title="${a.name}">${a.name[0]}</i>`)
        .join('');
    },
    setProgress(built, total) {
      $('[data-built]').textContent = built;
      fill.style.width = `${total ? (built / total) * 100 : 100}%`;
    },
    setTour: (on) => press('tour', on),
    setSound,
    /** reason: 'built', 'skipped' (the visitor), or 'failed' (the build broke and the page was shown). */
    finished(count, seconds, reason = 'built') {
      bar.classList.add('sw-finished');
      const summary = $('[data-summary]');
      summary.textContent = {
        built: `Built by ${count} agents in ${Math.round(seconds)} s.`,
        skipped: 'Skipped to the finished page.',
        failed: 'The swarm tripped; here is the finished page.',
      }[reason];
      summary.hidden = false;
      for (const act of ['tour', 'speed', 'skip']) {
        btn(act).hidden = true;
      }
      btn('sound').hidden = true;
      btn('replay').hidden = false;
      btn('close').hidden = false;
      rove(btn('replay'));
      clearTimeout(foldTimer);
      foldTimer = setTimeout(fold, reason === 'built' ? FOLD_MS : 2500);
    },
  };
}

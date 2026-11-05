/*
 * The portfolio page: a swarm of multiplayer cursors builds it as you scroll (src/swarm/), then Iron Spidy
 * drops in over the whole page (spidey-hang-site's HangingSpidey, menu and settings, unchanged in
 * src/overlay/ and vendor/spidey/), with what this site adds: his guide lines, the résumé showcase every
 * couple of minutes, and the terminal.
 */
import './fonts.js';
import './styles/site.css';
import './styles/swarm.css';
import { reminders } from '../vendor/spidey/index.js';
import { SettingsStore, SITE_HEROES } from './overlay/settings-store.js';
import { HangingSpidey } from './overlay/hanging-spidey.js';
import { SpideyMenu } from './overlay/menu.js';
import { resume } from './data/resume.js';
import { initTheme } from './theme.js';
import { initGuide } from './sections/guide.js';
import { createShowcase } from './sections/showcase.js';
import { initTerminal } from './sections/terminal.js';
import { createSwarm } from './swarm/engine.js';

const settings = new SettingsStore();
const refreshers = [];
const refresh = () => refreshers.forEach((fn) => fn());

let menu = null;
const spidey = new HangingSpidey({
  settings,
  onMenu: (x, y) => menu.open(x, y),
  onChange: refresh,
});

/** Anything that acts on him hangs him back up first if he was taken down. */
const ensureUp = () => {
  if (!spidey.up) {
    spidey.hangUp();
  }
};

// What his menu (and the terminal) can do, as spidey-hang-site's main.js.
const actions = {
  swing: (strength = 1) => {
    ensureUp();
    spidey.push(strength);
  },
  reset: () => {
    ensureUp();
    spidey.reset();
  },
  relayout: (changes) => {
    settings.set(changes);
    ensureUp();
    spidey.reset();
    refresh();
  },
  setFlags: (changes) => {
    ensureUp();
    spidey.setFlags(changes);
  },
  setHero: (name) => {
    ensureUp();
    spidey.setHero(name);
  },
  /** The next hero, wrapping round, as the app's nextHero(). */
  nextHero: () => {
    const at = SITE_HEROES.indexOf(settings.get('Hero'));
    actions.setHero(SITE_HEROES[(at + 1) % SITE_HEROES.length]);
  },
  setRotate: (minutes) => {
    settings.set({ RotateMinutes: Math.max(0, minutes) });
    startRotateTimer();
  },
  toggleReminder: (key) => {
    settings.set({ [key]: !settings.get(key) });
    spidey.restartReminders();
    refresh();
  },
  testReminder: (kind = 'water') => {
    ensureUp();
    spidey.remind(reminders.TEXT[kind]);
  },
  takeDown: () => spidey.takeDown(),
  hangUp: () => {
    ensureUp();
    refresh();
  },
  say: (text) => {
    ensureUp();
    spidey.remind(text);
  },
};

menu = new SpideyMenu({ settings, actions });

// "Change hero every": the app's rotate timer.
let rotateTimer = 0;
function startRotateTimer() {
  clearInterval(rotateTimer);
  const minutes = settings.get('RotateMinutes');
  if (minutes > 0) {
    rotateTimer = setInterval(() => spidey.up && actions.nextHero(), minutes * 60 * 1000);
  }
}
startRotateTimer();

// The top bar: the web button opens his menu (the app's tray icon); he can be hung back up after "exit".
const tray = document.querySelector('.tray');
tray.addEventListener('click', () => {
  const r = tray.getBoundingClientRect();
  menu.open(r.left, r.bottom + 6, tray);
});
const hangUp = document.querySelector('.hang-up');
hangUp.addEventListener('click', () => spidey.hangUp());
refreshers.push(() => {
  hangUp.hidden = spidey.up;
});

initTheme(document.querySelector('.theme-toggle'));

// While the swarm rebuilds the page Spidey is hidden, so nothing he would say could be seen.
const building = () => document.documentElement.classList.contains('swarm-building');

const showcase = createShowcase({
  facts: resume.showcase,
  speak: (text) => actions.say(text),
  canSpeak: () => spidey.up && !spidey.bubble.visible && !document.hidden && !building(),
});

initTerminal({ resume, actions, settings, showcase });
refresh();

// The swarm builds the page first; Spidey (hidden meanwhile) drops in when it is done and starts guiding.
const SWARM_KEY = 'sarthak-portfolio.swarm';
const remember = (value) => {
  try {
    if (value) {
      localStorage.setItem(SWARM_KEY, value);
    } else {
      localStorage.removeItem(SWARM_KEY);
    }
  } catch {
    // Storage refused: the choice lasts until the page closes.
  }
};
let guiding = false;
/** reason: how the build ended ('built', 'skipped', 'failed'), or undefined when there was no build. */
function wakeSpidey({ reason } = {}) {
  if (reason === 'skipped') {
    remember('off'); // they chose to skip it: next visit opens on the finished page, with a Rebuild button
  }
  if (spidey.up) {
    spidey.reset();
    spidey.push(1.2);
  }
  if (!guiding) {
    guiding = true;
    initGuide({ spidey, hello: "Hey! I'm showing you around Sarthak's work. Grab me!", quiet: building });
    showcase.start();
  }
}
// What the swarm builds on this page: boxes it drags out (then types their own text into), text blocks it
// types, where to look, what stays stuck to the top, and what the red guide lines up with.
const swarm = createSwarm({
  layers: {
    box: [
      '.topbar', '.panel', '.btn', '.chip', '.chips-row button', '.job .when', '.proj .req', '.proj .res',
      '.hero-card > header', '.term > header', '.tray', '.theme-toggle',
    ].join(','),
    text: [
      'h1', 'h2', 'h3', 'p', 'li', 'pre', '.brand', '.topnav a', '.stats b', '.stats span', '.job .when b',
      '.sfx', '.footer', '.term-out', '.term label',
    ].join(','),
    scope: '.topbar, main, .footer',
    sticky: '.topbar',
    guide: 'main',
  },
  onDone: wakeSpidey,
  onStart: () => {
    remember(null);
    spidey.bubble.hide();
  },
});
// index.html's <head> decides (before the first paint) whether this visit builds. Visitors who asked for
// less motion, or for no swarm (?noswarm), are not offered the Rebuild button either.
const motionOk = !matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]noswarm\b/.test(location.search);
if (document.documentElement.classList.contains('swarm-pending')) {
  swarm.start();
} else {
  if (motionOk) {
    swarm.offer();
  }
  wakeSpidey();
}

// For checks in the browser: what he is doing, like spidey-hang-site's window.__spideyState.
window.__spideyState = () => ({
  ...spidey.readout(),
  up: spidey.up,
  anchorX: spidey.rig.anchor.x,
  flags: spidey.flags,
  bubble: spidey.bubble.visible,
  showcase: showcase.on,
});
window.__showcaseTick = () => showcase.tick();
window.__swarmState = () => swarm.state();

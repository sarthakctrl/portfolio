/*
 * The portfolio page: Iron Spidy hanging over the whole page (spidey-hang-site's HangingSpidey, menu and
 * settings, unchanged in src/overlay/ and vendor/spidey/), plus what this site adds: his guide lines,
 * the résumé showcase every couple of minutes, and the terminal.
 */
import './fonts.js';
import './styles/site.css';
import { reminders } from '../vendor/spidey/index.js';
import { SettingsStore, SITE_HEROES } from './overlay/settings-store.js';
import { HangingSpidey } from './overlay/hanging-spidey.js';
import { SpideyMenu } from './overlay/menu.js';
import { resume } from './data/resume.js';
import { initTheme } from './theme.js';
import { initGuide } from './sections/guide.js';
import { createShowcase } from './sections/showcase.js';
import { initTerminal } from './sections/terminal.js';

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

initGuide({ spidey, hello: "Hey! I'm showing you around Sarthak's work. Grab me!" });

const showcase = createShowcase({
  facts: resume.showcase,
  speak: (text) => actions.say(text),
  canSpeak: () => spidey.up && !spidey.bubble.visible && !document.hidden,
});
showcase.start();

initTerminal({ resume, actions, settings, showcase });
refresh();

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

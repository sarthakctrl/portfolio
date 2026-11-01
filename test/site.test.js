import test from 'node:test';
import assert from 'node:assert/strict';
import { resume } from '../src/data/resume.js';
import { esc, renderPage } from '../src/render.js';
import { createShowcase } from '../src/sections/showcase.js';
import { runCommand, HERO_ALIASES } from '../src/sections/terminal.js';
import { DEFAULTS, SITE_HEROES } from '../src/overlay/settings-store.js';

/** Timers you wind by hand. */
function fakeTimers() {
  let id = 0;
  const pending = new Map();
  return {
    setTimeout: (fn, ms) => (pending.set(++id, { fn, ms }), id),
    clearTimeout: (t) => pending.delete(t),
    /** The only pending timer's delay, then run it. */
    fire() {
      assert.equal(pending.size, 1, 'expected exactly one timer');
      const [[key, { fn, ms }]] = pending;
      pending.delete(key);
      fn();
      return ms;
    },
    get count() {
      return pending.size;
    },
  };
}

test('Iron Spidy is the hero he starts as', () => {
  assert.equal(DEFAULTS.Hero, 'Iron Spider - Web Swing');
  for (const name of Object.values(HERO_ALIASES)) {
    assert.ok(SITE_HEROES.includes(name), `${name} is not a hero the site carries`);
  }
});

test('the showcase takes turns: experience, skills, achievements, through each list', () => {
  const said = [];
  const show = createShowcase({ facts: resume.showcase, speak: (t) => said.push(t), timers: fakeTimers() });
  for (let i = 0; i < 6; i++) {
    show.next();
  }
  const s = resume.showcase;
  const order = [s.experience[0], s.skills[0], s.achievements[0], s.experience[1], s.skills[1], s.achievements[1]];
  const again = createShowcase({ facts: s, speak: () => {}, timers: fakeTimers() });
  assert.deepEqual(order.map(() => again.next()), order);
});

test('the showcase speaks every 2 minutes, first after 40 s, and waits when he is busy', () => {
  const timers = fakeTimers();
  const said = [];
  let free = true;
  const show = createShowcase({ facts: resume.showcase, speak: (t) => said.push(t), canSpeak: () => free, timers });
  show.start();
  assert.equal(timers.fire(), 40_000);
  assert.deepEqual(said, [resume.showcase.experience[0]]);

  free = false; // a bubble is up, or the tab is hidden
  assert.equal(timers.fire(), 120_000);
  assert.equal(said.length, 1, 'talked over a bubble');
  free = true;
  assert.equal(timers.fire(), 15_000);
  assert.deepEqual(said.at(-1), resume.showcase.skills[0]);

  show.stop();
  assert.equal(timers.count, 0, 'still scheduled after stop');
  show.resume();
  assert.equal(timers.count, 1);
});

test('every showcase fact fits his bubble and is about Sarthak', () => {
  for (const [kind, list] of Object.entries(resume.showcase)) {
    assert.ok(list.length > 0, `${kind} is empty`);
    for (const fact of list) {
      assert.ok(fact.length <= 120, `too long for the bubble: ${fact}`);
    }
  }
});

test('the terminal answers from the résumé and drives Spidey through his actions', () => {
  const calls = [];
  const settings = new Map(Object.entries({ Hero: DEFAULTS.Hero, Breeze: false, AutoSwing: false }));
  const actions = new Proxy({}, {
    get: (_, name) => (...args) => {
      calls.push([name, ...args]);
      if (name === 'setHero') settings.set('Hero', args[0]);
      if (name === 'setFlags') Object.entries(args[0]).forEach(([k, v]) => settings.set(k, v));
    },
  });
  const showcase = { now: () => calls.push(['fact']), stop: () => calls.push(['stop']), resume: () => calls.push(['resume']) };
  const run = (line) => runCommand(line, { resume, actions, settings, showcase });

  assert.deepEqual(run('whoami').lines, ['Sarthak Sharma — Backend Developer — Udhampur, J&K 182101, India']);
  assert.ok(run('skills').lines.includes('Databases: MySQL, PostgreSQL, MongoDB, Database Design'));
  assert.equal(JSON.parse(run('curl /api/experience').lines[0])[0].company, 'Wealthmax');
  assert.deepEqual(run('contact').lines[0], 'sarthakjk14@gmail.com | +91 9086516883');

  run('swing');
  run('say Hire Sarthak!');
  run('HERO comic');
  run('breeze');
  run('fact');
  run('facts off');
  assert.deepEqual(calls, [
    ['swing', 1.4],
    ['say', 'Hire Sarthak!'],
    ['setHero', 'Comic Spidey - Web Swing'],
    ['setFlags', { Breeze: true }],
    ['fact'],
    ['stop'],
  ]);
  assert.equal(run('nope').dim, true);
  assert.equal(run('clear').clear, true);
});

test('rendering escapes text and refuses unknown slots', () => {
  assert.equal(esc(`<b>"P&M" it's</b>`), '&lt;b&gt;&quot;P&amp;M&quot; it&#39;s&lt;/b&gt;');
  assert.throws(() => renderPage('<!-- render:nope -->', resume), /render:nope/);
});

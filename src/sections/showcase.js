/*
 * Spidey's showcase: every couple of minutes he pops up one fact from the résumé, taking turns between
 * experience, skills and achievements, and going through each list in order. He never talks over a
 * bubble that is already up and waits while the tab is hidden: canSpeak() says when, and a "not now"
 * tries again shortly. No DOM here; the page passes speak/canSpeak in (and the tests pass fake timers).
 */
export const EVERY_MS = 2 * 60 * 1000;
export const FIRST_MS = 40 * 1000;
export const RETRY_MS = 15 * 1000;

export function createShowcase({
  facts,
  speak,
  canSpeak = () => true,
  every = EVERY_MS,
  first = FIRST_MS,
  retry = RETRY_MS,
  timers = globalThis,
}) {
  const kinds = Object.keys(facts).filter((k) => facts[k].length > 0);
  const at = Object.fromEntries(kinds.map((k) => [k, 0]));
  let turn = 0;
  let timer = 0;
  let on = false;

  /** The next fact, round-robin across the kinds and through each list. */
  function next() {
    const kind = kinds[turn++ % kinds.length];
    const list = facts[kind];
    return list[at[kind]++ % list.length];
  }

  function schedule(ms) {
    timers.clearTimeout(timer);
    if (on) {
      timer = timers.setTimeout(tick, ms);
    }
  }

  function tick() {
    if (!canSpeak()) {
      schedule(retry);
      return;
    }
    speak(next());
    schedule(every);
  }

  return {
    next,
    tick,
    get on() {
      return on;
    },
    start() {
      on = true;
      schedule(first);
    },
    /** Says one right now and starts the wait for the next from here. */
    now() {
      speak(next());
      schedule(every);
    },
    stop() {
      on = false;
      timers.clearTimeout(timer);
    },
    resume() {
      on = true;
      schedule(retry);
    },
  };
}

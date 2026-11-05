/*
 * The swarm build: the page starts blank and a crew of multiplayer cursors builds it back as you scroll.
 * Boxes are dragged out with a crosshair and a live W × H badge, text is typed with an I-beam, repeated
 * cards and chips are ⌥-dragged out of the first one, and a red guide comes off the ruler first. When the
 * last layer lands the cursors flock to your mouse and leave, and onDone() hands the page to Spidey.
 *
 * The page underneath is the real one the whole time: layers are only faded out (opacity), so text and
 * search stay intact, and focusing something not built yet shows it at once. If anything goes wrong the
 * finished page is shown, so a bug here can never leave the page blank; onDone({ reason }) says whether
 * the build was 'built', 'skipped' by the visitor, or 'failed'.
 *
 * The engine knows nothing about this page's markup: the page passes in which selectors are boxes, which
 * are text, where to look, what stays stuck to the top, and what the guide lines up with.
 *
 * plan.js decides what comes next (and is tested without a DOM); typer.js types text in place;
 * rulers.js draws the rulers and guide; toolbar.js is the controls. This file measures the page into
 * layers and moves the cursors. Each frame reads the layout first and writes after, and element boxes
 * are cached for the frame, so the browser lays the page out about once a frame, not once per cursor.
 *
 * Inspired by Joel Califa's Swarm (califa.github.io/swarm-site) and Dhvanil Patel's Swarm Rebuild.
 */
import {
  planTasks, isReady, pickTask, chainOf, typingPace, agentTarget, gapLabel, travelMs,
} from './plan.js';
import { CREW, cursorSvg, HOTSPOT } from './cursors.js';
import { createSound } from './sound.js';
import { createToolbar } from './toolbar.js';
import { createTyper, ownText, HIDDEN } from './typer.js';
import { createRulers } from './rulers.js';

const INTRO_MS = 1300;
const FLOCK_MS = 2200;
/**
 * With work ready and nothing landing for this long, something is wrong: show the finished page.
 * Swarm time, which stands still while the tab is hidden, so coming back to the tab never trips it.
 */
const STALL_MS = 12_000;
const ABORT = Symbol('swarm stopped');

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const lerp = (a, b, t) => a + (b - a) * t;

/** An element's box in page pixels, measured now (for setting up; in a frame use the cached rectOf). */
function pageRect(el) {
  const r = el.getBoundingClientRect();
  return { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height };
}

/**
 * layers: { box, text, scope, sticky, guide } selectors. box: drawn as boxes (crosshair drag), then their
 * own text typed. text: blocks whose text is typed into a dragged-out text box. scope: where to look.
 * sticky: stays on screen however far you scroll (never built at once for being scrolled past). guide:
 * the element whose content edge the red guide marks.
 */
export function createSwarm({ layers: sel, onDone = () => {}, onStart = () => {} }) {
  const sound = createSound();
  const html = document.documentElement;

  let root = null;
  let marksLayer = null;
  let agentsLayer = null;
  let announcer = null;
  let rulers = null;
  let toolbar = null;

  let tasks = [];
  let byId = new Map();
  let taskOf = new Map();
  let layerSet = new Set();
  let done = new Set();
  let claimed = new Set();
  let agents = [];
  const marks = new Set();
  const typers = new Set();

  let epoch = 0;
  let running = false;
  let introDone = false;
  let finishing = false;
  let speed = 1;
  let tour = false;
  let clock = 0;
  let lastTs = 0;
  let raf = 0;
  let startedAt = 0;
  let lastProgress = 0;
  let frameWaiters = [];
  let lastSpawn = 0;
  let lastScrollY = 0;
  let scrollSpeed = 0;
  let guideX = null;
  let remeasure = false;
  let guidePad = 0;
  const mouse = { x: 0, y: 0, seen: false };

  // Element boxes, cached for one frame. The swarm's own writes (text typed into ghosts, opacity) never
  // move anything, so a box measured once a frame stays right for the rest of it.
  let frameNo = 0;
  let cachedFrame = -1;
  const rects = new Map();
  function rectOf(el) {
    if (cachedFrame !== frameNo) {
      cachedFrame = frameNo;
      rects.clear();
    }
    let r = rects.get(el);
    if (!r) {
      r = pageRect(el);
      rects.set(el, r);
    }
    return r;
  }

  // ---- Clock: one animation frame drives everything, scaled by the 1× / 2× / 3× speed ----------

  const nextFrame = () => new Promise((resolve) => frameWaiters.push(resolve));

  /** Runs step(t) for t from 0 to 1 over ms of swarm time. Throws ABORT if the build stopped meanwhile. */
  async function tween(ms, step, my) {
    const start = clock;
    for (;;) {
      if (my !== epoch) {
        throw ABORT;
      }
      const t = ms <= 0 ? 1 : Math.min(1, (clock - start) / ms);
      step(t);
      if (t >= 1) {
        return;
      }
      await nextFrame();
    }
  }
  const wait = (ms, my) => tween(ms, () => {}, my);

  /** Runs a cursor coroutine; ABORT is a normal stop, anything else shows the finished page. */
  const guarded = (job) => job.catch((err) => {
    if (err !== ABORT) {
      fail(err);
    }
  });

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    // Up to a quarter second a frame: a slow device still builds in real time, a background tab pauses.
    const dt = lastTs ? Math.min(250, ts - lastTs) : 16;
    lastTs = ts;
    frameNo++;
    clock += dt * speed;
    const waiters = frameWaiters;
    frameWaiters = [];
    waiters.forEach((resolve) => resolve());
    try {
      update(dt);
    } catch (err) {
      fail(err);
    }
  }

  // ---- Measuring the page into layers -------------------------------------------------------------

  function collect() {
    const scope = [...document.querySelectorAll(sel.scope)];
    const found = [...document.querySelectorAll(`${sel.box},${sel.text}`)].filter((el) =>
      scope.some((s) => s.contains(el)) &&
      !el.closest(HIDDEN) &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden');
    const set = new Set(found);
    const ids = new Map(found.map((el, i) => [el, i]));
    const sibIds = new Map();
    const sibOf = (el) => {
      if (!sibIds.has(el)) {
        sibIds.set(el, sibIds.size);
      }
      return sibIds.get(el);
    };
    const closestLayer = (node) => {
      for (let at = node.parentElement; at; at = at.parentElement) {
        if (set.has(at)) {
          return at;
        }
      }
      return null;
    };
    // A text block with no text of its own is not a layer; what sits in it hangs off the next one up.
    const kept = found.filter((el) => el.matches(sel.box) || ownText(el, set).length > 0);
    const keptSet = new Set(kept);
    const parentOf = (el) => {
      let at = closestLayer(el);
      while (at && !keptSet.has(at)) {
        at = closestLayer(at);
      }
      return at;
    };
    const layers = kept.map((el) => {
      const parentEl = parentOf(el);
      const r = pageRect(el);
      return {
        id: ids.get(el),
        parent: parentEl ? ids.get(parentEl) : null,
        sib: sibOf(el.parentElement),
        sig: `${el.tagName}.${el.classList[0] || ''}`,
        box: el.matches(sel.box),
        sticky: !!el.closest(sel.sticky),
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        el,
      };
    });
    return { layers, set };
  }

  function measure() {
    for (const task of tasks) {
      const r = pageRect(task.el);
      Object.assign(task, { top: r.top, left: r.left, width: r.width, height: r.height });
    }
    guidePad = parseFloat(getComputedStyle(document.querySelector(sel.guide)).paddingLeft) || 0;
  }

  // ---- Showing layers ------------------------------------------------------------------------------

  function reveal(el) {
    el.classList.remove('sw-wait');
    el.classList.add('sw-in');
  }

  function typerFor(el) {
    const typer = createTyper(el, layerSet, (t) => typers.delete(t));
    if (typer) {
      typers.add(typer);
    }
    return typer;
  }

  // ---- Marks: selection boxes, size badges, ⌥-drag clones ----------------------------------------

  /**
   * A mark drawn from rect() (page pixels) every frame until removed: read() measures it, write() moves
   * it, so a frame can measure every mark before it moves any.
   */
  function addMark(kind, rect, label = () => '') {
    const el = document.createElement('div');
    el.className = `sw-mark sw-${kind}`;
    el.innerHTML = '<i class="h tl"></i><i class="h tr"></i><i class="h bl"></i><i class="h br"></i><b class="sw-badge"></b>';
    const badge = el.querySelector('.sw-badge');
    marksLayer.append(el);
    let r = null;
    let text = '';
    const mark = {
      el,
      rect,
      read() {
        r = rect();
        text = label(r);
      },
      write() {
        el.style.transform = `translate(${r.left - scrollX}px, ${r.top - scrollY}px)`;
        el.style.width = `${Math.max(0, r.width)}px`;
        el.style.height = `${Math.max(0, r.height)}px`;
        if (badge.textContent !== text) {
          badge.textContent = text;
        }
        badge.hidden = !text;
      },
      /** Fades out and goes; never throws, so it is safe to leave un-awaited. */
      async fade(ms = 220) {
        el.classList.add('sw-out');
        try {
          await wait(ms, epoch);
        } catch {
          // Stopped mid-fade: it goes now instead.
        }
        mark.remove();
      },
      remove() {
        el.remove();
        marks.delete(mark);
      },
    };
    marks.add(mark);
    mark.read();
    mark.write();
    return mark;
  }
  const sizeLabel = (r) => `${Math.round(r.width)} × ${Math.round(r.height)}`;

  // ---- Cursors ------------------------------------------------------------------------------------

  function spawn(at) {
    const [name, color] = CREW[agents.length % CREW.length];
    const el = document.createElement('div');
    el.className = 'sw-agent';
    el.style.setProperty('--c', color);
    el.innerHTML = `<span class="sw-shape"></span><span class="sw-name">${name}</span>`;
    agentsLayer.append(el);
    const shapeEl = el.querySelector('.sw-shape');
    const agent = {
      index: agents.length,
      name,
      color,
      el,
      shape: '',
      x: at.x,
      y: at.y,
      /** The caret this cursor is typing at, if any: the frame puts the cursor on it. */
      follow: null,
      setShape(shape) {
        if (agent.shape !== shape) {
          agent.shape = shape;
          shapeEl.innerHTML = cursorSvg(shape, color);
        }
      },
      draw() {
        const [hx, hy] = HOTSPOT[agent.shape] || HOTSPOT.arrow;
        el.style.transform = `translate3d(${agent.x - scrollX - hx}px, ${agent.y - scrollY - hy}px, 0)`;
      },
    };
    agent.setShape('arrow');
    agent.draw();
    agents.push(agent);
    toolbar.setAgents(agents);
    return agent;
  }

  /** Somewhere just off a random edge of the screen, in page pixels. */
  function offscreen() {
    const side = Math.floor(Math.random() * 4);
    const x = side === 0 ? -30 : side === 1 ? innerWidth + 30 : rand(0, innerWidth);
    const y = side === 2 ? -30 : side === 3 ? innerHeight + 30 : rand(0, innerHeight);
    return { x: x + scrollX, y: y + scrollY };
  }

  const pan = (agent) => clamp(((agent.x - scrollX) / innerWidth) * 2 - 1, -1, 1);

  /** Glides to target() (page pixels, read every frame) on a slight arc, like a hand on a mouse. */
  async function moveTo(agent, target, my) {
    const sx = agent.x;
    const sy = agent.y;
    const first = target();
    const dist = Math.hypot(first.x - sx, first.y - sy);
    const bend = rand(-0.12, 0.12);
    await tween(travelMs(dist), (t) => {
      const p = target();
      const e = easeInOut(t);
      const arc = Math.sin(Math.PI * t) * dist * bend;
      const dx = p.x - sx;
      const dy = p.y - sy;
      const len = Math.hypot(dx, dy) || 1;
      agent.x = sx + dx * e - (dy / len) * arc;
      agent.y = sy + dy * e + (dx / len) * arc;
    }, my);
  }

  // ---- What a cursor does with a task -------------------------------------------------------------

  async function typeInto(agent, typer, my, pace = 1) {
    if (!typer) {
      return;
    }
    agent.setShape('ibeam');
    agent.follow = typer.caret;
    let shown = -1;
    try {
      await tween((typingPace(typer.total) * typer.total) / pace, (t) => {
        const n = Math.round(typer.total * t);
        if (n !== shown) {
          shown = n;
          typer.set(n);
          sound.key(pan(agent));
        }
      }, my);
    } finally {
      agent.follow = null;
    }
    typer.finish();
  }

  async function doBox(agent, task, my) {
    const r0 = () => rectOf(task.el);
    agent.setShape('arrow');
    await moveTo(agent, () => ({ x: r0().left, y: r0().top }), my);
    agent.setShape('cross');
    sound.press(pan(agent));
    let p = 0;
    const mark = addMark('draw', () => {
      const r = r0();
      return { left: r.left, top: r.top, width: r.width * p, height: r.height * p };
    }, sizeLabel);
    rulers.focus(mark);
    const side = Math.sqrt(task.width * task.height);
    const typer = typerFor(task.el);
    try {
      await tween(clamp(260 + side * 0.9, 300, 800), (t) => {
        p = easeOut(t);
        const r = r0();
        agent.x = r.left + r.width * p;
        agent.y = r.top + r.height * p;
      }, my);
      sound.press(pan(agent));
      reveal(task.el);
      sound.note(pan(agent), clamp(1 - side / 700, 0, 1));
      mark.el.classList.add('sw-set');
      await wait(180, my);
    } finally {
      mark.fade();
    }
    await typeInto(agent, typer, my);
  }

  async function doText(agent, task, my) {
    const r0 = () => rectOf(task.el);
    agent.setShape('ibeam');
    await moveTo(agent, () => ({ x: r0().left, y: r0().top + 10 }), my);
    sound.press(pan(agent));
    let p = 0;
    const mark = addMark('text', () => {
      const r = r0();
      return { left: r.left, top: r.top, width: r.width * p, height: r.height };
    });
    const typer = typerFor(task.el);
    reveal(task.el);
    try {
      await tween(220, (t) => {
        p = easeOut(t);
      }, my);
      await typeInto(agent, typer, my);
    } finally {
      mark.fade();
    }
  }

  /** ⌥-drag a copy out of the master, with a red measurement to it, then retype its text. */
  async function doDup(agent, task, my) {
    const master = byId.get(task.master).el;
    const m0 = () => rectOf(master);
    const t0 = () => rectOf(task.el);
    agent.setShape('arrow');
    await moveTo(agent, () => ({ x: m0().left + m0().width * 0.5, y: m0().top + m0().height * 0.5 }), my);
    sound.press(pan(agent));
    const select = addMark('select', m0);
    let p = 0;
    const at = () => {
      const a = m0();
      const b = t0();
      const e = easeInOut(p);
      return { left: lerp(a.left, b.left, e), top: lerp(a.top, b.top, e), width: lerp(a.width, b.width, e), height: lerp(a.height, b.height, e) };
    };
    const clone = addMark('clone', at, (r) => gapLabel(m0(), r));
    const typer = typerFor(task.el);
    try {
      await wait(120, my);
      agent.setShape('dup');
      const a = m0();
      const b = t0();
      await tween(clamp(380 + Math.hypot(b.left - a.left, b.top - a.top) * 0.35, 420, 950), (t) => {
        p = t;
        const r = at();
        agent.x = r.left + r.width * 0.5;
        agent.y = r.top + r.height * 0.5;
      }, my);
      sound.press(pan(agent));
      reveal(task.el);
      sound.note(pan(agent), 0.8);
    } finally {
      select.fade();
      clone.fade(160);
    }
    agent.setShape('arrow');
    await typeInto(agent, typer, my, 1.6);
  }

  /** The first job of the build: pull a red guide off the left ruler to where the content starts. */
  async function doGuide(agent, my) {
    const edge = document.querySelector(sel.guide);
    guidePad = parseFloat(getComputedStyle(edge).paddingLeft) || 0;
    const target = () => rectOf(edge).left - scrollX + guidePad;
    agent.setShape('arrow');
    await moveTo(agent, () => ({ x: scrollX + 10, y: scrollY + innerHeight * 0.4 }), my);
    sound.press(pan(agent));
    agent.setShape('cross');
    await tween(700, (t) => {
      guideX = lerp(10, target(), easeInOut(t));
      agent.x = scrollX + guideX;
    }, my);
    sound.press(pan(agent));
    rulers.guide(target);
  }

  async function agentLoop(agent, my, first) {
    if (first) {
      await doGuide(agent, my);
    }
    while (my === epoch && !finishing) {
      const task = pickTask(tasks, {
        done,
        claimed,
        viewBottom: scrollY + innerHeight,
        from: { x: agent.x, y: agent.y },
      });
      if (!task) {
        await idle(agent, my);
        continue;
      }
      claimed.add(task.id);
      try {
        if (task.kind === 'dup') {
          await doDup(agent, task, my);
        } else if (task.kind === 'box') {
          await doBox(agent, task, my);
        } else {
          await doText(agent, task, my);
        }
        complete(task);
      } finally {
        claimed.delete(task.id);
      }
    }
  }

  /** Nothing to do: drift about the lower middle of the screen for a moment, then look again. */
  async function idle(agent, my) {
    agent.setShape('arrow');
    const angle = agent.index * 2.4 + clock / 1400;
    const target = {
      x: scrollX + innerWidth * 0.5 + Math.cos(angle) * innerWidth * 0.22,
      y: scrollY + innerHeight * 0.62 + Math.sin(angle) * innerHeight * 0.14,
    };
    await tween(260, () => {
      agent.x = lerp(agent.x, target.x, 0.06);
      agent.y = lerp(agent.y, target.y, 0.06);
    }, my);
  }

  function complete(task) {
    done.add(task.id);
    lastProgress = clock;
    toolbar.setProgress(done.size, tasks.length);
  }

  /** Builds a task (and whatever it stands on) at once, with no cursor: for scrolling past and focus. */
  function instant(id) {
    const chain = chainOf(id, byId);
    if (chain.some((at) => claimed.has(at))) {
      return false;
    }
    for (const at of chain) {
      if (!done.has(at)) {
        reveal(byId.get(at).el);
        complete(byId.get(at));
      }
    }
    return true;
  }

  // ---- Every frame --------------------------------------------------------------------------------

  function update(dt) {
    const dy = scrollY - lastScrollY;
    lastScrollY = scrollY;
    scrollSpeed = lerp(scrollSpeed, (dy / Math.max(1, dt)) * 1000, 0.1);

    if (running && !finishing) {
      if (remeasure) {
        remeasure = false;
        measure();
      }
      const viewBottom = scrollY + innerHeight;
      let backlog = 0;
      let open = 0;
      let ready = 0;
      for (const task of tasks) {
        if (done.has(task.id)) {
          continue;
        }
        // Anything you scrolled well past is built at once, so scrolling back up never shows a gap.
        if (!task.sticky && task.top + task.height < scrollY - 60 && instant(task.id)) {
          continue;
        }
        if (!claimed.has(task.id) && task.top < viewBottom) {
          backlog++;
        }
        if (!task.sticky && task.top < scrollY + innerHeight * 0.85) {
          open++;
        }
        if (isReady(task, done, claimed, viewBottom)) {
          ready++;
        }
      }
      if (introDone && agents.length < agentTarget(backlog, scrollSpeed) && clock - lastSpawn > 260) {
        lastSpawn = clock;
        guarded(agentLoop(spawn(offscreen()), epoch, false));
      }
      if (tour) {
        const bottom = html.scrollHeight - innerHeight;
        if (open <= 2 && scrollY < bottom) {
          scrollTo({ top: Math.min(bottom, scrollY + 2.4 * speed * (dt / 16)), behavior: 'instant' });
        }
      }
      if (introDone && ready > 0 && clock - lastProgress > STALL_MS) {
        fail(new Error(`no layer built in ${STALL_MS / 1000} s with ${ready} ready`));
        return;
      }
      if (done.size === tasks.length && guideX !== null) {
        guarded(finale(epoch));
      }
    }
    // Read everything first (one layout), then write: carets for typing cursors, then every mark's box.
    for (const agent of agents) {
      if (agent.follow) {
        const c = agent.follow.getBoundingClientRect();
        if (c.height > 0) {
          agent.x = c.left + scrollX + 3;
          agent.y = c.top + scrollY + c.height / 2;
        }
      }
    }
    for (const mark of marks) {
      mark.read();
    }
    for (const mark of marks) {
      mark.write();
    }
    for (const agent of agents) {
      agent.draw();
    }
    rulers.draw(guideX);
  }

  // ---- Start, finish, skip, replay ----------------------------------------------------------------

  function mount() {
    if (root) {
      return;
    }
    root = document.createElement('div');
    root.className = 'sw-root';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `<div class="sw-ruler sw-ruler-top"><i class="sw-band"></i></div>
<div class="sw-ruler sw-ruler-left"><i class="sw-band"></i></div><div class="sw-corner"></div>
<div class="sw-guide"><b class="sw-badge"></b></div>
<img class="sw-emblem" alt="" src="${import.meta.env.BASE_URL}favicon.png">
<div class="sw-marks"></div><div class="sw-agents"></div>`;
    announcer = document.createElement('p');
    announcer.className = 'visually-hidden';
    announcer.setAttribute('role', 'status');
    document.body.append(root, announcer);
    marksLayer = root.querySelector('.sw-marks');
    agentsLayer = root.querySelector('.sw-agents');
    rulers = createRulers(root);
    toolbar = createToolbar({
      onTour: () => (tour = !tour),
      onSpeed: () => (speed = speed === 3 ? 1 : speed + 1),
      onSound: () => (sound.on = !sound.on),
      onSkip: skip,
      onReplay: replay,
    });

    addEventListener('pointermove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.seen = true;
    }, { passive: true });
    // Taking the wheel (or a finger) stops the tour.
    const stopTour = () => {
      if (tour) {
        tour = false;
        toolbar.setTour(false);
      }
    };
    addEventListener('wheel', stopTour, { passive: true });
    addEventListener('touchstart', stopTour, { passive: true });
    // Tabbing to something not built yet builds it (and what it sits in) at once. If a cursor is still
    // on part of that, it at least shows now, so focus never lands on something invisible; the cursor
    // finishes its part as usual.
    document.addEventListener('focusin', (e) => {
      if (!running || finishing) {
        return;
      }
      for (let at = e.target; at; at = at.parentElement) {
        const task = taskOf.get(at);
        if (task && !done.has(task.id) && !instant(task.id)) {
          chainOf(task.id, byId).forEach((id) => reveal(byId.get(id).el));
        }
      }
    });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && running && !finishing && !e.target.closest?.('input, textarea, [role="menu"]')) {
        skip();
      }
    });
    addEventListener('resize', () => {
      remeasure = true; // once, on the next frame, however many resize events arrive
    });
  }

  function announce(text) {
    announcer.textContent = text;
  }

  function start() {
    mount();
    const my = ++epoch;
    const { layers, set } = collect();
    layerSet = set;
    tasks = planTasks(layers);
    byId = new Map(tasks.map((task) => [task.id, task]));
    taskOf = new Map(tasks.map((task) => [task.el, task]));
    tasks.forEach((task) => {
      task.el.classList.remove('sw-in');
      task.el.classList.add('sw-wait');
    });
    html.classList.remove('swarm-pending', 'swarm-done');
    html.classList.add('swarm-building');
    root.classList.remove('sw-finish', 'sw-gone');
    root.classList.add('sw-intro');
    done = new Set();
    claimed = new Set();
    finishing = false;
    introDone = false;
    running = true;
    guideX = null;
    rulers.guide(null);
    startedAt = performance.now();
    lastProgress = clock;
    lastScrollY = scrollY;
    toolbar.building(tasks.length);
    announce('The page is being built by a swarm of cursors. Press Escape, or the Skip button, to show it finished.');
    onStart();
    if (!raf) {
      lastTs = 0;
      raf = requestAnimationFrame(loop);
    }
    guarded(intro(my));
  }

  /** The cursors arrive and circle Spidey's mask in the middle of the screen, then fan out to work. */
  async function intro(my) {
    const crew = Array.from({ length: 10 }, () => spawn(offscreen()));
    const radius = Math.min(innerWidth, innerHeight) * 0.16;
    await tween(INTRO_MS, (t) => {
      const cx = scrollX + innerWidth / 2;
      const cy = scrollY + innerHeight / 2;
      crew.forEach((agent, i) => {
        const a = (i / crew.length) * Math.PI * 2 + t * 2.6;
        const r = radius * (1 + Math.sin(i * 1.7 + t * 6) * 0.12);
        agent.x = lerp(agent.x, cx + Math.cos(a) * r, 0.12);
        agent.y = lerp(agent.y, cy + Math.sin(a) * r, 0.12);
      });
    }, my);
    root.classList.remove('sw-intro');
    introDone = true;
    lastProgress = clock;
    crew.forEach((agent, i) => guarded(agentLoop(agent, my, i === 0)));
  }

  /** Hands the finished page over: classes, toolbar, screen reader, then onDone({ reason }). */
  function settle(reason) {
    finishing = true;
    running = false;
    tour = false;
    root.classList.add('sw-finish');
    html.classList.remove('swarm-building');
    html.classList.add('swarm-done');
    toolbar.setProgress(tasks.length, tasks.length);
    toolbar.finished(agents.length, (performance.now() - startedAt) / 1000, reason);
    announce('The page is built.');
    onDone({ reason });
  }

  /** Everything is built: the rulers go, the cursors flock to your mouse and leave, Spidey takes over. */
  async function finale(my) {
    if (finishing) {
      return;
    }
    settle('built');
    await tween(FLOCK_MS * speed, (t) => {
      const cx = (mouse.seen ? mouse.x : innerWidth / 2) + scrollX;
      const cy = (mouse.seen ? mouse.y : innerHeight / 2) + scrollY;
      agents.forEach((agent, i) => {
        agent.setShape('arrow');
        const a = i * 2.4 + clock / 700;
        const r = 34 + (i % 5) * 14;
        const pull = 0.05 + (i % 3) * 0.02;
        agent.x = lerp(agent.x, cx + Math.cos(a) * r, pull);
        agent.y = lerp(agent.y, cy + Math.sin(a) * r, pull);
      });
      if (t > 0.8) {
        root.classList.add('sw-gone');
      }
    }, my);
    await wait(400 * speed, my);
    teardown();
  }

  /** Stops every cursor and builds whatever is left at once. */
  function halt() {
    epoch++;
    [...typers].forEach((typer) => typer.finish());
    [...marks].forEach((mark) => mark.remove());
    for (const task of tasks) {
      reveal(task.el);
      done.add(task.id);
    }
    claimed.clear();
  }

  function teardown() {
    cancelAnimationFrame(raf);
    raf = 0;
    // Wake whatever still waits for a frame with the epoch moved on, so it stops (ABORT) and lets go of
    // this run's cursors and marks, instead of waiting forever.
    epoch++;
    const waiting = frameWaiters;
    frameWaiters = [];
    waiting.forEach((resolve) => resolve());
    agents.forEach((agent) => agent.el.remove());
    agents = [];
    toolbar.setAgents(agents);
    guideX = null;
    rulers.guide(null);
    rulers.draw(null);
  }

  /** Ends the build now with everything shown: the visitor skipped ('skipped'), or it broke ('failed'). */
  function end(reason) {
    if (!running) {
      return;
    }
    halt();
    root.classList.add('sw-gone');
    settle(reason);
    teardown();
  }
  const skip = () => end('skipped');

  /** Something broke: never leave the visitor a blank page. */
  function fail(err) {
    console.error('The swarm build stopped; showing the finished page.', err);
    end('failed');
  }

  function replay() {
    if (running) {
      halt();
    }
    teardown();
    scrollTo({ top: 0, behavior: 'instant' });
    start();
  }

  /** The page opens finished (the visitor skipped a build before): offer the Rebuild button only. */
  function offer() {
    mount();
    toolbar.offer();
  }

  return {
    start,
    offer,
    skip,
    replay,
    get running() {
      return running;
    },
    /** For checks in the browser. */
    state: () => ({
      running,
      finishing,
      layers: tasks.length,
      built: done.size,
      agents: agents.length,
      speed,
      tour,
      kinds: tasks.reduce((n, task) => ({ ...n, [task.kind]: (n[task.kind] || 0) + 1 }), {}),
    }),
  };
}

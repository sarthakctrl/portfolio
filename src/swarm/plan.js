/*
 * The swarm's plan, with no DOM: which layers there are, what each one waits for, which one an idle
 * cursor takes next, how fast text types and how many cursors are out. engine.js measures the page into
 * plain layer objects and asks these functions; the tests ask them too.
 *
 * A layer: { id, parent (the layer it sits in, or null), sib (which DOM parent it is a child of), sig
 * (its look: tag and first class), box (draws a rect), top, left, width, height } in page pixels.
 */

export const MIN_AGENTS = 6;
export const MAX_AGENTS = 18;
/** Layers this far below the bottom of the screen are already open for work. */
export const LOOKAHEAD = 120;

/**
 * Tasks in build order (top to bottom, then left to right). Repeated boxes that share a parent and a
 * look (chips, cards, buttons) become one master plus duplicates that wait for it and are ⌥-dragged
 * out of it.
 */
export function planTasks(layers) {
  const groups = new Map();
  for (const layer of layers) {
    if (layer.box) {
      const key = `${layer.sib}|${layer.sig}`;
      groups.set(key, [...(groups.get(key) || []), layer]);
    }
  }
  const masterOf = new Map();
  for (const members of groups.values()) {
    if (members.length > 1) {
      const [master, ...copies] = [...members].sort(byPlace);
      copies.forEach((copy) => masterOf.set(copy.id, master.id));
    }
  }
  return [...layers].sort(byPlace).map((layer) => ({
    ...layer,
    kind: masterOf.has(layer.id) ? 'dup' : layer.box ? 'box' : 'text',
    master: masterOf.get(layer.id) ?? null,
  }));
}

function byPlace(a, b) {
  return a.top - b.top || a.left - b.left;
}

/** Open for work: not started, its parent (and master) built, and on or just below the screen. */
export function isReady(task, done, claimed, viewBottom) {
  return (
    !done.has(task.id) &&
    !claimed.has(task.id) &&
    (task.parent === null || done.has(task.parent)) &&
    (task.master === null || done.has(task.master)) &&
    task.top <= viewBottom + LOOKAHEAD
  );
}

/**
 * The task an idle cursor at `from` takes: the highest ready one, nearer ones winning a close race so
 * cursors fan out rather than all crossing the page.
 */
export function pickTask(tasks, { done, claimed, viewBottom, from }) {
  let best = null;
  let bestScore = Infinity;
  for (const task of tasks) {
    if (!isReady(task, done, claimed, viewBottom)) {
      continue;
    }
    const dx = task.left - from.x;
    const dy = task.top - from.y;
    const score = task.top + Math.hypot(dx, dy) * 0.35;
    if (score < bestScore) {
      bestScore = score;
      best = task;
    }
  }
  return best;
}

/** Everything a task stands on (its parent and master, theirs, and so on), then the task. */
export function chainOf(id, byId) {
  const chain = [];
  const seen = new Set();
  const visit = (at) => {
    if (at === null || at === undefined || seen.has(at)) {
      return;
    }
    seen.add(at);
    const task = byId.get(at);
    if (!task) {
      return;
    }
    visit(task.parent);
    visit(task.master);
    chain.push(at);
  };
  visit(id);
  return chain;
}

/** Typing: ms per character, so a label is quick and a paragraph still lands in a few seconds. */
export function typingPace(length, speed = 1) {
  const total = Math.min(2600, Math.max(260, length * 30));
  return total / Math.max(1, length) / speed;
}

/** How many cursors should be out: more when work piles up or the visitor scrolls fast. */
export function agentTarget(backlog, scrollSpeed = 0) {
  const fromWork = Math.ceil(backlog / 3);
  const fromScroll = Math.floor(Math.abs(scrollSpeed) / 500);
  return Math.max(MIN_AGENTS, Math.min(MAX_AGENTS, MIN_AGENTS + fromWork + fromScroll));
}

/**
 * The red measurement while a copy is ⌥-dragged out of its master: the gap between them along whichever
 * axis they are apart on, or '' while they still overlap.
 */
export function gapLabel(master, copy) {
  const dx = copy.left - (master.left + master.width);
  const dy = copy.top - (master.top + master.height);
  const gap = Math.max(dx, dy);
  return gap > 0 ? `${Math.round(gap)}` : '';
}

/** How long a cursor takes to glide `dist` pixels: quick for a hop, never a crawl across the page. */
export function travelMs(dist) {
  return Math.max(240, Math.min(900, 200 + dist * 0.5));
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  planTasks, isReady, pickTask, chainOf, typingPace, agentTarget, gapLabel, travelMs, MIN_AGENTS, MAX_AGENTS, LOOKAHEAD,
  SPHERE, nodeSphere, sphereSpin, projectSphere, spherePoint, sphereNode,
} from '../src/swarm/plan.js';

/** A layer as engine.js measures one. */
const layer = (id, top, more = {}) => ({
  id, parent: null, sib: 0, sig: 'DIV.panel', box: true, top, left: 0, width: 100, height: 40, ...more,
});

test('repeated sibling boxes become one master and its duplicates; text never does', () => {
  const tasks = planTasks([
    layer(3, 300, { sib: 1, sig: 'SPAN.chip', left: 120 }),
    layer(2, 300, { sib: 1, sig: 'SPAN.chip', left: 0 }),
    layer(4, 340, { sib: 1, sig: 'SPAN.chip' }),
    layer(5, 300, { sib: 2, sig: 'SPAN.chip' }), // same look, other parent: its own master
    layer(6, 10, { box: false, sig: 'P.' }),
    layer(7, 20, { box: false, sig: 'P.' }),
  ]);
  const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  assert.deepEqual(tasks.map((t) => t.id), [6, 7, 2, 5, 3, 4], 'top to bottom, then left to right');
  assert.equal(byId[2].kind, 'box');
  assert.deepEqual([byId[3].kind, byId[3].master], ['dup', 2]);
  assert.deepEqual([byId[4].kind, byId[4].master], ['dup', 2]);
  assert.equal(byId[5].kind, 'box');
  assert.equal(byId[6].kind, 'text');
  assert.equal(byId[7].master, null);
});

test('a task waits for its parent, its master and the screen', () => {
  const [parent, child] = planTasks([layer(1, 0), layer(2, 50, { parent: 1, box: false })]);
  const done = new Set();
  const claimed = new Set();
  assert.equal(isReady(child, done, claimed, 800), false, 'parent not built');
  done.add(parent.id);
  assert.equal(isReady(child, done, claimed, 800), true);
  claimed.add(child.id);
  assert.equal(isReady(child, done, claimed, 800), false, 'someone is on it');

  const far = planTasks([layer(9, 2000)])[0];
  assert.equal(isReady(far, new Set(), new Set(), 800), false, 'far below the screen');
  assert.equal(isReady(far, new Set(), new Set(), 2000 - LOOKAHEAD), true, 'just below opens early');

  const [, copy] = planTasks([layer(1, 0, { sig: 'A.btn' }), layer(2, 0, { sig: 'A.btn', left: 200 })]);
  assert.equal(isReady(copy, new Set(), new Set(), 800), false, 'master not built');
  assert.equal(isReady(copy, new Set([1]), new Set(), 800), true);
});

test('an idle cursor takes the highest ready task, nearer ones winning a close race', () => {
  const tasks = planTasks([layer(1, 100, { left: 0 }), layer(2, 110, { left: 900, sig: 'X.' }), layer(3, 600)]);
  const pick = (from) => pickTask(tasks, { done: new Set(), claimed: new Set(), viewBottom: 800, from }).id;
  assert.equal(pick({ x: 0, y: 100 }), 1);
  assert.equal(pick({ x: 900, y: 110 }), 2, 'a few pixels lower but right next to it');
  assert.equal(pickTask(tasks, { done: new Set([1, 2, 3]), claimed: new Set(), viewBottom: 800, from: { x: 0, y: 0 } }), null);
});

test('building a task at once builds what it stands on first', () => {
  const tasks = planTasks([
    layer(1, 0),
    layer(2, 10, { parent: 1, sig: 'A.btn', sib: 5 }),
    layer(3, 10, { parent: 1, sig: 'A.btn', sib: 5, left: 200 }),
    layer(4, 20, { parent: 3, box: false }),
  ]);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  assert.deepEqual(chainOf(4, byId), [1, 2, 3, 4]);
  assert.deepEqual(chainOf(1, byId), [1]);
});

test('typing is quick for a label and a paragraph still lands in under 3 seconds', () => {
  assert.ok(typingPace(5) * 5 >= 250, 'a label is not instant');
  assert.ok(typingPace(400) * 400 <= 2600, 'a paragraph does not drag');
  assert.equal(typingPace(100, 2), typingPace(100) / 2, '2× is twice as fast');
});

test('more cursors join when work piles up or the visitor scrolls fast, within limits', () => {
  assert.equal(agentTarget(0), MIN_AGENTS);
  assert.ok(agentTarget(12) > MIN_AGENTS);
  assert.ok(agentTarget(0, 2000) > MIN_AGENTS);
  assert.equal(agentTarget(500, 9000), MAX_AGENTS);
});

test('the ⌥-drag measurement is the gap along the axis the copy moved, hidden while they overlap', () => {
  const master = { left: 0, top: 0, width: 100, height: 40 };
  assert.equal(gapLabel(master, { left: 116, top: 0, width: 80, height: 40 }), '16', 'beside it');
  assert.equal(gapLabel(master, { left: 0, top: 64.4, width: 100, height: 40 }), '24', 'below it');
  assert.equal(gapLabel(master, { left: 40, top: 10, width: 100, height: 40 }), '', 'still overlapping');
});

test('a cursor hop is quick and a trip across the page is capped', () => {
  assert.equal(travelMs(0), 240);
  assert.ok(travelMs(300) > travelMs(100));
  assert.equal(travelMs(5000), 900);
});

test('the page waits blank only when the swarm will run, and never for reduced motion', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /prefers-reduced-motion: reduce/);
  assert.match(head, /classList\.add\('swarm-pending'\)/);
  assert.match(head, /setTimeout\(function\(\)\{d\.classList\.remove\('swarm-pending'\)\}/, 'no fallback if the script fails');
});

test('the sphere has one node per cursor, joined into a closed web of triangles', () => {
  const { vertices, edges } = SPHERE;
  assert.equal(vertices.length, MAX_AGENTS, 'a node for every cursor the swarm can have');
  assert.equal(edges.length, 3 * vertices.length - 6, 'a full triangulation of the sphere (Euler)');
  for (const v of vertices) {
    assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  }
  const degree = new Array(vertices.length).fill(0);
  edges.forEach(([a, b]) => { degree[a]++; degree[b]++; });
  assert.ok(Math.min(...degree) >= 3, 'every node is linked to at least three neighbours');
  const lengths = edges.map(([a, b]) => Math.hypot(...vertices[a].map((c, k) => c - vertices[b][k])));
  assert.ok(Math.max(...lengths) / Math.min(...lengths) < 2, 'struts are roughly even');
  assert.equal(nodeSphere(26).vertices.length, 26, 'it grows with the crew');
});

test('idle cursors ride distinct nodes of a turning globe, passing round the back', () => {
  const r = 100;
  const nodes = Array.from({ length: MAX_AGENTS }, (_, i) => sphereNode(i));
  assert.equal(new Set(nodes).size, MAX_AGENTS, 'a full crew fills every node, none shared');
  for (const clock of [0, 2500, 9999]) {
    const p = spherePoint(3, clock, r);
    assert.ok(Math.abs(Math.hypot(p.x / r, p.y / r, p.z) - 1) < 1e-9, 'turning keeps it on the sphere');
  }
  const zs = Array.from({ length: 40 }, (_, k) => spherePoint(0, k * 350, r).z);
  assert.ok(Math.min(...zs) < 0 && Math.max(...zs) > 0, 'a turn takes it behind and in front');
  const a = projectSphere([0, -1, 0], sphereSpin(0), r); // screen y points down: -1 is the top pole
  assert.ok(a.y < 0 && a.z > 0, 'the globe tips its top toward the viewer');
});

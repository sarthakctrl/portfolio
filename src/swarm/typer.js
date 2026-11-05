/*
 * Typing a layer's text in place. The untyped rest stays in the page as transparent "ghost" text, so every
 * line already sits where it will end up and nothing below it moves while a cursor types.
 */

/** What never counts as visible text, here or in the engine's choice of layers. */
export const HIDDEN = '.visually-hidden, .skip, [hidden]';

/** The text nodes a layer types itself: visible, not blank, and not inside another layer. */
export function ownText(el, layers) {
  const nodes = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.data.trim() || node.parentElement.closest(HIDDEN)) {
      continue;
    }
    let owner = node.parentElement;
    while (owner && owner !== el && !layers.has(owner)) {
      owner = owner.parentElement;
    }
    if (owner === el) {
      nodes.push(node);
    }
  }
  return nodes;
}

/**
 * Readies el's own text for typing, all of it hidden. set(n) shows the first n characters with the caret
 * after them; finish() puts the original text nodes back. Null when el has no text of its own.
 * onFinish(typer) runs once, however it finishes (typed out, or the build was skipped).
 */
export function createTyper(el, layers, onFinish = () => {}) {
  const nodes = ownText(el, layers);
  if (nodes.length === 0) {
    return null;
  }
  const parts = nodes.map((node) => {
    let wrap = null;
    if (/flex|grid/.test(getComputedStyle(node.parentElement).display)) {
      // A bare text node in a flex box is one item; keep it one so the gap does not open up.
      wrap = document.createElement('span');
      wrap.className = 'sw-wrap';
      node.replaceWith(wrap);
      wrap.append(node);
    }
    const full = node.data;
    const ghost = document.createElement('span');
    ghost.className = 'sw-ghost';
    ghost.textContent = full;
    node.data = '';
    node.after(ghost);
    return { node, full, ghost, wrap, shown: 0 };
  });
  const caret = document.createElement('span');
  caret.className = 'sw-caret';
  const total = parts.reduce((n, p) => n + p.full.length, 0);
  el.classList.add('sw-typing');
  let finished = false;

  const typer = {
    total,
    caret,
    set(n) {
      let left = Math.max(0, Math.min(total, n));
      let at = parts.at(-1);
      for (const part of parts) {
        const k = Math.min(left, part.full.length);
        left -= k;
        // Only the part or two where typing is touch the page; the rest are already right.
        if (k !== part.shown) {
          part.shown = k;
          part.node.data = part.full.slice(0, k);
          part.ghost.textContent = part.full.slice(k);
        }
        if (k < part.full.length && at === parts.at(-1)) {
          at = part;
        }
      }
      if (caret.previousSibling !== at.node) {
        at.node.after(caret);
      }
    },
    finish() {
      if (finished) {
        return;
      }
      finished = true;
      for (const part of parts) {
        part.node.data = part.full;
        part.ghost.remove();
        if (part.wrap) {
          part.wrap.replaceWith(part.node);
        }
      }
      caret.remove();
      el.classList.remove('sw-typing');
      onFinish(typer);
    },
  };
  typer.set(0);
  return typer;
}

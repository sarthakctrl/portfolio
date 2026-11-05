/*
 * Figma-style rulers along the top and left of the screen, a band on each where the latest box is being
 * drawn, and the red guide one cursor drags off the left ruler at the start of the build.
 */
const STEP = 100;

export function createRulers(root) {
  const top = root.querySelector('.sw-ruler-top');
  const left = root.querySelector('.sw-ruler-left');
  const topBand = top.querySelector('.sw-band');
  const leftBand = left.querySelector('.sw-band');
  const guide = root.querySelector('.sw-guide');
  const guideBadge = guide.querySelector('.sw-badge');
  const topLabels = [];
  const leftLabels = [];
  let focus = null;
  let guideAt = null;

  const label = (parent, list, i) => {
    if (!list[i]) {
      list[i] = document.createElement('b');
      parent.append(list[i]);
    }
    return list[i];
  };

  function numbers(parent, list, scroll, size, place) {
    const first = Math.floor(scroll / STEP) * STEP;
    for (let i = 0; i * STEP <= size + STEP; i++) {
      const b = label(parent, list, i);
      const v = first + i * STEP;
      b.textContent = v;
      b.style.transform = place(v - scroll + 3);
    }
  }

  return {
    /** The mark whose box the bands follow. */
    focus(mark) {
      focus = mark;
    },
    /** Pins the guide to at() (screen x), or removes it with null. */
    guide(at) {
      guideAt = at;
    },
    /** Redraws for the current scroll; dragX is where the guide is while it is still being dragged. */
    draw(dragX = null) {
      numbers(top, topLabels, scrollX, innerWidth, (v) => `translateX(${v}px)`);
      numbers(left, leftLabels, scrollY, innerHeight, (v) => `translateY(${v}px) rotate(-90deg)`);
      const live = focus && focus.el.isConnected;
      topBand.hidden = leftBand.hidden = !live;
      if (live) {
        const r = focus.rect();
        topBand.style.transform = `translateX(${r.left - scrollX}px)`;
        topBand.style.width = `${Math.max(0, r.width)}px`;
        leftBand.style.transform = `translateY(${r.top - scrollY}px)`;
        leftBand.style.height = `${Math.max(0, r.height)}px`;
      }
      const x = guideAt ? guideAt() : dragX;
      guide.hidden = x === null;
      if (x !== null) {
        guide.style.transform = `translateX(${x}px)`;
        guideBadge.textContent = Math.round(x + scrollX);
      }
    },
  };
}

/*
 * The swarm's cursors: who they are (a crew from the Spider-Verse, each in their own colour) and the
 * pointer shapes they switch between while they work, drawn with an ink outline to match the page.
 */

export const CREW = [
  ['Miles', '#c8202a'], ['Gwen', '#e8467c'], ['Peter', '#1f4a9a'], ['MJ', '#ff8a00'],
  ['Ned', '#14ae5c'], ['May', '#9747ff'], ['Hobie', '#00b5ce'], ['Pavitr', '#e8b33a'],
  ['Jess', '#f24e1e'], ['Miguel', '#0a84ff'], ['Peni', '#ff5fa2'], ['Ham', '#7a5af8'],
  ['Noir', '#3a3d47'], ['Ben', '#0acf83'], ['Cindy', '#d4a017'], ['Anya', '#b5179e'],
  ['Kaine', '#5c6bc0'], ['Julia', '#ef6c00'],
];

const ARROW = 'M4 2.5 V19.2 L8.7 15 L11.7 21.6 L14.6 20.3 L11.7 13.8 L17.9 13.5 Z';
const OUTLINE = 'stroke="#fff" stroke-width="1.6" stroke-linejoin="round"';

/** The SVG for one pointer shape in colour c: arrow, cross (drawing a box), ibeam (typing), dup (⌥-drag). */
export function cursorSvg(shape, c) {
  let body = '';
  switch (shape) {
    case 'cross':
      body = `<g stroke-linecap="round"><path d="M12 3 V21 M3 12 H21" stroke="#fff" stroke-width="4"/>`
        + `<path d="M12 3 V21 M3 12 H21" stroke="${c}" stroke-width="1.8"/></g>`;
      break;
    case 'ibeam': {
      const d = 'M8.5 4 H11 Q12 4 12 5.5 Q12 4 13 4 H15.5 M12 5.5 V18.5 M8.5 20 H11 Q12 20 12 18.5 Q12 20 13 20 H15.5';
      body = `<g fill="none" stroke-linecap="round"><path d="${d}" stroke="#fff" stroke-width="4"/>`
        + `<path d="${d}" stroke="${c}" stroke-width="1.8"/></g>`;
      break;
    }
    case 'dup':
      body = `<path d="${ARROW}" transform="translate(4.5 4)" fill="#fff" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"/>`
        + `<path d="${ARROW}" fill="${c}" ${OUTLINE}/>`;
      break;
    default:
      body = `<path d="${ARROW}" fill="${c}" ${OUTLINE}/>`;
  }
  return `<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">${body}</svg>`;
}

/** Where the shape's hot spot sits inside its 26px box, so the tip (or the cross's centre) lands on the point. */
export const HOTSPOT = { arrow: [4, 2.5], dup: [4, 2.5], cross: [12, 12], ibeam: [12, 12] };

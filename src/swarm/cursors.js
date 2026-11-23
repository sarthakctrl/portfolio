/*
 * The swarm's cursors: who they are (Tony Stark's AIs, with suits from the House Party Protocol that
 * JARVIS flies filling out the crew) and how they are drawn: glowing nodes of the sphere, all in its
 * blue, or mouse pointers in their own colours, switching shape while they work.
 */

/**
 * How the crew is drawn: 'node' draws each one as a glowing node of the holographic sphere; 'arrow'
 * draws classic mouse pointers (arrow, crosshair, I-beam). Change this one word to switch back.
 */
export const CURSOR_STYLE = 'node';

/** The sphere's hologram blue: every node, and its name tag, while CURSOR_STYLE is 'node'. */
export const NODE_BLUE = '#28beff';

/** Name and own colour (used by the 'arrow' style). */
const PALETTE = [
  // Stark's AIs. JARVIS comes first, so he is the one who pulls the red guide off the ruler.
  ['JARVIS', '#0a84ff'], ['FRIDAY', '#c8202a'], ['EDITH', '#e8b33a'], ['Karen', '#e8467c'],
  ['Ultron', '#3a3d47'], ['Vision', '#14ae5c'], ['Dum-E', '#ff8a00'], ['U', '#00b5ce'],
  ['Butterfingers', '#9747ff'], ['HOMER', '#1f4a9a'], ['Jocasta', '#b5179e'], ['Veronica', '#f24e1e'],
  // House Party Protocol suits, flown by JARVIS.
  ['Igor', '#7a5af8'], ['Gemini', '#0acf83'], ['Heartbreaker', '#ff5fa2'], ['Hammerhead', '#5c6bc0'],
  ['Striker', '#d4a017'], ['Python', '#ef6c00'],
];

/** The crew as drawn: in the node style all of them share the sphere's blue. */
export const CREW = PALETTE.map(([name, color]) => [name, CURSOR_STYLE === 'node' ? NODE_BLUE : color]);

const ARROW = 'M4 2.5 V19.2 L8.7 15 L11.7 21.6 L14.6 20.3 L11.7 13.8 L17.9 13.5 Z';
const OUTLINE = 'stroke="#fff" stroke-width="1.6" stroke-linejoin="round"';

/** The SVG for one pointer shape in colour c: arrow, cross (drawing a box), ibeam (typing), dup (⌥-drag). */
export function cursorSvg(shape, c) {
  if (CURSOR_STYLE === 'node') {
    return nodeSvg(shape, c);
  }
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

/**
 * A glowing sphere node in colour c: a soft halo, a coloured core and a white-hot centre. What it is
 * doing still shows: a dashed ring while it draws a box, a bright ring while it types, a second, offset
 * node while it ⌥-drags a copy.
 */
function nodeSvg(shape, c) {
  let extra = '';
  if (shape === 'cross') {
    extra = `<circle cx="13" cy="13" r="11.2" fill="none" stroke="${c}" stroke-width="1.4" stroke-dasharray="3 2.4"/>`;
  } else if (shape === 'ibeam') {
    extra = '<circle cx="13" cy="13" r="10.4" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.85"/>';
  } else if (shape === 'dup') {
    extra = `<circle cx="19.5" cy="19.5" r="3.6" fill="#fff" stroke="${c}" stroke-width="1.4"/>`;
  }
  const body = `<circle cx="13" cy="13" r="11" fill="${c}" opacity="0.22"/>`
    + `<circle cx="13" cy="13" r="7.5" fill="${c}" opacity="0.45"/>`
    + `<circle cx="13" cy="13" r="5" fill="${c}" stroke="#fff" stroke-width="1.5"/>`
    + '<circle cx="13" cy="13" r="1.9" fill="#fff"/>';
  return `<svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">${body}${extra}</svg>`;
}

/** Where the shape's hot spot sits inside its 26px box, so the tip (or the cross's centre) lands on the point. */
export const HOTSPOT = CURSOR_STYLE === 'node'
  ? { arrow: [13, 13], dup: [13, 13], cross: [13, 13], ibeam: [13, 13] }
  : { arrow: [4, 2.5], dup: [4, 2.5], cross: [12, 12], ibeam: [12, 12] };

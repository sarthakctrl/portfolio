/*
 * The swarm's sound, synthesised with Web Audio (no files): a keyboard click per typed character, a
 * mouse click per press, and a short glassy note when a box lands, higher for small things and panned
 * to where it happened. Off until the visitor turns it on; browsers only allow audio after a click.
 */
const PENTATONIC = [329.63, 369.99, 415.3, 493.88, 554.37, 659.25, 739.99, 830.61, 987.77];

export function createSound() {
  let ctx = null;
  let master = null;
  let on = false;
  let lastKey = 0;

  function ready() {
    if (!on) {
      return false;
    }
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return false;
      }
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx.state === 'running';
  }

  /** A short burst of filtered noise: the click of a key or a mouse button. */
  function click(pan = 0, pitch = 3200, level = 0.18) {
    if (!ready()) {
      return;
    }
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * 0.03);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = pitch;
    band.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = level;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(band).connect(gain).connect(panner).connect(master);
    src.start(t);
  }

  /** A soft glass note: size 0..1 picks low (big) to high (small). */
  function note(pan = 0, size = 0.5) {
    if (!ready()) {
      return;
    }
    const t = ctx.currentTime;
    const at = Math.round((1 - Math.max(0, Math.min(1, size))) * (PENTATONIC.length - 1));
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = PENTATONIC[at];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.07, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    osc.connect(gain).connect(panner).connect(master);
    osc.start(t);
    osc.stop(t + 1);
  }

  return {
    get on() {
      return on;
    },
    set on(value) {
      on = value;
      if (on) {
        ready();
      }
    },
    key(pan) {
      const now = performance.now();
      if (now - lastKey > 28) {
        lastKey = now;
        click(pan, 2600 + Math.random() * 1400, 0.12);
      }
    },
    press: (pan) => click(pan, 1800, 0.22),
    note,
  };
}

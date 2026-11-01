/*
 * The résumé terminal. runCommand() turns one typed line into output lines, answering from the résumé
 * or acting on Spidey through the same actions as his menu; initTerminal() wires it to the page.
 */
export const HERO_ALIASES = {
  iron: 'Iron Spider - Web Swing',
  comic: 'Comic Spidey - Web Swing',
  animated: 'Animated Spidey - Web Swing',
  iconic: 'Iconic Spidey - Web Swing',
  upside: 'Iconic Spidey - Upside Down',
  both: 'Iconic Spidey - Both',
  drawn: 'Drawn Spider-Man',
};

export const HELP = [
  'résumé: whoami · skills · curl /api/experience · projects · education · achievements · contact',
  'spidey: fact · facts on|off · swing · reset · say <text> · hero <iron|comic|animated|iconic|upside|both|drawn|next>',
  '        breeze · autoswing · down · up · clear',
];

/**
 * Output for one line: { lines: [text], dim?: true, clear?: true }.
 * ctx: { resume, actions, settings, showcase }.
 */
export function runCommand(input, { resume, actions, settings, showcase }) {
  const line = input.trim().replace(/\s+/g, ' ');
  const lower = line.toLowerCase();
  const say = (...lines) => ({ lines });

  if (lower === '') {
    return { lines: [] };
  }
  if (lower === 'clear') {
    return { lines: [], clear: true };
  }
  if (lower.startsWith('say ')) {
    actions.say(line.slice(4));
    return say('Spidey says it.');
  }
  if (lower === 'hero' || lower.startsWith('hero ')) {
    const pick = lower.slice(5).trim();
    if (pick === 'next') {
      actions.nextHero();
      return say(`Hero: ${settings.get('Hero')}`);
    }
    if (!HERO_ALIASES[pick]) {
      return { lines: ['hero iron | comic | animated | iconic | upside | both | drawn | next'], dim: true };
    }
    actions.setHero(HERO_ALIASES[pick]);
    return say(`Hero: ${HERO_ALIASES[pick]}`);
  }

  switch (lower) {
    case 'help':
      return say(...HELP);
    case 'whoami':
      return say(`${resume.name} — ${resume.title} — ${resume.contact.location}`);
    case 'skills':
      return say(...resume.skills.map((g) => `${g.group}: ${g.items.join(', ')}`));
    case 'curl /api/experience':
    case 'experience':
      return say(JSON.stringify(resume.experience.map((j) => ({ role: j.title, company: j.company, dates: j.dates })), null, 2));
    case 'projects':
      return say(...resume.projects.map((p) => `${p.name} — ${p.about}`));
    case 'education':
      return say(...resume.education.map((e) => `${e.degree} — ${e.school} (${e.dates})`), ...resume.certifications);
    case 'achievements':
      return say(...resume.achievements);
    case 'contact':
      return say(`${resume.contact.email} | ${resume.contact.phone}`, resume.contact.github);
    case 'fact':
      showcase.now();
      return say('Spidey tells you something about Sarthak.');
    case 'facts off':
      showcase.stop();
      return say('Showcase off. He stays quiet.');
    case 'facts on':
      showcase.resume();
      return say('Showcase on: a fact every 2 minutes.');
    case 'swing':
      actions.swing(1.4);
      return say('Spidey: *swings*');
    case 'reset':
      actions.reset();
      return say('Back to still.');
    case 'breeze':
      actions.setFlags({ Breeze: !settings.get('Breeze') });
      return say(`Breeze ${settings.get('Breeze') ? 'on' : 'off'}.`);
    case 'autoswing':
      actions.setFlags({ AutoSwing: !settings.get('AutoSwing') });
      return say(`Swing on his own ${settings.get('AutoSwing') ? 'on' : 'off'}.`);
    case 'down':
      actions.takeDown();
      return say('Taken down. Type "up" to hang him back up.');
    case 'up':
      actions.hangUp();
      return say('Hanging again.');
    default:
      return { lines: [`command not found: ${line} (try "help")`], dim: true };
  }
}

export function initTerminal(ctx) {
  const out = document.querySelector('[data-term-out]');
  const form = document.querySelector('[data-term-form]');
  const input = document.querySelector('[data-term-input]');
  const chips = document.querySelector('[data-term-chips]');
  if (!out || !form || !input) {
    return;
  }
  const history = [];
  let historyAt = 0;

  const print = (text, cls = '') => {
    const div = document.createElement('div');
    if (cls) {
      div.className = cls;
    }
    div.textContent = text;
    out.append(div);
    out.scrollTop = out.scrollHeight;
  };

  const run = (line) => {
    if (!line.trim()) {
      return;
    }
    history.push(line);
    historyAt = history.length;
    print(`$ ${line}`, 't-cmd');
    const result = runCommand(line, ctx);
    if (result.clear) {
      out.textContent = '';
      return;
    }
    result.lines.forEach((text) => print(text, result.dim ? 't-dim' : ''));
  };

  print('Portfolio shell. Type "help".', 't-dim');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && historyAt > 0) {
      input.value = history[--historyAt];
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      historyAt = Math.min(history.length, historyAt + 1);
      input.value = history[historyAt] || '';
      e.preventDefault();
    }
  });
  chips?.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) {
      run(button.textContent);
    }
  });
}

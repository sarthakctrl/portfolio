/*
 * The résumé as HTML. vite.config.js puts each piece into index.html at build time (wherever the page
 * says <!-- render:name -->), so the published page is plain HTML: readable without JavaScript and
 * by search engines. Pure functions of src/data/resume.js, so the tests can render the page in Node.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);

const hostOf = (url) => new URL(url).host;
const link = (url) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(hostOf(url))}</a>`;
const chips = (items, primary = []) =>
  items.map((item) => `<span class="chip${primary.includes(item) ? ' primary' : ''}">${esc(item)}</span>`).join('');

export function contactLine({ contact }) {
  return [contact.email, contact.phone, contact.location].map(esc).join(' | ');
}

export function lede({ summary }) {
  return esc(summary[1]);
}

export function summary({ summary: lines }) {
  return esc(lines.join(' '));
}

export function facts({ facts: list }) {
  return list.map((f) => `<div><b>${esc(f.big)}</b><span>${esc(f.small)}</span></div>`).join('\n');
}

export function skills({ skills: groups }) {
  return groups
    .map((g) => `<div class="panel${g.wide ? ' wide' : ''}"><h3>${esc(g.group)}</h3>${chips(g.items, g.primary)}</div>`)
    .join('\n');
}

export function experience({ experience: jobs }) {
  return jobs
    .map((job) => `<article class="panel job${job.current ? ' now' : ''}">
  <div class="when"><b>${esc(job.tag)}</b>${esc(job.dates)}</div>
  <div class="what">
    <h3>${esc(job.title)} — ${esc(job.company)}</h3>${job.stack ? `<p class="role">${esc(job.stack)}</p>` : ''}
    <ul>${job.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
  </div>
</article>`)
    .join('\n');
}

export function projects({ projects: list }) {
  return list
    .map((p) => {
      const result = p.links ? p.links.map(link).join(' · ') : p.tags.map(esc).join(' · ');
      return `<article class="panel proj">
  <div class="req"><b>GET</b>/projects/${esc(p.slug)}</div>
  <div class="body"><h3>${esc(p.name)}</h3><p>${esc(p.about)}</p></div>
  <div class="res"><span class="ok">200 OK</span> · ${result}</div>
</article>`;
    })
    .join('\n');
}

export function education({ education: list }) {
  return list
    .map((e) => `<li><b>${esc(e.degree)}</b> — ${esc(e.school)}<br><small>${esc(e.dates)}${e.place ? ` · ${esc(e.place)}` : ''}</small></li>`)
    .join('\n');
}

export function certifications({ certifications: list }) {
  return list.map((c) => `<li>${esc(c)}</li>`).join('\n');
}

export function achievements({ achievements: list }) {
  return list.map((a) => `<li>${esc(a)}</li>`).join('\n');
}

export function contactButtons({ contact }) {
  return [
    `<a class="btn btn-gold" href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>`,
    `<a class="btn btn-paper" href="tel:${esc(contact.phone.replace(/\s/g, ''))}">${esc(contact.phone)}</a>`,
    `<a class="btn btn-paper" href="${esc(contact.github)}" target="_blank" rel="noopener">GitHub</a>`,
  ].join('\n');
}

export const PIECES = {
  contactLine, lede, summary, facts, skills, experience, projects, education, certifications, achievements, contactButtons,
};

/** index.html with every <!-- render:name --> filled in. Unknown names are an error, not a silent gap. */
export function renderPage(html, data) {
  return html.replace(/<!--\s*render:(\w+)\s*-->/g, (_, name) => {
    if (!PIECES[name]) {
      throw new Error(`index.html asks for <!-- render:${name} -->, which src/render.js does not have`);
    }
    return PIECES[name](data);
  });
}

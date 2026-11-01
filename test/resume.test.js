/*
 * The site must say what the résumé says. test/fixtures/resume.txt is the text of
 * public/Sarthak_Sharma_Backend_Developer.pdf; every piece of every line has to appear on the built page.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resume } from '../src/data/resume.js';
import { renderPage } from '../src/render.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const normalize = (text) => text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

/** The page's visible text, after the build fills in the résumé. */
function pageText() {
  const html = renderPage(read('../index.html'), resume)
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head>[\s\S]*?<\/head>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[#\w]+;/g, (e) => ENTITIES[e] ?? e);
  return normalize(html);
}

const DATES = /\s*((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} – (Present|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})|\d{4} – \d{4})$/;

/** Each line of the résumé cut at its separators (bullets, ·, |, —, labels, list commas), dates split off. */
function resumePieces() {
  const pieces = [];
  for (const line of read('./fixtures/resume.txt').split('\n')) {
    // A link follows its project's sentence on the same line ("… modules. stagingfe.…"); split there too.
    for (let piece of line.split(/•|\s·\s?|\s\|\s|\s—\s|:\s|,\s(?=[A-Z0-9.])|(?<=\.)\s(?=[a-z]+\.[a-z])/)) {
      piece = piece.trim();
      const date = piece.match(DATES);
      if (date) {
        pieces.push(date[1]);
        piece = piece.slice(0, date.index).trim();
      }
      if (piece.replace(/[^\w]/g, '').length > 1) {
        pieces.push(piece);
      }
    }
  }
  return pieces;
}

test('every line of the résumé is on the page', () => {
  const page = pageText();
  const pieces = resumePieces();
  const missing = pieces.filter((p) => !page.includes(normalize(p)));
  assert.ok(pieces.length > 80, `expected the whole résumé, got ${pieces.length} pieces`);
  assert.deepEqual(missing, [], 'résumé text missing from the page');
});

test('the page has every section of the résumé, filled', () => {
  const html = renderPage(read('../index.html'), resume);
  assert.doesNotMatch(html, /render:/, 'a render slot was left empty');
  for (const id of ['about', 'skills', 'experience', 'projects', 'education', 'contact']) {
    assert.match(html, new RegExp(`id="${id}"`), `no #${id} section`);
  }
  assert.equal((html.match(/class="panel job/g) || []).length, resume.experience.length);
  assert.equal((html.match(/class="panel proj"/g) || []).length, resume.projects.length);
});

test('the résumé PDF the button downloads is in the site', () => {
  const html = read('../index.html');
  assert.match(html, /href="Sarthak_Sharma_Backend_Developer\.pdf" download/);
  assert.ok(readFileSync(new URL('../public/Sarthak_Sharma_Backend_Developer.pdf', import.meta.url)).subarray(0, 4).toString() === '%PDF');
});

# Sarthak Sharma · Portfolio

**Live: https://sarthakctrl.github.io/portfolio/**

My portfolio as a Backend Developer: Java (Java 8, Spring Boot) and .NET, REST APIs, database design,
JWT-based authentication and authorization, and debugging live production systems.

Iron Spidy hangs off the top of the page. He is the real Spidey from
[spidey-hang-site](https://github.com/sarthakctrl/spidey-hang-site): the same physics, drawing, menu and
speech bubble. Drag him, fling him, brush past him, drag his web knot, or right-click him for his menu.
He shows visitors around: a line as each section scrolls in, and every 2 minutes a fact from my résumé
(experience, skills, achievements, in turn).

## Run it

Needs Node.js 22.12 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # the page matches the résumé; showcase, terminal, rendering
npm run build      # the static site, in dist/
npm run preview    # serve dist/
```

## How it fits together

```
index.html                  the page, with <!-- render:name --> slots for the résumé
src/
  data/resume.js            everything the site says, word for word from the résumé PDF
  render.js                 résumé → HTML; vite.config.js fills the slots at build time
  main.js                   entry: Iron Spidy, his menu, theme, guide, showcase, terminal
  sections/guide.js         a line from Spidey as each section first scrolls in
  sections/showcase.js      a résumé fact every 2 minutes, never over another bubble
  sections/terminal.js      the résumé terminal (whoami, skills, fact, swing, hero …)
  overlay/                  the hanging Spidey, his menu and settings, from spidey-hang-site
  assets/heroes/            the hero pictures (Iron Spider is the default)
  styles/site.css           the comic-zine look
vendor/spidey/              Spidey Hang's physics, drawing and bubble code
public/                     favicon and the résumé PDF the Download Resume button serves
test/                       node --test; fixtures/resume.txt is the PDF's text
```

## Updating the résumé

Replace `public/Sarthak_Sharma_Backend_Developer.pdf`, put its text in `test/fixtures/resume.txt`, and
update `src/data/resume.js` to match. `npm test` fails until every line of the résumé is on the page.

## Publishing

`.github/workflows/pages.yml` tests, builds and deploys to GitHub Pages on every push to `main`
(**Settings › Pages › Source: GitHub Actions**).

## Credits

Spidey's code and the hero pictures come from Spidey Hang (MIT, see `vendor/spidey/LICENSE`).
Spider-Man is a trademark of Marvel; this is a personal, non-commercial site.

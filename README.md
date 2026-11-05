# Sarthak Sharma · Portfolio

**Live: https://sarthakctrl.github.io/portfolio/**

My portfolio as a Backend Developer: Java (Java 8, Spring Boot) and .NET, REST APIs, database design,
JWT-based authentication and authorization, and debugging live production systems.

The page builds itself: when it opens, a swarm of multiplayer cursors (Miles, Gwen, Peter and the rest of
the crew) rebuilds it in front of you as you scroll. They drag out boxes with a live W × H badge, type
every line, ⌥-drag copies of cards and chips, and pull a red guide off the rulers. **Tour** scrolls at their
pace, **1× / 2× / 3×** sets the speed, **Sound** turns on synthesised clicks, and **Skip** (or Esc) shows the
finished page. Visitors who skip get the finished page next time, with a **Rebuild** button; reduced
motion and `?noswarm` skip it too. The text is in the page all along (only faded), so it stays readable
to screen readers and search, and focusing something builds it at once.

When the last layer lands, Iron Spidy drops in. He hangs off the top of the page. He is the real Spidey from
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
  main.js                   entry: the swarm, then Iron Spidy, his menu, theme, guide, showcase, terminal
  swarm/plan.js             the build order, what waits for what, typing pace, how many cursors (no DOM)
  swarm/engine.js           measures the page into layers and moves the cursors: drag, type, ⌥-drag, guide;
                            any crash or stall shows the finished page instead
  swarm/typer.js            types a layer's text in place, without moving anything
  swarm/rulers.js           the rulers, the band where a box is drawn, the red guide
  swarm/toolbar.js          the bottom toolbar (Tour, speed, sound, skip, replay) and the Rebuild button
  swarm/cursors.js          the crew's names, colours and pointer shapes
  swarm/sound.js            Web Audio clicks and notes, off until turned on
  sections/guide.js         a line from Spidey as each section first scrolls in
  sections/showcase.js      a résumé fact every 2 minutes, never over another bubble
  sections/terminal.js      the résumé terminal (whoami, skills, fact, swing, hero …)
  overlay/                  the hanging Spidey, his menu and settings, from spidey-hang-site
  assets/heroes/            the hero pictures (Iron Spider is the default)
  styles/site.css           the comic-zine look
  styles/swarm.css          the swarm in the same comic colours
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
The swarm build is an original implementation of the idea from Joel Califa's
[Swarm](https://califa.github.io/swarm-site/) and Dhvanil Patel's
[Swarm Rebuild](https://github.com/DhvanilPatel/swarm-cursors); no code is copied from either.
Spider-Man is a trademark of Marvel; this is a personal, non-commercial site.

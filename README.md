# Brightwater Zoo

A first-person 3D walk through a (fictional) 1931 zoo: fifty exhibits, one path, one way round.
Scroll or swipe up to walk down the path. Turn left or right to face the cages. Tap an animal to read its card.
It gets dark very slowly. Then the gardens close, and you run.

## Controls
- **Walk:** mouse wheel, swipe up/down, ↑/↓ or W/S, or the ▲ button. The stroll carries on with a little momentum after you let go and settles gently in front of the next pair of cages.
- **Look around:** drag sideways to look freely; let go and you ease back. A quick swipe left/right (←/→, A/D, ◀ ▶) turns you to face a cage.
- **Play:** when you face a cage, buttons appear: **Feed** (the food is thrown in, the animal walks over and eats it), **Tap the glass** or **Rattle the bars** (knock and ripple, or clang and shaking bars; the animal startles and runs off), and **Call** or **Wave**. Late in the day the animals stop reacting the way they should.
- **Exhibit card:** tap or click the animal, or press Enter/Space. Esc closes it.
- **Runner:** swipe left/right to change lanes, up to jump, down to slide (arrow keys, WASD, Space). Run-only mode unlocks on the gate once you've finished the tour.

## What's in it
- 29 real animals with real natural history, 10 Spirit Grove residents with parody names (Pikachew, Catbust, Totoroar, Kuramuffin, Jiji-ish, Kyubey-gone, Ein-stein, Happy-ish, Luna-tic, Gon-zilla, all original low-poly art), 10 Quarantine Wing creatures from public folklore, and one final exhibit.
- Glimpses: as it gets dark, things dart across the far avenue, between the cages ahead, and past the edge of your view, more and more often.
- At the end, every cage on the last row stands open. Then everything that got out comes for you at once, and chases you down the runner.
- Every model, texture and sound is made in code: low-poly procedural meshes with three.js, canvas textures, Web Audio. No external requests.
- The original 2D version is at [`/classic/`](classic/).

## Build
`npm install && ./build.sh` bundles `src/` with esbuild into `app.js` and stamps a cache-busting version into `index.html` and `style.css`.

## Licences
- three.js, MIT (`vendor/three-LICENSE.txt`).
- Fonts: Bungee, Young Serif, Archivo, Reenie Beanie, Courier Prime, SIL OFL 1.1 (licences in `/fonts`).

Content note: horror imagery, one loud jump scare (a swarm of creatures, two brief flashes under three per second, then darkness), no strobe lights. Reduced-motion settings soften the scare.

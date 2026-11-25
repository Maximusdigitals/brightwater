# Brightwater Zoo

A first-person 3D walk through a (fictional) 1931 zoo: fifty exhibits, one path, one way round.
Scroll or swipe up to walk down the path. Turn left or right to face the cages. Tap an animal to read its card.
It gets dark very slowly. Then the gardens close, and you run.

## Controls
- **Walk:** mouse wheel, swipe up/down, ↑/↓ or W/S, or the ▲ button. A flick takes you to the next pair of cages.
- **Turn to a cage:** swipe left/right, ←/→ or A/D, or the ◀ ▶ buttons. Swiping left turns you to the left-hand cage.
- **Exhibit card:** tap or click the animal, or press Enter/Space. Esc closes it.
- **Runner:** swipe left/right to change lanes, up to jump, down to slide (arrow keys, WASD, Space). Run-only mode unlocks on the gate once you've finished the tour.

## What's in it
- 29 real animals with real natural history, 10 Spirit Grove residents with parody names (Pikachew, Catbust, Totoroar, Kuramuffin, Jiji-ish, Kyubey-gone, Ein-stein, Happy-ish, Luna-tic, Gon-zilla, all original low-poly art), 10 Quarantine Wing creatures from public folklore, and one final exhibit.
- Every model, texture and sound is made in code: low-poly procedural meshes with three.js, canvas textures, Web Audio. No external requests.
- The original 2D version is at [`/classic/`](classic/).

## Build
`npm install && ./build.sh` bundles `src/` with esbuild into `app.js` and stamps a cache-busting version into `index.html` and `style.css`.

## Licences
- three.js, MIT (`vendor/three-LICENSE.txt`).
- Fonts: Bungee, Young Serif, Archivo, Reenie Beanie, Courier Prime, SIL OFL 1.1 (licences in `/fonts`).

Content note: horror imagery, one loud jump scare (two brief flashes, under three per second), no strobe lights. Reduced-motion settings soften the scare.

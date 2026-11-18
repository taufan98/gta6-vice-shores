# Vice Shores

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/taufan98/gta6-vice-shores/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/taufan98/gta6-vice-shores/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Everything is
original: the city of Vice Shores, the wheelman Leo Vasquez, the fixer Rosa,
the vehicles, the story, the art, the sound and the music — no Rockstar name,
logo, character, map or asset.

## The game

Leo came back to Vice Shores for one last score. Rosa has five jobs for him,
and the Vice Shores PD has other plans.

- **A city to explore** — a 2600×2600 sun-soaked grid of streets, districts,
  a beach, a park, a port and a marina, on foot and by car.
- **Traffic and pedestrians** — cars that follow the roads, wait at
  intersections and slow for the car ahead; pedestrians who stroll, flee
  gunfire and scatter from speeding cars.
- **Stealing cars** — walk up to any parked car and take it, or jack a
  driver's ride and watch them run. Sports cars, taxis, trucks, vans.
- **A wanted system** — every crime raises your heat: one to five stars.
  Foot cops chase and grab you; patrol cars ram you at two stars and up.
  Get busted and the PD fines you; get wasted and the hospital bills you.
- **Five story missions** — steal a car for Rosa, run a package to the
  docks, lift a red sports car for the chop shop, crack the Shore Bank vault,
  then the big score: a getaway van to the yacht marina for $2,500.
- **Combat** — fists up close, a pistol with limited ammo, muzzle flashes,
  car explosions, and a health bar that matters.
- **HUD and minimap** — health, cash, weapon and ammo, wanted stars, the
  current objective, Rosa's subtitles, and a live minimap with the player,
  the mission marker, the cops and traffic.
- **Save** — progress saves after every job; continue from the title screen.
- **Sound** — synthesized engine hum, sirens, gunshots, crashes and a
  bassline, all made in code with the Web Audio API. No audio files.

## Play

Open `game/index.html` in a desktop browser (or `node serve.ts` and visit
http://localhost:8080). No network requests at runtime.

- **WASD / arrows** — move and drive, **Shift** run
- **E** — get in / out of a car
- **Mouse** — aim, **click** shoot, **F** punch
- **1 / 2** — fists / pistol, **R** reload
- **P / Esc** — pause, **S** on pause — save and quit to the title
- **M** — mute, **C** on the title — continue a saved game

## Structure

`game/src/` is split into one module per job, each named for what it does:

| Module | Job |
| --- | --- |
| `config.js` | World, player, car, police and crime constants |
| `random.js` | Seeded random (mulberry32) — one seed, one city |
| `city.js` | The road grid, buildings, park, docks, beach, collisions |
| `state.js` | The world state, spawning, heat, subtitles |
| `input.js` | Keyboard and mouse |
| `player.js` | On-foot movement, entering cars, punching, shooting |
| `vehicles.js` | Player car physics, traffic, crashes, explosions |
| `peds.js` | Pedestrian behaviour |
| `police.js` | Wanted level, foot cops, patrol cars, busted / wasted |
| `missions.js` | The five story jobs and their objectives |
| `particles.js` | Smoke, sparks, explosions, skid marks, floating text |
| `audio.js` | Synthesized sound effects and music |
| `render.js` | The camera and everything the eye sees |
| `hud.js` | The HUD, the minimap and the menu screens |
| `save.js` | The localStorage save |
| `shots.js` | The four staged screenshot scenes |
| `world.js` | One fixed step of the living city |
| `main.js` | Boot, the loop and the screens |

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
make.fun library.

---

Built with [make.fun](https://make.fun/bounty/gta6-01?ref=va8excfs)

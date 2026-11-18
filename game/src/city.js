// Vice Shores itself: a procedural sun-soaked coastal city. Roads on a grid, blocks with
// pastel buildings, a beach and water along the south edge, a park, docks and a strip.
// Everything is generated from a seed, so the same seed always gives the same city.

import { WORLD, PALETTE } from './config.js';
import { randomInt, randomPick, randomRange } from './random.js';

export const ROAD_LINES = [162, 487, 812, 1137, 1462, 1787, 2112, 2437];
const HALF = WORLD.roadHalf;

/** True when the point is on a road (asphalt), false on a block or beach. */
export function isRoad(x, y) {
  for (const line of ROAD_LINES) {
    if (Math.abs(x - line) <= HALF || Math.abs(y - line) <= HALF) return true;
  }
  return false;
}

/** Snap a point to the centre of the nearest road. */
export function snapToRoad(x, y) {
  let bestX = ROAD_LINES[0];
  let bestY = ROAD_LINES[0];
  for (const line of ROAD_LINES) {
    if (Math.abs(x - line) < Math.abs(x - bestX)) bestX = line;
    if (Math.abs(y - line) < Math.abs(y - bestY)) bestY = line;
  }
  return { x: bestX, y: bestY };
}

/** The nearest point on a road centre-line to (x, y). */
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const line of ROAD_LINES) {
    const d1 = Math.abs(x - line);
    if (d1 < bestD) { bestD = d1; best = { x: line, y }; }
    const d2 = Math.abs(y - line);
    if (d2 < bestD) { bestD = d2; best = { x, y: line }; }
  }
  return best;
}

function blockRect(bx, by) {
  return {
    x: ROAD_LINES[bx] + HALF + 6,
    y: ROAD_LINES[by] + HALF + 6,
    w: ROAD_LINES[bx + 1] - ROAD_LINES[bx] - 2 * HALF - 12,
    h: ROAD_LINES[by + 1] - ROAD_LINES[by] - 2 * HALF - 12,
  };
}

const HOUSE_COLORS = [PALETTE.building, PALETTE.building2, PALETTE.building3, PALETTE.building4, PALETTE.building5];

export function buildCity(random) {
  const buildings = [];
  const trees = [];
  const containers = [];
  const boats = [];

  function addBuilding(x, y, w, h, kind, name, color, floors) {
    buildings.push({ x, y, w, h, kind, name: name || '', color: color || randomPick(random, HOUSE_COLORS), floors: floors || 1 });
  }

  // One block = one or two buildings, except the special blocks below.
  for (let bx = 0; bx < 7; bx += 1) {
    for (let by = 0; by < 7; by += 1) {
      const block = blockRect(bx, by);
      const downtown = bx >= 2 && bx <= 4 && by >= 2 && by <= 4;
      if (bx === 0 && by === 0) continue; // Palm Park
      if (bx >= 6 && by >= 5) continue; // Docks (containers instead)
      if (bx === 3 && by === 3) {
        // Shore Bank, the big gold building downtown.
        addBuilding(block.x + 40, block.y + 30, 130, 95, 'bank', 'Shore Bank', '#d9b36c', 3);
        addBuilding(block.x + 20, block.y + 150, 80, 60, 'shop', '', '#8fa8c8', 2);
        continue;
      }
      if (bx === 1 && by === 2) {
        // Rosa's Garage.
        addBuilding(block.x + 30, block.y + 40, 150, 95, 'garage', "Rosa's Garage", '#c98f6e', 1);
        continue;
      }
      if (bx === 0 && by === 3) {
        // Casino Solmar on the Strip, plaza left clear to the south.
        addBuilding(block.x + 10, block.y + 8, 140, 92, 'casino', 'Casino Solmar', '#a87fa8', 2);
        addBuilding(block.x + 160, block.y + 130, 70, 60, 'shop', '', '#7fb8a8', 1);
        continue;
      }
      if (bx === 5 && by === 1) {
        addBuilding(block.x + 30, block.y + 30, 150, 100, 'hospital', 'Shore General', '#e8e8f0', 3);
        continue;
      }
      if (bx === 4 && by === 4) {
        addBuilding(block.x + 40, block.y + 30, 130, 100, 'police', 'Vice Shores PD', '#2b4c9b', 3);
        continue;
      }
      if (bx === 6 && by === 4) {
        // Chop shop, east side.
        addBuilding(block.x + 20, block.y + 40, 160, 100, 'warehouse', 'Chop Shop', '#8a7a5a', 1);
        continue;
      }
      if (downtown) {
        const floors = randomInt(random, 6, 16);
        addBuilding(block.x + 20, block.y + 20, 90, 90, 'tower', '', PALETTE.downtown, floors);
        addBuilding(block.x + 140, block.y + 120, 70, 70, 'tower', '', randomPick(random, HOUSE_COLORS), randomInt(random, 4, 9));
      } else if (random() < 0.5) {
        addBuilding(block.x + 25, block.y + 25, 110, 80, 'house', '', undefined, 1);
        addBuilding(block.x + 140, block.y + 130, 70, 60, 'house', '', undefined, 1);
      } else {
        addBuilding(block.x + 45, block.y + 45, 130, 110, 'house', '', undefined, randomInt(random, 1, 2));
      }
      // A tree or two on most blocks.
      if (random() < 0.7) trees.push({ x: block.x + randomRange(random, 15, block.w - 15), y: block.y + randomRange(random, 15, block.h - 15), r: randomRange(random, 9, 14) });
    }
  }

  // Palm Park: a pond and a ring of palms.
  const park = blockRect(0, 0);
  for (let i = 0; i < 14; i += 1) {
    trees.push({ x: park.x + randomRange(random, 10, park.w - 10), y: park.y + randomRange(random, 10, park.h - 10), r: randomRange(random, 10, 15) });
  }

  // Docks: stacked containers and cranes.
  for (let i = 0; i < 10; i += 1) {
    containers.push({
      x: 2150 + randomRange(random, 0, 380),
      y: 1700 + randomRange(random, 0, 420),
      w: 90,
      h: 34,
      color: randomPick(random, ['#b85c38', '#3f7a9e', '#7a9e3f', '#c9a13f']),
      angle: random() < 0.5 ? 0 : Math.PI / 2,
    });
  }

  // Boats at the marina, bobbing on the water.
  for (let i = 0; i < 6; i += 1) {
    boats.push({ x: 300 + i * 380 + randomRange(random, -30, 30), y: 2565, angle: 0, color: randomPick(random, ['#f4f1e8', '#e5534b', '#4fc3f7']) });
  }
  // Palms along the beach.
  for (let i = 0; i < 12; i += 1) {
    trees.push({ x: 120 + i * 210 + randomRange(random, -20, 20), y: 2495, r: 12 });
  }

  return { buildings, trees, containers, boats, park, waterY: 2540, sandY: 2479 };
}

/** Push a circle out of every building it overlaps; returns the corrected position. */
export function collideCircle(city, x, y, radius) {
  for (const b of city.buildings) {
    const closestX = Math.max(b.x, Math.min(x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - closestX;
    const dy = y - closestY;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = closestX + (dx / d) * radius;
        y = closestY + (dy / d) * radius;
      } else {
        // Centre inside the rectangle: push out along the smallest penetration.
        const left = x - b.x;
        const right = b.x + b.w - x;
        const top = y - b.y;
        const bottom = b.y + b.h - y;
        const min = Math.min(left, right, top, bottom);
        if (min === left) x = b.x - radius;
        else if (min === right) x = b.x + b.w + radius;
        else if (min === top) y = b.y - radius;
        else y = b.y + b.h + radius;
      }
    }
  }
  // World bounds and the water: nobody swims.
  x = Math.max(20, Math.min(WORLD.size - 20, x));
  y = Math.max(20, Math.min(city.waterY - 14, y));
  return { x, y };
}

/** True when a circle overlaps any building. */
export function hitsBuilding(city, x, y, radius) {
  for (const b of city.buildings) {
    const closestX = Math.max(b.x, Math.min(x, b.x + b.w));
    const closestY = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - closestX;
    const dy = y - closestY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

/** A free point on a road, away from buildings, for spawning. `axis` names the road it sits on. */
export function randomRoadPoint(random) {
  const line = randomPick(random, ROAD_LINES);
  if (random() < 0.5) return { x: randomRange(random, 60, WORLD.size - 60), y: line, axis: 'x' };
  return { x: line, y: randomRange(random, 60, WORLD.size - 60), axis: 'y' };
}

/** A free point on a sidewalk beside a road (for pedestrians). */
export function randomSidewalkPoint(random) {
  const line = randomPick(random, ROAD_LINES);
  const along = randomRange(random, 60, WORLD.size - 60);
  const off = randomPick(random, [-54, 54]);
  if (random() < 0.5) return { x: along, y: line + off };
  return { x: line + off, y: along };
}

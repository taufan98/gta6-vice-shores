// Vice Shores — every tuning number, colour and name in one place.
// The world is a fixed 2600 x 2600 top-down city; the renderer scales the canvas to the
// window, so no rule below depends on the screen size.

export const WORLD = { size: 2600, roadSpacing: 325, roadHalf: 42, margin: 162 };
export const STEP = 1 / 60;
export const SAVE_KEY = 'vice-shores.save.v1';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const PLAYER = {
  radius: 13,
  walkSpeed: 210,
  runSpeed: 330,
  accel: 2400,
  friction: 2200,
  health: 100,
  punchDamage: 12,
  punchRange: 34,
  punchArc: 1.1,
  pistolDamage: 26,
  pistolRange: 420,
  fireInterval: 0.22,
  startAmmo: 24,
  maxAmmo: 120,
};

export const CAR = {
  length: 46,
  width: 24,
  accel: 420,
  brake: 700,
  reverseAccel: 260,
  maxSpeed: 520,
  maxReverse: 160,
  steer: 2.6,
  grip: 6.5,
  hp: 120,
  trafficCount: 26,
  parkedCount: 14,
};

export const PED = { radius: 10, walkSpeed: 55, runSpeed: 190, count: 30 };

export const POLICE = {
  footSpeed: 235,
  carSpeed: 500, // patrol cars top out just below a sports car: you can outrun them, not a sedan.
  arrestRange: 26,
  arrestTime: 1.2,
  heatPerStar: 20,
  maxStars: 5,
  decayDelay: 18,
  decayRate: 2.2,
  bustedFine: 200,
  wastedFine: 150,
};

export const CRIME = {
  stealCar: 22,
  hitPed: 14,
  killPed: 22,
  shoot: 8,
  hitCop: 30,
  killCop: 45,
  damageCar: 6,
};

export const PALETTE = {
  // Sun-soaked Vice Shores: warm sand, pastel blocks, blue water, dark asphalt.
  water: '#2e7fb8',
  waterDeep: '#1f5f8f',
  sand: '#e8d29a',
  grass: '#7fb069',
  parkGrass: '#69a854',
  road: '#3a3f4a',
  roadEdge: '#2c303a',
  lane: '#e8e3c8',
  sidewalk: '#b9b3a4',
  building: '#c98f6e',
  building2: '#8fa8c8',
  building3: '#d9b36c',
  building4: '#a87fa8',
  building5: '#7fb8a8',
  roof: '#5a5148',
  downtown: '#6e7f96',
  dock: '#8a7a5a',
  tree: '#3f7a3a',
  player: '#ffd166',
  playerShirt: '#ef476f',
  cop: '#2b4c9b',
  copCar: '#e8e8f0',
  taxi: '#f2c94c',
  text: '#f4f1e8',
  muted: '#c9c2b2',
  panel: 'rgba(12, 14, 20, 0.78)',
  gold: '#f2c94c',
  red: '#e5534b',
  green: '#58b368',
};

export const DISTRICTS = {
  downtown: { x: 812, y: 812, w: 650, h: 650, name: 'Downtown' },
  beach: { x: 0, y: 2275, w: 2600, h: 325, name: 'Shore Beach' },
  docks: { x: 2112, y: 1625, w: 488, h: 650, name: 'Portside Docks' },
  park: { x: 162, y: 162, w: 325, h: 325, name: 'Palm Park' },
  strip: { x: 162, y: 1137, w: 650, h: 325, name: 'The Strip' },
};

/** Named places the missions use (world coordinates). */
export const PLACES = {
  garage: { x: 487, y: 812, name: "Rosa's Garage" },
  bank: { x: 1137, y: 1137, name: 'Shore Bank' },
  park: { x: 325, y: 325, name: 'Palm Park' },
  docks: { x: 2275, y: 1950, name: 'Portside Docks' },
  strip: { x: 487, y: 1300, name: 'The Strip' },
  chopShop: { x: 2112, y: 1787, name: 'Chop Shop' },
  yacht: { x: 2437, y: 2112, name: 'Yacht Marina' },
  hospital: { x: 1787, y: 487, name: 'Shore General' },
  policeHQ: { x: 1462, y: 1462, name: 'Vice Shores PD' },
  casino: { x: 325, y: 1300, name: 'Casino Solmar' },
};

export const MISSION_REWARDS = [150, 250, 400, 900, 2500];

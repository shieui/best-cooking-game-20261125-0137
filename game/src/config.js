// Every tuning number, colour, recipe and station of Sizzle & Serve in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts this long; when it runs out the shift ends and the score is tallied. */
export const SHIFT_LENGTH = 150;

/** The last seconds of the shift are the rush: orders come faster and patience runs shorter. */
export const RUSH_AT = 30;

export const CHEF = {
  radius: 22,
  speed: 330,
  /** How many items the chef can carry at once. */
  hands: 2,
};

export const CHOPS_NEEDED = 3;
/** Seconds on the stove before a raw patty is cooked through. */
export const COOK_SECONDS = 6;
/** Seconds after cooking before a patty left on the stove burns. */
export const BURN_AFTER = 8;

export const PALETTE = {
  wall: '#7d9b76',
  wallTrim: '#5f7d58',
  floorA: '#e8d9b8',
  floorB: '#dfcda4',
  counterTop: '#b07d4f',
  counterSide: '#8a5f38',
  counterEdge: '#6e4a2b',
  steel: '#c9ced6',
  steelDark: '#9aa1ad',
  board: '#d9b380',
  boardDark: '#b98f5e',
  fridge: '#dfe6ea',
  fridgeDark: '#aeb8c0',
  stove: '#3a3f47',
  burnerOff: '#22262c',
  burnerOn: '#e2574c',
  plate: '#f4f1e8',
  ticket: '#fff8dc',
  ticketUrgent: '#ffe1d6',
  text: '#2b2620',
  textLight: '#fdf6e3',
  muted: '#8a7f6d',
  gold: '#f2c94c',
  red: '#d64541',
  green: '#4c9a4c',
};

/** System font stack only: the game loads no font files, so it works with no network. */
export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const BEST_KEY = 'sizzle-and-serve.best';

/**
 * Every ingredient the kitchen stocks. `prep` is what the item is right now:
 * raw, chopped, cooked or burnt. A recipe names the prep it wants.
 */
export const INGREDIENTS = {
  tomato: { name: 'Tomato', choppable: true, cookable: false, colour: '#e5484d', leaf: '#3f7d3a' },
  lettuce: { name: 'Lettuce', choppable: true, cookable: false, colour: '#69b455', leaf: '#4c8a3f' },
  cheese: { name: 'Cheese', choppable: false, cookable: false, colour: '#f2c94c', leaf: '#e0a92e' },
  bread: { name: 'Bread', choppable: false, cookable: false, colour: '#d9a05b', leaf: '#a8743a' },
  patty: { name: 'Patty', choppable: false, cookable: true, colour: '#8a5a3b', leaf: '#6e4529' },
};

/** The keys that grab each ingredient at the fridge, in the order the panel shows them. */
export const FRIDGE_KEYS = ['tomato', 'lettuce', 'cheese', 'bread', 'patty'];

/**
 * The menu. An order is a recipe id; a plate serves it when its items match the recipe
 * as a set, whatever order they were stacked in.
 */
export const RECIPES = [
  {
    id: 'salad',
    name: 'Garden Salad',
    items: [
      { kind: 'tomato', prep: 'chopped' },
      { kind: 'lettuce', prep: 'chopped' },
    ],
    base: 100,
    colour: '#69b455',
  },
  {
    id: 'burger',
    name: 'Classic Burger',
    items: [
      { kind: 'bread', prep: 'raw' },
      { kind: 'patty', prep: 'cooked' },
      { kind: 'lettuce', prep: 'chopped' },
    ],
    base: 140,
    colour: '#d9a05b',
  },
  {
    id: 'cheeseburger',
    name: 'Cheese Burger',
    items: [
      { kind: 'bread', prep: 'raw' },
      { kind: 'patty', prep: 'cooked' },
      { kind: 'cheese', prep: 'raw' },
    ],
    base: 150,
    colour: '#f2c94c',
  },
  {
    id: 'sandwich',
    name: 'Veggie Stack',
    items: [
      { kind: 'bread', prep: 'raw' },
      { kind: 'tomato', prep: 'chopped' },
      { kind: 'lettuce', prep: 'chopped' },
      { kind: 'cheese', prep: 'raw' },
    ],
    base: 170,
    colour: '#e2574c',
  },
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) ?? RECIPES[0];
}

/**
 * Where each station sits and how close the chef must stand to use it.
 * `x, y` is the point the chef walks toward; `range` is the interaction distance.
 */
export const STATIONS = {
  fridge: { name: 'Fridge', x: 196, y: 225, range: 130, hint: 'Take an ingredient (1-5)' },
  board: { name: 'Chopping Board', x: 165, y: 545, range: 120, hint: 'Chop! Chop! Chop!' },
  stove: { name: 'Stove', x: 500, y: 545, range: 120, hint: 'Cook the patty — don\'t burn it' },
  assembly: { name: 'Assembly Counter', x: 850, y: 545, range: 120, hint: 'Stack the plate' },
  window: { name: 'Serving Window', x: 1130, y: 110, range: 130, hint: 'Serve a finished plate' },
  trash: { name: 'Trash', x: 1150, y: 545, range: 110, hint: 'Throw it away' },
};

/** Order pacing: how the pressure grows across one shift. */
export const ORDERS = {
  firstAfter: 1.5,
  /** Seconds between new orders at the start of the shift. */
  intervalStart: 18,
  /** Seconds between new orders once the rush sets in. */
  intervalRush: 9,
  maxActive: 3,
  /** Seconds an order waits at the start of the shift. */
  patienceStart: 65,
  /** Seconds an order waits once the rush sets in. */
  patienceRush: 38,
  /** Points lost when an order walks out. */
  expirePenalty: 25,
  /** Tip for serving with the whole patience bar left. */
  maxTip: 60,
};

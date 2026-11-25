// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a small
// autopilot that plans the same route a player would — fridge, board, stove, plate,
// window — so the frame is what a real game looks like and the same seed always
// gives the same frame.

import { FRIDGE_KEYS, RECIPES, STATIONS, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 14;
const PLAY_SECONDS = 40;
const SERVE_LIMIT_SECONDS = 60;
const END_LIMIT_SECONDS = 160;
const SAMPLE = STEP;
/** Seconds between the autopilot's presses when it stands at a station. */
const PRESS_EVERY = 0.25;

function itemKey(item) {
  return `${item.kind}:${item.prep}`;
}

function recipeItems(recipe) {
  return recipe.items.map((item) => itemKey(item));
}

/** True when every item on the plate still belongs to some open order's recipe. */
function plateStillUseful(state) {
  if (state.plate.length === 0) return true;
  const plateKeys = state.plate.map(itemKey);
  return state.orders.some((order) => {
    const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
    const wanted = recipeItems(recipe);
    return plateKeys.every((key) => {
      const index = wanted.indexOf(key);
      if (index === -1) return false;
      wanted.splice(index, 1);
      return true;
    });
  });
}

/**
 * Decide what the autopilot wants next: a station to walk to, and what to do there.
 * Returns { station, fridgeKind } where fridgeKind is a FRIDGE_KEYS index or -1.
 */
function plan(state, world) {
  const idle = { station: null, fridgeKind: -1 };
  if (state.orders.length === 0) return idle;

  // The order closest to being finished (plate + hands already cover most of it),
  // breaking ties toward the one with the least patience left.
  let targetOrder = null;
  let targetCovered = -1;
  for (const order of state.orders) {
    const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
    const wanted = recipeItems(recipe);
    let covered = 0;
    for (const item of [...state.plate, ...state.hands]) {
      const index = wanted.indexOf(itemKey(item));
      if (index !== -1) {
        wanted.splice(index, 1);
        covered += 1;
      }
    }
    if (covered > targetCovered || (covered === targetCovered && targetOrder && order.patience < targetOrder.patience)) {
      targetOrder = order;
      targetCovered = covered;
    }
  }
  const recipe = RECIPES.find((entry) => entry.id === targetOrder.recipeId);
  const wanted = recipeItems(recipe);

  // A finished plate goes straight to the window.
  if (world.plateServes()) return { station: 'window', fridgeKind: -1 };

  // A plate that matches nothing any more is cleared at the trash.
  if (!plateStillUseful(state)) {
    return { station: 'trash', fridgeKind: -1 };
  }

  // Burnt food is binned before anything else.
  if (state.hands.some((item) => item.prep === 'burnt')) {
    return { station: 'trash', fridgeKind: -1 };
  }

  // What the plate still needs (the hands are not subtracted here: a hand item
  // that belongs on the plate must be recognised as such).
  const plateMissing = wanted.slice();
  for (const item of state.plate) {
    const index = plateMissing.indexOf(itemKey(item));
    if (index !== -1) plateMissing.splice(index, 1);
  }
  // What nobody holds yet: not on the plate, not in a hand, not being prepared.
  const stillNeeded = plateMissing.slice();
  for (const item of state.hands) {
    const index = stillNeeded.indexOf(itemKey(item));
    if (index !== -1) stillNeeded.splice(index, 1);
  }

  // An item in hand that the plate still needs goes on the plate.
  for (const item of state.hands) {
    if (plateMissing.includes(itemKey(item))) return { station: 'assembly', fridgeKind: -1 };
  }

  // A chopped item waiting on the board, or a patty cooking, is collected first.
  for (const key of plateMissing) {
    const [kind, prep] = key.split(':');
    if (prep === 'chopped' && state.board.item && state.board.item.kind === kind && state.board.chops >= 3) {
      return { station: 'board', fridgeKind: -1 };
    }
    if (prep === 'cooked' && state.stove.some((burner) => burner.item && burner.item.kind === kind && burner.item.prep === 'cooked')) {
      return { station: 'stove', fridgeKind: -1 };
    }
  }
  // Keep chopping what is already on the board.
  if (state.board.item && state.board.chops < 3) {
    const key = `${state.board.item.kind}:chopped`;
    if (plateMissing.includes(key)) return { station: 'board', fridgeKind: -1 };
  }
  // A raw choppable in hand goes on the board; a raw patty in hand goes on the stove.
  // These come before the hands-full bin, or the pilot would bin food it still needs.
  for (const item of state.hands) {
    if (item.prep === 'raw' && plateMissing.includes(`${item.kind}:chopped`) && !state.board.item) {
      return { station: 'board', fridgeKind: -1 };
    }
    if (item.kind === 'patty' && item.prep === 'raw' && plateMissing.includes('patty:cooked')
      && state.stove.some((burner) => burner.item === null)) {
      return { station: 'stove', fridgeKind: -1 };
    }
  }
  // A burnt patty on the stove is picked up and binned.
  if (state.stove.some((burner) => burner.item && burner.item.prep === 'burnt')) {
    return { station: 'stove', fridgeKind: -1 };
  }
  // Everything the plate still needs is already on the board or the stove:
  // stand by and wait for it instead of binning food the order needs.
  const inProgress = plateMissing.length > 0 && plateMissing.every((key) => {
    const [kind, prep] = key.split(':');
    if (prep === 'chopped') return Boolean(state.board.item && state.board.item.kind === kind);
    if (prep === 'cooked') return state.stove.some((burner) => burner.item && burner.item.kind === kind);
    return false;
  });
  if (inProgress) return idle;
  // Hands full of things no open order can use: bin one. Anything else waits.
  if (state.hands.length >= 2) {
    const useless = state.hands.some((item) => !state.orders.some((order) => {
      const other = RECIPES.find((entry) => entry.id === order.recipeId);
      return recipeItems(other).some((key) => key.split(':')[0] === item.kind);
    }));
    if (useless) return { station: 'trash', fridgeKind: -1 };
    return idle;
  }

  // Otherwise fetch the next missing ingredient from the fridge.
  for (const key of stillNeeded) {
    const [kind, prep] = key.split(':');
    if (prep === 'chopped' && state.board.item && state.board.item.kind === kind) continue;
    if (prep === 'cooked' && state.stove.some((burner) => burner.item && burner.item.kind === kind)) continue;
    if (state.hands.some((item) => item.kind === kind && item.prep === 'raw')) continue;
    return { station: 'fridge', fridgeKind: FRIDGE_KEYS.indexOf(kind) };
  }
  return idle;
}

/** Walk the chef toward `point` for one step and say whether it arrived. */
function steer(world, point) {
  const chef = world.state.chef;
  const dx = point.x - chef.x;
  const dy = point.y - chef.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 12) return [0, 0];
  return [dx / distance, dy / distance];
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start)
 * and return the screen to draw over it and the best score to show. The serve scene
 * stops the moment a finished plate is at the window, ready to serve.
 */
export function stageShot(name, world) {
  world.reset();
  const limit = name === 'play'
    ? PLAY_SECONDS
    : name === 'serve'
      ? SERVE_LIMIT_SECONDS
      : name === 'end'
        ? END_LIMIT_SECONDS
        : START_SECONDS;
  let pressTimer = 0;
  let lastFridgeKey = '';
  for (let index = 0; index < limit / SAMPLE; index += 1) {
    const decision = plan(world.state, world);
    let direction = [0, 0];
    let fridgePick = -1;
    if (decision.station) {
      const station = STATIONS[decision.station];
      direction = steer(world, station);
      const distance = Math.hypot(world.state.chef.x - station.x, world.state.chef.y - station.y);
      if (distance < station.range * 0.85) {
        if (decision.station === 'fridge' && decision.fridgeKind >= 0) {
          const key = `${decision.fridgeKind}:${world.state.hands.length}`;
          if (key !== lastFridgeKey) {
            fridgePick = decision.fridgeKind;
            lastFridgeKey = key;
          }
        } else {
          pressTimer -= SAMPLE;
          if (pressTimer <= 0) {
            world.interact();
            pressTimer = PRESS_EVERY;
          }
        }
      }
    }
    const events = world.step(SAMPLE, direction, fridgePick);
    if (events & EVENT_OVER) break;
    if (name === 'start' && index > START_SECONDS / SAMPLE) break;
    if (name === 'serve' && world.plateServes()) {
      const windowStation = STATIONS.window;
      const atWindow = Math.hypot(world.state.chef.x - windowStation.x, world.state.chef.y - windowStation.y) < windowStation.range;
      if (atWindow) break;
    }
  }
  if (name === 'end') return { screen: SCREEN_OVER, best: world.state.score };
  if (name === 'play' || name === 'serve') return { screen: SCREEN_PLAY, best: world.state.score };
  return { screen: SCREEN_TITLE, best: 0 };
}

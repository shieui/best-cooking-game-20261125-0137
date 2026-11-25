// The kitchen itself: the shift clock, the orders on the board, the chef's hands,
// the chopping board, the stove burners and the plate being assembled. Every rule
// lives here; rendering only paints this state, and input only calls its verbs.

import {
  BURN_AFTER,
  CHEF,
  CHOPS_NEEDED,
  COOK_SECONDS,
  FIELD,
  FRIDGE_KEYS,
  INGREDIENTS,
  ORDERS,
  RECIPES,
  RUSH_AT,
  SHIFT_LENGTH,
  STATIONS,
} from './config.js';
import { pick } from './random.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_OVER = 4;
export const EVENT_CHOP = 8;
export const EVENT_COOKED = 16;
export const EVENT_ERROR = 32;
export const EVENT_PICKUP = 64;
export const EVENT_PLACE = 128;
export const EVENT_NEW_ORDER = 256;

/** A carried or placed item: its kind and what has been done to it. */
export function makeItem(kind, prep) {
  return { kind, prep };
}

function itemMatches(item, wanted) {
  return item.kind === wanted.kind && item.prep === wanted.prep;
}

function plateMatchesPlate(plate, recipe) {
  if (plate.length !== recipe.items.length) return false;
  const wanted = recipe.items.slice();
  for (const item of plate) {
    const index = wanted.findIndex((entry) => itemMatches(item, entry));
    if (index === -1) return false;
    wanted.splice(index, 1);
  }
  return wanted.length === 0;
}

export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    served: 0,
    failed: 0,
    combo: 0,
    bestCombo: 0,
    chef: { x: 640, y: 380, facing: 1, moving: false, walkPhase: 0, target: null },
    hands: [],
    orders: [],
    orderTimer: ORDERS.firstAfter,
    nextOrderId: 1,
    board: { item: null, chops: 0 },
    stove: [
      { item: null, cookTime: 0 },
      { item: null, cookTime: 0 },
    ],
    plate: [],
    message: '',
    messageTime: 0,
    particles: [],
    floaters: [],
    lastTickSecond: -1,
  };

  function say(text) {
    state.message = text;
    state.messageTime = 2.5;
  }

  function burst(x, y, colour, count) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;
      const speed = 40 + random() * 90;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.5 + random() * 0.4,
        age: 0,
        colour,
        size: 3 + random() * 4,
      });
    }
  }

  function floater(x, y, text, colour) {
    state.floaters.push({ x, y, text, colour, age: 0, life: 1.4 });
  }

  function spawnOrder() {
    const elapsed = state.time;
    const rush = SHIFT_LENGTH - elapsed <= RUSH_AT;
    const patience = rush ? ORDERS.patienceRush : ORDERS.patienceStart;
    const recipe = pick(random, RECIPES);
    state.orders.push({
      id: state.nextOrderId,
      recipeId: recipe.id,
      patience,
      maxPatience: patience,
    });
    state.nextOrderId += 1;
    return EVENT_NEW_ORDER;
  }

  function nearestStation() {
    let best = null;
    let bestDistance = Infinity;
    for (const [key, station] of Object.entries(STATIONS)) {
      const distance = Math.hypot(state.chef.x - station.x, state.chef.y - station.y);
      if (distance < station.range && distance < bestDistance) {
        best = key;
        bestDistance = distance;
      }
    }
    return best;
  }

  function handHas(kind, prep) {
    return state.hands.some((item) => itemMatches(item, { kind, prep }));
  }

  function takeFromHand(kind, prep) {
    const index = state.hands.findIndex((item) => itemMatches(item, { kind, prep }));
    if (index === -1) return null;
    return state.hands.splice(index, 1)[0];
  }

  /** The order the plate on the assembly counter would serve, or null. */
  function plateServes() {
    for (const order of state.orders) {
      const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
      if (plateMatchesPlate(state.plate, recipe)) return order;
    }
    return null;
  }

  function servePlate(order) {
    const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
    const patienceLeft = Math.max(0, order.patience / order.maxPatience);
    const tip = Math.round(ORDERS.maxTip * patienceLeft);
    const comboBonus = Math.round(recipe.base * 0.1 * Math.min(state.combo, 5));
    const points = recipe.base + tip + comboBonus;
    state.score += points;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.orders = state.orders.filter((entry) => entry.id !== order.id);
    state.plate = [];
    floater(STATIONS.window.x - 60, STATIONS.window.y + 40, `+${points}`, '#f2c94c');
    if (state.combo > 1) floater(STATIONS.window.x - 60, STATIONS.window.y + 70, `Combo x${state.combo}!`, '#ff9d5c');
    burst(STATIONS.window.x, STATIONS.window.y + 30, '#f2c94c', 16);
    say(`Served ${recipe.name}! +${points}`);
    return EVENT_SERVED;
  }

  function useFridge(kind) {
    if (state.hands.length >= CHEF.hands) {
      say('Hands full!');
      return EVENT_ERROR;
    }
    state.hands.push(makeItem(kind, 'raw'));
    burst(STATIONS.fridge.x, STATIONS.fridge.y, INGREDIENTS[kind].colour, 6);
    return EVENT_PICKUP;
  }

  function useBoard() {
    const board = state.board;
    if (board.item && board.chops >= CHOPS_NEEDED) {
      if (state.hands.length >= CHEF.hands) {
        say('Hands full!');
        return EVENT_ERROR;
      }
      state.hands.push(makeItem(board.item.kind, 'chopped'));
      board.item = null;
      board.chops = 0;
      return EVENT_PICKUP;
    }
    if (board.item) {
      board.chops += 1;
      burst(STATIONS.board.x, STATIONS.board.y - 20, INGREDIENTS[board.item.kind].colour, 8);
      if (board.chops >= CHOPS_NEEDED) say(`${INGREDIENTS[board.item.kind].name} chopped!`);
      return EVENT_CHOP;
    }
    const index = state.hands.findIndex(
      (item) => item.prep === 'raw' && INGREDIENTS[item.kind].choppable,
    );
    if (index === -1) {
      say('Nothing to chop — bring a tomato or lettuce.');
      return EVENT_ERROR;
    }
    board.item = state.hands.splice(index, 1)[0];
    board.chops = 0;
    return EVENT_PLACE;
  }

  function useStove() {
    for (const burner of state.stove) {
      if (burner.item && burner.item.prep === 'cooked') {
        if (state.hands.length >= CHEF.hands) {
          say('Hands full!');
          return EVENT_ERROR;
        }
        state.hands.push(burner.item);
        burner.item = null;
        burner.cookTime = 0;
        return EVENT_PICKUP;
      }
    }
    for (const burner of state.stove) {
      if (burner.item && burner.item.prep === 'burnt') {
        if (state.hands.length >= CHEF.hands) {
          say('Hands full!');
          return EVENT_ERROR;
        }
        state.hands.push(burner.item);
        burner.item = null;
        burner.cookTime = 0;
        say('Burnt! Bin it.');
        return EVENT_PICKUP;
      }
    }
    const index = state.hands.findIndex((item) => item.kind === 'patty' && item.prep === 'raw');
    if (index === -1) {
      say('The stove cooks patties — bring a raw patty.');
      return EVENT_ERROR;
    }
    const burner = state.stove.find((entry) => entry.item === null);
    if (!burner) {
      say('Both burners are busy!');
      return EVENT_ERROR;
    }
    burner.item = state.hands.splice(index, 1)[0];
    burner.cookTime = 0;
    return EVENT_PLACE;
  }

  function useAssembly() {
    if (state.hands.length > 0) {
      if (state.plate.length >= 4) {
        say('The plate is full!');
        return EVENT_ERROR;
      }
      const item = state.hands.shift();
      state.plate.push(item);
      burst(STATIONS.assembly.x, STATIONS.assembly.y - 20, INGREDIENTS[item.kind].colour, 6);
      return EVENT_PLACE;
    }
    if (state.plate.length > 0) {
      const item = state.plate.pop();
      state.hands.push(item);
      return EVENT_PICKUP;
    }
    say('Bring an ingredient to stack on the plate.');
    return EVENT_ERROR;
  }

  function useWindow() {
    const order = plateServes();
    if (!order) {
      say('That plate matches no order yet.');
      return EVENT_ERROR;
    }
    return servePlate(order);
  }

  function useTrash() {
    if (state.hands.length > 0) {
      const item = state.hands.pop();
      burst(STATIONS.trash.x, STATIONS.trash.y - 20, '#8a7f6d', 6);
      say(`Binned the ${INGREDIENTS[item.kind].name.toLowerCase()}.`);
      return EVENT_PLACE;
    }
    if (state.plate.length > 0) {
      state.plate = [];
      say('Cleared the plate.');
      return EVENT_PLACE;
    }
    say('Nothing to throw away.');
    return EVENT_ERROR;
  }

  const world = {
    state,

    reset() {
      state.time = 0;
      state.score = 0;
      state.served = 0;
      state.failed = 0;
      state.combo = 0;
      state.bestCombo = 0;
      state.chef.x = 640;
      state.chef.y = 380;
      state.chef.facing = 1;
      state.chef.moving = false;
      state.chef.target = null;
      state.hands = [];
      state.orders = [];
      state.orderTimer = ORDERS.firstAfter;
      state.nextOrderId = 1;
      state.board = { item: null, chops: 0 };
      state.stove = [
        { item: null, cookTime: 0 },
        { item: null, cookTime: 0 },
      ];
      state.plate = [];
      state.message = '';
      state.messageTime = 0;
      state.particles = [];
      state.floaters = [];
      state.lastTickSecond = -1;
    },

    /** Which station the chef can use right now, or null. */
    stationInReach() {
      return nearestStation();
    },

    /** Take one ingredient straight from the fridge (used by the fridge panel). */
    takeFromFridge(kind) {
      return useFridge(kind);
    },

    /** Use the station the chef is standing at. Returns an event bitmask. */
    interact() {
      const station = nearestStation();
      if (!station) {
        say('Walk up to a station first.');
        return EVENT_ERROR;
      }
      if (station === 'fridge') {
        say('Pick an ingredient: press 1-5 or click the fridge panel.');
        return 0;
      }
      if (station === 'board') return useBoard();
      if (station === 'stove') return useStove();
      if (station === 'assembly') return useAssembly();
      if (station === 'window') return useWindow();
      if (station === 'trash') return useTrash();
      return 0;
    },

    /** The order the current plate would serve, for the renderer's ready glow. */
    plateServes,

    /** Steer the chef toward a point (click-to-move). */
    setMoveTarget(x, y) {
      state.chef.target = { x, y };
    },

    /**
     * Advance the world one fixed step. `direction` is the held movement keys,
     * `fridgePick` an ingredient index from the fridge panel (or -1).
     * Returns an event bitmask for sounds and announcements.
     */
    step(dt, direction, fridgePick) {
      let events = 0;
      state.time += dt;
      const remaining = SHIFT_LENGTH - state.time;

      // The shift clock ticks once a second in the last ten seconds.
      const wholeSecond = Math.ceil(remaining);
      if (remaining <= 10 && wholeSecond !== state.lastTickSecond) {
        state.lastTickSecond = wholeSecond;
        events |= 0; // the caller ticks on the HUD; no sound event needed here
      }

      // New orders arrive on a timer that quickens as the rush sets in.
      if (state.orders.length < ORDERS.maxActive) {
        state.orderTimer -= dt;
        if (state.orderTimer <= 0) {
          events |= spawnOrder();
          const rush = remaining <= RUSH_AT;
          state.orderTimer = rush
            ? ORDERS.intervalRush + random() * 3
            : ORDERS.intervalStart + random() * 4;
        }
      }

      // Patience runs out: the order walks out, the combo breaks, points are lost.
      for (const order of state.orders.slice()) {
        order.patience -= dt;
        if (order.patience <= 0) {
          const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
          state.orders = state.orders.filter((entry) => entry.id !== order.id);
          state.failed += 1;
          state.combo = 0;
          state.score = Math.max(0, state.score - ORDERS.expirePenalty);
          say(`${recipe.name} walked out! -${ORDERS.expirePenalty}`);
          events |= EVENT_EXPIRED;
        }
      }

      // The stove cooks: a patty is ready after COOK_SECONDS, burnt BURN_AFTER later.
      for (const burner of state.stove) {
        if (!burner.item) continue;
        burner.cookTime += dt;
        if (burner.item.prep === 'raw' && burner.cookTime >= COOK_SECONDS) {
          burner.item.prep = 'cooked';
          events |= EVENT_COOKED;
          say('Patty cooked — grab it before it burns!');
        } else if (burner.item.prep === 'cooked' && burner.cookTime >= COOK_SECONDS + BURN_AFTER) {
          burner.item.prep = 'burnt';
          say('A patty burnt on the stove!');
        }
      }

      // Fridge picks only count while the chef stands at the fridge.
      if (fridgePick >= 0 && nearestStation() === 'fridge') {
        events |= useFridge(FRIDGE_KEYS[fridgePick]);
      }

      // Movement: held keys win over a click target; reaching the target clears it.
      const chef = state.chef;
      let moveX = direction[0];
      let moveY = direction[1];
      if (moveX === 0 && moveY === 0 && chef.target) {
        const dx = chef.target.x - chef.x;
        const dy = chef.target.y - chef.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 8) {
          chef.target = null;
        } else {
          moveX = dx / distance;
          moveY = dy / distance;
        }
      }
      if (moveX !== 0 || moveY !== 0) {
        chef.target = null;
        chef.x = Math.min(FIELD.width - 40, Math.max(40, chef.x + moveX * CHEF.speed * dt));
        chef.y = Math.min(660, Math.max(150, chef.y + moveY * CHEF.speed * dt));
        chef.facing = moveX < 0 ? -1 : moveX > 0 ? 1 : chef.facing;
        chef.moving = true;
        chef.walkPhase += dt * 12;
      } else {
        chef.moving = false;
      }

      // Messages, particles and floating scores fade on their own clocks.
      if (state.messageTime > 0) state.messageTime -= dt;
      for (const particle of state.particles) {
        particle.age += dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 160 * dt;
      }
      state.particles = state.particles.filter((particle) => particle.age < particle.life);
      for (const floater of state.floaters) {
        floater.age += dt;
        floater.y -= 34 * dt;
      }
      state.floaters = state.floaters.filter((floater) => floater.age < floater.life);

      if (remaining <= 0) events |= EVENT_OVER;
      return events;
    },

    /** Seconds left on the shift clock, never below zero. */
    timeLeft() {
      return Math.max(0, SHIFT_LENGTH - state.time);
    },

    /** True once the rush hour has begun. */
    isRush() {
      return SHIFT_LENGTH - state.time <= RUSH_AT;
    },

    handHas,
    takeFromHand,
  };

  return world;
}

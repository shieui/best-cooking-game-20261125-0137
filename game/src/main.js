// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play, paused
// and game over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, FRIDGE_KEYS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_EXPIRED, EVENT_NEW_ORDER, EVENT_OVER, EVENT_SERVED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, fridgePanelPick } from './render.js';
import { stageShot } from './shots.js';
import {
  soundChop,
  soundCooked,
  soundError,
  soundExpire,
  soundNewOrder,
  soundPickup,
  soundPlace,
  soundServe,
  soundStart,
  unlockAudio,
} from './audio.js';
import { EVENT_CHOP, EVENT_COOKED, EVENT_ERROR, EVENT_PICKUP, EVENT_PLACE } from './world.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function playEvents(events) {
  if (events & EVENT_SERVED) soundServe();
  if (events & EVENT_EXPIRED) soundExpire();
  if (events & EVENT_NEW_ORDER) soundNewOrder();
  if (events & EVENT_CHOP) soundChop();
  if (events & EVENT_COOKED) soundCooked();
  if (events & EVENT_ERROR) soundError();
  if (events & EVENT_PICKUP) soundPickup();
  if (events & EVENT_PLACE) soundPlace();
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    unlockAudio();
    soundStart();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Serve orders before their patience runs out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.state.score}. Best ${best}.`);
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      const events = world.step(STEP, [0, 0], -1);
      playEvents(events);
      return;
    }
    const events = world.step(STEP, input.direction(), input.takeFridgePick());
    playEvents(events);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_EXPIRED) announce(`An order walked out. Score ${world.state.score}.`);
    else if (events & EVENT_SERVED) announce(`Served! Score ${world.state.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) {
      unlockAudio();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        startGame();
        return;
      }
      if (screen === SCREEN_PLAY) {
        const click = input.takeClickTarget();
        if (click) {
          // A click on the fridge panel picks that ingredient; a click on a
          // station in reach uses it; any other click walks the chef there.
          if (world.stationInReach() === 'fridge') {
            const pick = fridgePanelPick(click.x, click.y);
            if (pick >= 0) {
              const events = world.takeFromFridge(FRIDGE_KEYS[pick]);
              playEvents(events);
              return;
            }
          }
          world.setMoveTarget(click.x, click.y);
          if (world.stationInReach()) {
            const events = world.interact();
            playEvents(events);
          }
        } else {
          const events = world.interact();
          playEvents(events);
        }
        return;
      }
      if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, world, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting orders walk out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Space or click to start your shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

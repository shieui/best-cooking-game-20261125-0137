// Keyboard and mouse, read as the game needs them: held movement keys, one-shot
// actions (interact, pause, fridge picks), and the mouse position in logical
// playfield coordinates, so clicks land on the station the player meant.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

const CONFIRM_KEYS = new Set(['Space', 'KeyE', 'Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const FRIDGE_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 };

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let fridgePick = -1;
  /** Where the mouse last clicked on the floor, in logical coordinates, or null. */
  let clickTarget = null;
  /** The mouse position in logical coordinates, for hover hints. */
  const mouse = { x: 0, y: 0, inside: false };

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function onKeyDown(event) {
    if (MOVE_KEYS[event.code]) {
      held.add(event.code);
      event.preventDefault();
      return;
    }
    if (CONFIRM_KEYS.has(event.code)) {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE_KEYS.has(event.code)) {
      actions |= ACTION_PAUSE;
      event.preventDefault();
    } else if (event.code in FRIDGE_KEYS) {
      fridgePick = FRIDGE_KEYS[event.code];
    }
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseDown(event) {
    const point = toLogical(event.clientX, event.clientY);
    clickTarget = point;
    actions |= ACTION_CONFIRM;
  }

  function onMouseMove(event) {
    const point = toLogical(event.clientX, event.clientY);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.inside = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);

  return {
    /** The movement direction from the held keys, normalised, or [0, 0]. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const vector = MOVE_KEYS[code];
        if (vector) {
          x += vector[0];
          y += vector[1];
        }
      }
      if (x === 0 && y === 0) return [0, 0];
      const length = Math.hypot(x, y);
      return [x / length, y / length];
    },

    /** One-shot actions since the last call; reading them clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },

    /** A fridge ingredient index (0-4) picked since the last call, or -1. */
    takeFridgePick() {
      const taken = fridgePick;
      fridgePick = -1;
      return taken;
    },

    /** The floor point the mouse last clicked, or null; reading it clears it. */
    takeClickTarget() {
      const taken = clickTarget;
      clickTarget = null;
      return taken;
    },

    mouse,
  };
}

// Everything the player sees: the kitchen, the chef, the food, the order board, the
// shift clock and the screens. It paints only what the world holds — no rule lives here.

import { FIELD, FONT, FRIDGE_KEYS, INGREDIENTS, PALETTE, RECIPES, STATIONS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Which fridge-panel button a logical point lands on (0-4), or -1. */
export function fridgePanelPick(x, y) {
  const panelX = (FIELD.width - 560) / 2;
  const panelY = FIELD.height - 92;
  if (y < panelY + 32 || y > panelY + 68) return -1;
  for (let index = 0; index < FRIDGE_KEYS.length; index += 1) {
    const cx = panelX + 56 + index * 104;
    if (x >= cx - 44 && x <= cx + 44) return index;
  }
  return -1;
}

/** Draw one ingredient as a little drawn dish, `size` across. */
export function drawIngredient(ctx, kind, prep, x, y, size) {
  const info = INGREDIENTS[kind];
  const half = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (prep === 'burnt') {
    ctx.fillStyle = '#241f1c';
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#6b6b6b';
    ctx.font = `bold ${size * 0.5}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', 0, 1);
    ctx.restore();
    return;
  }
  if (kind === 'tomato') {
    ctx.fillStyle = prep === 'chopped' ? '#f0706a' : info.colour;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(-half * 0.35, -half * 0.35, half * 0.35, 0, Math.PI * 2);
    ctx.fill();
    if (prep === 'chopped') {
      ctx.strokeStyle = '#c23b3b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-half * 0.6, -half * 0.2);
      ctx.lineTo(half * 0.6, -half * 0.2);
      ctx.moveTo(-half * 0.6, half * 0.3);
      ctx.lineTo(half * 0.6, half * 0.3);
      ctx.stroke();
    } else {
      ctx.fillStyle = info.leaf;
      ctx.beginPath();
      ctx.ellipse(0, -half * 0.85, half * 0.45, half * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = prep === 'chopped' ? '#8ccb6d' : info.colour;
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(angle) * half * 0.45, Math.sin(angle) * half * 0.45, half * 0.55, half * 0.4, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#a8d98a';
    ctx.beginPath();
    ctx.arc(0, 0, half * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'cheese') {
    ctx.fillStyle = info.colour;
    ctx.beginPath();
    ctx.moveTo(-half, half * 0.7);
    ctx.lineTo(half, half * 0.7);
    ctx.lineTo(half, -half * 0.1);
    ctx.lineTo(-half, -half * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0a92e';
    for (const [hx, hy] of [[-half * 0.4, 0], [half * 0.3, half * 0.25], [0, -half * 0.35]]) {
      ctx.beginPath();
      ctx.arc(hx, hy, half * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'bread') {
    ctx.fillStyle = info.colour;
    ctx.beginPath();
    ctx.roundRect(-half, -half * 0.55, size, size * 0.75, half * 0.4);
    ctx.fill();
    ctx.fillStyle = '#c98d4a';
    ctx.beginPath();
    ctx.roundRect(-half, half * 0.2, size, size * 0.2, half * 0.15);
    ctx.fill();
    ctx.fillStyle = '#f4d9a8';
    ctx.beginPath();
    ctx.ellipse(0, half * 0.1, half * 0.6, half * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'patty') {
    ctx.fillStyle = prep === 'cooked' ? '#7a4a2e' : info.colour;
    ctx.beginPath();
    ctx.ellipse(0, 0, half, half * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = prep === 'cooked' ? '#a06a42' : '#a8743a';
    ctx.beginPath();
    ctx.ellipse(0, -half * 0.18, half * 0.7, half * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (prep === 'cooked') {
      ctx.strokeStyle = '#5d3a22';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-half * 0.5, 0);
      ctx.lineTo(half * 0.5, 0);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 0, FIELD.width, 150);
  ctx.fillStyle = PALETTE.wallTrim;
  ctx.fillRect(0, 142, FIELD.width, 8);
  // A warm tiled floor.
  const tile = 64;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 20; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(col * tile, 150 + row * tile, tile, tile);
    }
  }
  ctx.strokeStyle = 'rgba(120, 95, 60, 0.25)';
  ctx.lineWidth = 1;
  for (let row = 0; row <= 9; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, 150 + row * tile);
    ctx.lineTo(FIELD.width, 150 + row * tile);
    ctx.stroke();
  }
  for (let col = 0; col <= 20; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * tile, 150);
    ctx.lineTo(col * tile, FIELD.height);
    ctx.stroke();
  }
  // A rug where the chef works.
  ctx.fillStyle = '#c96f4a';
  roundRect(ctx, 340, 300, 600, 190, 16);
  ctx.fill();
  ctx.strokeStyle = '#e8a87c';
  ctx.lineWidth = 4;
  roundRect(ctx, 356, 316, 568, 158, 10);
  ctx.stroke();
}

function drawFridge(ctx, station, inReach) {
  const { x, y } = station;
  ctx.save();
  if (inReach) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 95, y - 105, 190, 220, 14);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.fridge;
  roundRect(ctx, x - 88, y - 100, 176, 210, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.fridgeDark;
  ctx.fillRect(x - 88, y - 4, 176, 4);
  ctx.strokeStyle = '#8b98a3';
  ctx.lineWidth = 3;
  roundRect(ctx, x - 88, y - 100, 176, 210, 12);
  ctx.stroke();
  // Handles and a little magnet row.
  ctx.fillStyle = '#7d8894';
  ctx.fillRect(x + 52, y - 78, 10, 56);
  ctx.fillRect(x + 52, y + 18, 10, 56);
  const magnetColours = ['#e5484d', '#69b455', '#f2c94c', '#4fc3f7'];
  magnetColours.forEach((colour, index) => {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x - 58 + index * 26, y - 72, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  // The stocked shelves show through the glass door.
  drawIngredient(ctx, 'tomato', 'raw', x - 44, y - 30, 34);
  drawIngredient(ctx, 'lettuce', 'raw', x + 6, y - 30, 34);
  drawIngredient(ctx, 'cheese', 'raw', x - 44, y + 52, 34);
  drawIngredient(ctx, 'bread', 'raw', x + 6, y + 52, 34);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('FRIDGE', x, y + 132);
  ctx.restore();
}

function drawBoardStation(ctx, state, station, inReach) {
  const { x, y } = station;
  ctx.save();
  if (inReach) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 140, y - 118, 280, 130, 12);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.counterSide;
  roundRect(ctx, x - 138, y - 112, 276, 108, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.board;
  roundRect(ctx, x - 128, y - 104, 256, 66, 8);
  ctx.fill();
  ctx.strokeStyle = PALETTE.boardDark;
  ctx.lineWidth = 2;
  for (let index = 1; index < 4; index += 1) {
    ctx.beginPath();
    ctx.moveTo(x - 128 + index * 64, y - 104);
    ctx.lineTo(x - 128 + index * 64, y - 38);
    ctx.stroke();
  }
  const board = state.board;
  if (board.item) {
    drawIngredient(ctx, board.item.kind, board.item.prep, x, y - 70, 52);
    // Chop progress: three knife marks fill in.
    for (let index = 0; index < 3; index += 1) {
      ctx.fillStyle = index < board.chops ? PALETTE.green : 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.arc(x - 24 + index * 24, y - 22, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(board.chops >= 3 ? 'Chopped! Press E to take it' : 'Press E to chop', x, y + 4);
  } else {
    ctx.fillStyle = 'rgba(43,38,32,0.55)';
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('CHOPPING BOARD', x, y - 60);
    ctx.font = `15px ${FONT}`;
    ctx.fillText('bring tomato or lettuce', x, y - 34);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('CHOP', x, y + 28);
  ctx.restore();
}

function drawStove(ctx, state, station, inReach) {
  const { x, y } = station;
  ctx.save();
  if (inReach) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 140, y - 118, 280, 130, 12);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.stove;
  roundRect(ctx, x - 138, y - 112, 276, 108, 10);
  ctx.fill();
  state.stove.forEach((burner, index) => {
    const bx = x - 68 + index * 136;
    const by = y - 66;
    const cooking = burner.item && burner.item.prep === 'raw';
    ctx.fillStyle = cooking ? PALETTE.burnerOn : PALETTE.burnerOff;
    ctx.beginPath();
    ctx.arc(bx, by, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#565d68';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, 44, 0, Math.PI * 2);
    ctx.stroke();
    if (burner.item) {
      drawIngredient(ctx, burner.item.kind, burner.item.prep, bx, by, 56);
      // A ring shows how cooked it is; red means it is about to burn.
      const progress = burner.item.prep === 'cooked'
        ? 1 - Math.max(0, (burner.cookTime - 6) / 8)
        : Math.min(1, burner.cookTime / 6);
      ctx.strokeStyle = burner.item.prep === 'burnt' ? '#ff5a4e' : burner.item.prep === 'cooked' ? '#ffb84d' : '#7ec850';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(bx, by, 52, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
      if (burner.item.prep === 'cooked') {
        ctx.fillStyle = '#fff';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('READY!', bx, by - 62);
      } else if (burner.item.prep === 'burnt') {
        ctx.fillStyle = '#ff8a80';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('BURNT!', bx, by - 62);
      }
    }
  });
  ctx.fillStyle = PALETTE.textLight;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('STOVE', x, y + 28);
  ctx.restore();
}

function drawAssembly(ctx, state, station, inReach, readyOrder) {
  const { x, y } = station;
  ctx.save();
  if (inReach) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 150, y - 118, 300, 130, 12);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.counterSide;
  roundRect(ctx, x - 148, y - 112, 296, 108, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.counterTop;
  roundRect(ctx, x - 148, y - 112, 296, 26, 8);
  ctx.fill();
  // The plate, with everything stacked on it.
  ctx.fillStyle = PALETTE.plate;
  ctx.beginPath();
  ctx.ellipse(x, y - 62, 78, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cfc9b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 62, 78, 30, 0, 0, Math.PI * 2);
  ctx.stroke();
  state.plate.forEach((item, index) => {
    drawIngredient(ctx, item.kind, item.prep, x - 52 + index * 34, y - 78 - index * 4, 34);
  });
  if (state.plate.length === 0) {
    ctx.fillStyle = 'rgba(43,38,32,0.5)';
    ctx.font = `15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('empty plate', x, y - 58);
  }
  if (readyOrder) {
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 180);
    ctx.strokeStyle = `rgba(242, 201, 76, ${pulse})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, y - 62, 88, 38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#7a5b00';
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('READY TO SERVE!', x, y - 108);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('ASSEMBLY', x, y + 28);
  ctx.restore();
}

function drawWindow(ctx, state, station, inReach) {
  const { x, y } = station;
  ctx.save();
  if (inReach) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 110, y - 80, 220, 150, 12);
    ctx.stroke();
  }
  ctx.fillStyle = '#3a2f26';
  roundRect(ctx, x - 104, y - 74, 208, 108, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd98a';
  roundRect(ctx, x - 96, y - 66, 192, 92, 8);
  ctx.fill();
  // A happy customer silhouette waits at the window.
  ctx.fillStyle = '#8a5f38';
  ctx.beginPath();
  ctx.arc(x, y - 34, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4c9a4c';
  ctx.beginPath();
  ctx.arc(x, y + 4, 34, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('SERVE', x, y + 92);
  ctx.restore();
}

function drawTrash(ctx, station, inReach) {
  const { x, y } = station;
  ctx.save();
  if (inReach) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 60, y - 100, 120, 116, 12);
    ctx.stroke();
  }
  ctx.fillStyle = '#5b6470';
  roundRect(ctx, x - 52, y - 92, 104, 100, 8);
  ctx.fill();
  ctx.fillStyle = '#454c56';
  roundRect(ctx, x - 58, y - 100, 116, 16, 8);
  ctx.fill();
  ctx.strokeStyle = '#39404a';
  ctx.lineWidth = 3;
  for (let index = -1; index <= 1; index += 1) {
    ctx.beginPath();
    ctx.moveTo(x + index * 28, y - 78);
    ctx.lineTo(x + index * 28, y - 8);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 17px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('TRASH', x, y + 28);
  ctx.restore();
}

function drawOrderBoard(ctx, state, world) {
  // The chalkboard on the wall, with one ticket per open order.
  ctx.save();
  ctx.fillStyle = '#2e4030';
  roundRect(ctx, 420, 8, 440, 96, 10);
  ctx.fill();
  ctx.strokeStyle = '#c9a86a';
  ctx.lineWidth = 4;
  roundRect(ctx, 420, 8, 440, 96, 10);
  ctx.stroke();
  ctx.fillStyle = '#f4ecd8';
  ctx.font = `bold 22px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('— ORDER BOARD —', 640, 38);
  ctx.font = `15px ${FONT}`;
  ctx.fillStyle = '#b8c9a8';
  ctx.fillText('serve the ticket before its patience runs out', 640, 62);
  // The tickets hang in a row under the board.
  const slotWidth = 150;
  const totalWidth = Math.max(1, state.orders.length) * slotWidth;
  let startX = 640 - totalWidth / 2 + slotWidth / 2;
  if (state.orders.length === 0) {
    ctx.fillStyle = '#b8c9a8';
    ctx.font = `italic 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('No orders yet — the lunch crowd is coming…', 640, 138);
  }
  state.orders.forEach((order, index) => {
    const recipe = RECIPES.find((entry) => entry.id === order.recipeId);
    const cx = startX + index * slotWidth;
    const cy = 138;
    const fraction = Math.max(0, order.patience / order.maxPatience);
    const urgent = fraction < 0.35;
    ctx.fillStyle = urgent ? PALETTE.ticketUrgent : PALETTE.ticket;
    roundRect(ctx, cx - 68, cy - 26, 136, 62, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? PALETTE.red : '#c9b896';
    ctx.lineWidth = urgent ? 3 : 2;
    roundRect(ctx, cx - 68, cy - 26, 136, 62, 8);
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`#${order.id} ${recipe.name}`, cx, cy - 8);
    recipe.items.forEach((item, itemIndex) => {
      drawIngredient(ctx, item.kind, item.prep, cx - 42 + itemIndex * 28, cy + 12, 24);
    });
    // Patience bar along the bottom of the ticket.
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(cx - 58, cy + 26, 116, 6);
    ctx.fillStyle = urgent ? PALETTE.red : PALETTE.green;
    ctx.fillRect(cx - 58, cy + 26, 116 * fraction, 6);
  });
  ctx.restore();
}

function drawChef(ctx, state) {
  const chef = state.chef;
  const bob = chef.moving ? Math.sin(chef.walkPhase) * 3 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob * 0.4);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 20, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: a little cook in whites and a red neckerchief.
  ctx.fillStyle = '#fdf6e3';
  roundRect(ctx, -20, -8, 40, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#d64541';
  ctx.beginPath();
  ctx.moveTo(-10, -6);
  ctx.lineTo(10, -6);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  // Head and toque.
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(0, -20, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-8, -34, 9, 0, Math.PI * 2);
  ctx.arc(0, -38, 10, 0, Math.PI * 2);
  ctx.arc(8, -34, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-14, -36, 28, 8);
  // Eyes look the way the chef faces.
  ctx.fillStyle = '#2b2620';
  ctx.beginPath();
  ctx.arc(chef.facing * 4 - 5, -20, 2.2, 0, Math.PI * 2);
  ctx.arc(chef.facing * 4 + 5, -20, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Carried ingredients ride above the chef's head.
  state.hands.forEach((item, index) => {
    drawIngredient(ctx, item.kind, item.prep, -16 + index * 32, -56, 30);
  });
  ctx.restore();
}

function drawHud(ctx, state, world, best) {
  const timeLeft = world.timeLeft();
  const minutes = Math.floor(timeLeft / 60);
  const seconds = Math.floor(timeLeft % 60);
  const clock = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const rush = world.isRush();
  ctx.save();
  // Score, top left in the wall band, clear of the fridge below it.
  ctx.fillStyle = 'rgba(43,38,32,0.85)';
  roundRect(ctx, 16, 12, 230, 92, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.textLight;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 32, 36);
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText(String(state.score), 32, 68);
  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = '#ffd98a';
  ctx.fillText(`Served ${state.served}   Combo x${state.combo}`, 32, 92);
  // The shift clock, just below the order tickets, big enough to feel.
  const clockColour = timeLeft <= 10 ? '#ff5a4e' : rush ? '#ffb84d' : PALETTE.textLight;
  const pulse = timeLeft <= 10 ? 1 + 0.06 * Math.sin(Date.now() / 120) : 1;
  ctx.fillStyle = 'rgba(43,38,32,0.85)';
  roundRect(ctx, 560, 176, 160, 66, 12);
  ctx.fill();
  ctx.fillStyle = clockColour;
  ctx.font = `bold ${Math.round(32 * pulse)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(clock, 640, 224);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = '#d8cdb8';
  ctx.fillText(rush ? 'RUSH HOUR!' : 'SHIFT CLOCK', 640, 196);
  // Best score, bottom right, clear of the trash above it.
  ctx.fillStyle = 'rgba(43,38,32,0.85)';
  roundRect(ctx, 1034, 640, 230, 66, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.textLight;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('BEST', 1050, 664);
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText(String(best), 1050, 696);
  ctx.restore();
}

function drawFridgePanel(ctx, state) {
  // The ingredient picker that appears at the fridge: five buttons, keys 1-5.
  const panelWidth = 560;
  const panelX = (FIELD.width - panelWidth) / 2;
  const panelY = FIELD.height - 92;
  ctx.save();
  ctx.fillStyle = 'rgba(43,38,32,0.92)';
  roundRect(ctx, panelX, panelY, panelWidth, 76, 12);
  ctx.fill();
  ctx.fillStyle = PALETTE.textLight;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('FRIDGE — press 1-5 or click to take', FIELD.width / 2, panelY + 20);
  FRIDGE_KEYS.forEach((kind, index) => {
    const cx = panelX + 56 + index * 104;
    const cy = panelY + 50;
    ctx.fillStyle = index % 2 === 0 ? '#4a4038' : '#54483c';
    roundRect(ctx, cx - 44, cy - 18, 88, 36, 8);
    ctx.fill();
    drawIngredient(ctx, kind, 'raw', cx - 24, cy, 24);
    ctx.fillStyle = PALETTE.textLight;
    ctx.font = `13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${index + 1} ${INGREDIENTS[kind].name}`, cx - 8, cy + 5);
  });
  ctx.restore();
}

function drawPrompt(ctx, state, world) {
  const stationKey = world.stationInReach();
  if (!stationKey) return;
  const station = STATIONS[stationKey];
  ctx.save();
  ctx.fillStyle = 'rgba(43,38,32,0.9)';
  const text = stationKey === 'fridge' ? station.hint : `E — ${station.name}: ${station.hint}`;
  ctx.font = `bold 16px ${FONT}`;
  const width = ctx.measureText(text).width + 32;
  // Near the top wall the bubble goes below the chef instead of over the board.
  const below = state.chef.y < 220;
  const bubbleY = below ? state.chef.y + 52 : state.chef.y - 108;
  const bubbleX = Math.min(Math.max(state.chef.x - width / 2, 8), FIELD.width - width - 8);
  roundRect(ctx, bubbleX, bubbleY, width, 34, 17);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.fillText(text, bubbleX + width / 2, bubbleY + 24);
  ctx.restore();
}

function drawMessage(ctx, state) {
  if (!state.message || state.messageTime <= 0) return;
  const alpha = Math.min(1, state.messageTime);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(43,38,32,0.9)';
  ctx.font = `bold 18px ${FONT}`;
  const width = ctx.measureText(state.message).width + 36;
  roundRect(ctx, (FIELD.width - width) / 2, 256, width, 38, 19);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.textAlign = 'center';
  ctx.fillText(state.message, FIELD.width / 2, 282);
  ctx.restore();
}

function drawParticles(ctx, state) {
  for (const particle of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - particle.age / particle.life);
    ctx.fillStyle = particle.colour;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const floater of state.floaters) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - floater.age / floater.life);
    ctx.fillStyle = floater.colour;
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(floater.text, floater.x, floater.y);
    ctx.fillText(floater.text, floater.x, floater.y);
    ctx.restore();
  }
}

function drawControlsHint(ctx) {
  ctx.save();
  const text = 'WASD / arrows to move · E or click to use a station · 1-5 at the fridge · P to pause';
  ctx.font = `14px ${FONT}`;
  const width = ctx.measureText(text).width + 32;
  ctx.fillStyle = 'rgba(43,38,32,0.75)';
  roundRect(ctx, (FIELD.width - width) / 2, FIELD.height - 30, width, 24, 12);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8ddc4';
  ctx.fillText(text, FIELD.width / 2, FIELD.height - 13);
  ctx.restore();
}

function drawTitle(ctx, state, best) {
  ctx.save();
  ctx.fillStyle = 'rgba(30, 24, 18, 0.62)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a';
  ctx.font = `bold 72px ${FONT}`;
  ctx.fillText('SIZZLE & SERVE', FIELD.width / 2, 250);
  ctx.fillStyle = '#fdf6e3';
  ctx.font = `bold 30px ${FONT}`;
  ctx.fillText('Rush Hour Kitchen', FIELD.width / 2, 300);
  ctx.font = `19px ${FONT}`;
  ctx.fillStyle = '#e8ddc4';
  ctx.fillText('Orders are piling up. Chop it, cook it, stack it, serve it — before the lunch crowd walks out.', FIELD.width / 2, 348);
  ctx.fillText('Four recipes, one frantic kitchen, a 2½-minute shift. How many plates can you serve?', FIELD.width / 2, 378);
  // The menu, so the player knows what to cook before the first ticket lands.
  ctx.fillStyle = 'rgba(43,38,32,0.9)';
  roundRect(ctx, 340, 410, 600, 150, 14);
  ctx.fill();
  ctx.fillStyle = '#ffd98a';
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText('THE MENU', FIELD.width / 2, 438);
  RECIPES.forEach((recipe, index) => {
    const y = 468 + index * 26;
    ctx.fillStyle = '#fdf6e3';
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${recipe.name} — ${recipe.base} pts`, 380, y);
    recipe.items.forEach((item, itemIndex) => {
      drawIngredient(ctx, item.kind, item.prep, 700 + itemIndex * 34, y - 6, 24);
    });
  });
  ctx.fillStyle = '#fdf6e3';
  ctx.font = `bold 22px ${FONT}`;
  ctx.textAlign = 'center';
  const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 300);
  ctx.globalAlpha = pulse;
  ctx.fillText('Press SPACE or click to start your shift', FIELD.width / 2, 612);
  ctx.globalAlpha = 1;
  if (best > 0) {
    ctx.font = `17px ${FONT}`;
    ctx.fillStyle = '#ffd98a';
    ctx.fillText(`Best shift so far: ${best} points`, FIELD.width / 2, 646);
  }
  ctx.restore();
}

function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(30, 24, 18, 0.6)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#fdf6e3';
  ctx.font = `bold 52px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', FIELD.width / 2, 340);
  ctx.font = `20px ${FONT}`;
  ctx.fillText('Press P or SPACE to get back to the pass', FIELD.width / 2, 384);
  ctx.restore();
}

function drawGameOver(ctx, state, best) {
  ctx.save();
  ctx.fillStyle = 'rgba(30, 24, 18, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd98a';
  ctx.font = `bold 60px ${FONT}`;
  ctx.fillText('SHIFT OVER!', FIELD.width / 2, 220);
  ctx.fillStyle = '#fdf6e3';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText(`Score: ${state.score}`, FIELD.width / 2, 300);
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#e8ddc4';
  ctx.fillText(`Plates served: ${state.served}    Orders lost: ${state.failed}    Best combo: x${state.bestCombo}`, FIELD.width / 2, 352);
  const verdict = state.score >= 600
    ? 'Head chef material. The lunch crowd loves you.'
    : state.score >= 300
      ? 'A solid shift — the pass ran hot but you held it.'
      : 'A quiet shift. The kitchen is yours to master — try again!';
  ctx.fillText(verdict, FIELD.width / 2, 392);
  if (state.score >= best && state.score > 0) {
    ctx.fillStyle = '#f2c94c';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText('★ New best shift! ★', FIELD.width / 2, 440);
  }
  const pulse = 0.75 + 0.25 * Math.sin(Date.now() / 300);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#fdf6e3';
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('Press SPACE or click to cook again', FIELD.width / 2, 500);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.floor(FIELD.width * scale);
    canvas.height = Math.floor(FIELD.height * scale);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
  }

  window.addEventListener('resize', resize);
  resize();

  return {
    draw(state, world, screen, best) {
      ctx.save();
      const scaleX = canvas.width / FIELD.width;
      const scaleY = canvas.height / FIELD.height;
      ctx.scale(scaleX, scaleY);
      drawFloor(ctx);
      const inReach = world.stationInReach();
      drawFridge(ctx, STATIONS.fridge, inReach === 'fridge');
      drawBoardStation(ctx, state, STATIONS.board, inReach === 'board');
      drawStove(ctx, state, STATIONS.stove, inReach === 'stove');
      drawAssembly(ctx, state, STATIONS.assembly, inReach === 'assembly', world.plateServes());
      drawWindow(ctx, state, STATIONS.window, inReach === 'window');
      drawTrash(ctx, STATIONS.trash, inReach === 'trash');
      drawOrderBoard(ctx, state, world);
      drawChef(ctx, state);
      drawParticles(ctx, state);
      // The HUD and messages belong to active play; the title and game-over
      // screens carry their own text and would collide with them.
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
        drawHud(ctx, state, world, best);
        drawMessage(ctx, state);
      }
      if (screen === SCREEN_PLAY) {
        drawPrompt(ctx, state, world);
        if (inReach === 'fridge') drawFridgePanel(ctx, state);
        drawControlsHint(ctx);
      }
      if (screen === SCREEN_TITLE) drawTitle(ctx, state, best);
      if (screen === SCREEN_PAUSED) drawPaused(ctx);
      if (screen === SCREEN_OVER) drawGameOver(ctx, state, best);
      ctx.restore();
    },
  };
}

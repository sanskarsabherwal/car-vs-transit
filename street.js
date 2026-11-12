// ---------- Street animation ----------
// SCENE is injected by app.py:
// { cars, buses, streetcars, subwayCars, commuters, busCap, streetcarCap, subwayCap }
const canvas = document.getElementById("street");
const ctx = canvas.getContext("2d");
const W = canvas.width;

// Layout (y positions in canvas pixels)
const ROAD_TOP = 115;
const CAR_LANE_Y = 125;
const BUS_LANE_Y = 210;
const STREETCAR_LANE_Y = 295;
const ROAD_BOTTOM = 385;
const TUNNEL_TOP = 425;
const TUNNEL_BOTTOM = 505;

const CAR_W = 44, CAR_H = 22, CAR_MIN_SLOT = 50;
const BUS_W = 120, BUS_H = 40, BUS_MIN_SLOT = 170;
const SC_W = 150, SC_H = 42, SC_MIN_SLOT = 200;
const SUB_W = 130, SUB_H = 44, SUB_GAP = 4;
const BASE_SPEED = 90; // pixels per second on an empty road

const scene = Object.assign({ carOffset: 0, busOffset: 0, scOffset: 0, subOffset: 0 }, SCENE);

const CAR_COLORS = ["#e03131", "#f08c00", "#2f9e44", "#7048e8", "#495057", "#0c8599", "#c2255c", "#868e96"];

// Fixed skyline so it does not change every frame
const buildings = [];
(function makeSkyline() {
  let x = 0;
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  while (x < W) {
    const w = 40 + rand() * 50;
    const h = 30 + rand() * 60;
    buildings.push({ x, w, h, shade: 170 + Math.floor(rand() * 40) });
    x += w + 4;
  }
})();

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dashedLine(y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([24, 16]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawBackground() {
  // sky
  ctx.fillStyle = "#cfe8ff";
  ctx.fillRect(0, 0, W, 100);

  // buildings
  buildings.forEach((b) => {
    ctx.fillStyle = "rgb(" + b.shade + "," + (b.shade + 5) + "," + (b.shade + 15) + ")";
    ctx.fillRect(b.x, 100 - b.h, b.w, b.h);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let wy = 100 - b.h + 6; wy < 92; wy += 12) {
      for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 12) {
        ctx.fillRect(wx, wy, 5, 6);
      }
    }
  });

  // sidewalks
  ctx.fillStyle = "#b0b7bf";
  ctx.fillRect(0, 100, W, ROAD_TOP - 100);
  ctx.fillRect(0, ROAD_BOTTOM, W, 15);

  // road
  ctx.fillStyle = "#3d4247";
  ctx.fillRect(0, ROAD_TOP, W, ROAD_BOTTOM - ROAD_TOP);

  // lane dividers
  dashedLine(203, "#f2c94c");
  dashedLine(288, "#ffffff");

  // "BUS" marking in bus lane
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.font = "bold 46px system-ui, sans-serif";
  ctx.textAlign = "center";
  for (let x = 160; x < W; x += 320) ctx.fillText("BUS", x, 268);
  ctx.textAlign = "left";

  // streetcar rails
  ctx.fillStyle = "#8a9199";
  ctx.fillRect(0, STREETCAR_LANE_Y + 63, W, 3);
  ctx.fillRect(0, STREETCAR_LANE_Y + 75, W, 3);

  // overhead wire for the streetcar
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, STREETCAR_LANE_Y + 6);
  ctx.lineTo(W, STREETCAR_LANE_Y + 6);
  ctx.stroke();

  // ground and tunnel
  ctx.fillStyle = "#8d6e4f";
  ctx.fillRect(0, ROAD_BOTTOM + 15, W, 140);
  ctx.fillStyle = "#2b2f33";
  ctx.fillRect(0, TUNNEL_TOP, W, TUNNEL_BOTTOM - TUNNEL_TOP);
  // tunnel lights
  ctx.fillStyle = "#ffe066";
  for (let x = 40; x < W; x += 120) ctx.fillRect(x, TUNNEL_TOP + 4, 14, 3);
  // subway rails
  ctx.fillStyle = "#6c757d";
  ctx.fillRect(0, TUNNEL_BOTTOM - 8, W, 3);
}

function drawCar(x, y, color) {
  ctx.fillStyle = color;
  roundRect(x, y + 6, CAR_W, CAR_H - 8, 5);
  ctx.fill();
  roundRect(x + 10, y, CAR_W - 20, 10, 4);
  ctx.fill();
  ctx.fillStyle = "#d0ebff";
  ctx.fillRect(x + 13, y + 2, 8, 6);
  ctx.fillRect(x + 23, y + 2, 8, 6);
  ctx.fillStyle = "#212529";
  ctx.beginPath();
  ctx.arc(x + 27, y + 5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + 10, y + CAR_H - 1, 4, 0, Math.PI * 2);
  ctx.arc(x + CAR_W - 10, y + CAR_H - 1, 4, 0, Math.PI * 2);
  ctx.fill();
}

// Rider dots inside a window strip, scaled to "slots" drawn seats
function drawRiders(x, y, riders, cap, slots, perRow, spacing) {
  const dots = Math.round((riders / cap) * slots);
  ctx.fillStyle = "#212529";
  for (let i = 0; i < dots; i++) {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    ctx.beginPath();
    ctx.arc(x + col * spacing, y + row * 6, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBus(x, y, riders, cap) {
  ctx.fillStyle = "#1971c2";
  roundRect(x, y, BUS_W, BUS_H - 6, 6);
  ctx.fill();
  ctx.fillStyle = "#d0ebff";
  ctx.fillRect(x + 6, y + 5, BUS_W - 24, 14);
  ctx.fillRect(x + BUS_W - 14, y + 5, 10, 18);
  drawRiders(x + 11, y + 9, riders, cap, 20, 10, 9.5);
  ctx.fillStyle = "#ffd43b";
  ctx.fillRect(x, y + 24, BUS_W, 3);
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + 22, y + BUS_H - 5, 6, 0, Math.PI * 2);
  ctx.arc(x + BUS_W - 24, y + BUS_H - 5, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawStreetcar(x, y, riders, cap) {
  // pantograph up to the wire
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + SC_W / 2 - 12, y);
  ctx.lineTo(x + SC_W / 2, y - 12);
  ctx.lineTo(x + SC_W / 2 + 12, y);
  ctx.stroke();
  // body in three sections
  ctx.fillStyle = "#2f9e44";
  roundRect(x, y, SC_W, SC_H - 6, 10);
  ctx.fill();
  ctx.fillStyle = "#d3f9d8";
  ctx.fillRect(x + 8, y + 6, SC_W - 16, 14);
  ctx.strokeStyle = "#2f9e44";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + SC_W / 3, y + 2);
  ctx.lineTo(x + SC_W / 3, y + SC_H - 8);
  ctx.moveTo(x + (2 * SC_W) / 3, y + 2);
  ctx.lineTo(x + (2 * SC_W) / 3, y + SC_H - 8);
  ctx.stroke();
  drawRiders(x + 13, y + 10, riders, cap, 28, 14, 9.2);
  ctx.fillStyle = "#111";
  [18, SC_W / 2, SC_W - 18].forEach((wx) => {
    ctx.beginPath();
    ctx.arc(x + wx, y + SC_H - 5, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawSubwayCar(x, y, riders, cap) {
  ctx.fillStyle = "#adb5bd";
  roundRect(x, y, SUB_W, SUB_H - 6, 4);
  ctx.fill();
  ctx.fillStyle = "#7048e8";
  ctx.fillRect(x, y + 26, SUB_W, 4);
  ctx.fillStyle = "#e5dbff";
  ctx.fillRect(x + 6, y + 6, SUB_W - 12, 14);
  drawRiders(x + 11, y + 10, riders, cap, 24, 12, 9.5);
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + 18, y + SUB_H - 5, 5, 0, Math.PI * 2);
  ctx.arc(x + SUB_W - 18, y + SUB_H - 5, 5, 0, Math.PI * 2);
  ctx.fill();
}

// Spread "count" vehicles evenly around a loop. Returns loop length, spacing and speed.
function laneLayout(count, minSlot, vehicleW) {
  const visibleLoop = W + vehicleW + 20;
  const loop = Math.max(visibleLoop, count * minSlot);
  const slot = loop / Math.max(count, 1);
  // When the lane is overfull, traffic slows down
  const crowding = (count * minSlot) / visibleLoop;
  const speed = crowding > 1 ? BASE_SPEED * Math.max(0.15, 1 / crowding) : BASE_SPEED;
  return { loop, slot, speed, jammed: crowding > 1 };
}

// Riders on vehicle i when all but the last vehicle are full
function ridersOn(i, count, cap) {
  return i === count - 1 ? scene.commuters - cap * (count - 1) : cap;
}

// Draw a lane of evenly spaced vehicles that loop across the canvas
function drawLane(count, minSlot, vehicleW, offsetKey, dt, drawFn) {
  const lane = laneLayout(count, minSlot, vehicleW);
  scene[offsetKey] = (scene[offsetKey] + lane.speed * dt) % lane.loop;
  for (let i = 0; i < count; i++) {
    const x = ((scene[offsetKey] + i * lane.slot) % lane.loop) - vehicleW - 20;
    if (x > -vehicleW && x < W) drawFn(x, i);
  }
  return lane;
}

function drawLabel(text, x, y) {
  ctx.font = "bold 14px system-ui, sans-serif";
  const w = ctx.measureText(text).width + 16;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(x, y, w, 22, 6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x + 8, y + 16);
}

function plural(n, one, many) {
  return n + " " + (n === 1 ? one : many);
}

let lastTime = null;

function frame(time) {
  const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  drawBackground();

  // Cars: two rows, each row packs tighter and slows down as it fills
  const rowCounts = [Math.ceil(scene.cars / 2), Math.floor(scene.cars / 2)];
  const carLane = laneLayout(rowCounts[0], CAR_MIN_SLOT, CAR_W);
  scene.carOffset += carLane.speed * dt;
  rowCounts.forEach((count, row) => {
    if (count === 0) return;
    const lane = laneLayout(count, CAR_MIN_SLOT, CAR_W);
    const start = scene.carOffset + row * lane.slot * 0.5;
    for (let i = 0; i < count; i++) {
      const x = ((start + i * lane.slot) % lane.loop) - CAR_W - 20;
      const color = CAR_COLORS[(i * 2 + row) % CAR_COLORS.length];
      if (x > -CAR_W && x < W) drawCar(x, CAR_LANE_Y + 12 + row * 34, color);
    }
  });

  // Buses
  drawLane(scene.buses, BUS_MIN_SLOT, BUS_W, "busOffset", dt, (x, i) =>
    drawBus(x, BUS_LANE_Y + 33, ridersOn(i, scene.buses, scene.busCap), scene.busCap)
  );

  // Streetcars
  drawLane(scene.streetcars, SC_MIN_SLOT, SC_W, "scOffset", dt, (x, i) =>
    drawStreetcar(x, STREETCAR_LANE_Y + 32, ridersOn(i, scene.streetcars, scene.streetcarCap), scene.streetcarCap)
  );

  // Subway: one train made of coupled cars, running underground
  const trainW = scene.subwayCars * (SUB_W + SUB_GAP);
  const loop = W + trainW + 40;
  scene.subOffset = (scene.subOffset + BASE_SPEED * 1.3 * dt) % loop;
  const trainX = scene.subOffset - trainW - 20;
  for (let i = 0; i < scene.subwayCars; i++) {
    drawSubwayCar(
      trainX + i * (SUB_W + SUB_GAP),
      TUNNEL_BOTTOM - 50,
      ridersOn(i, scene.subwayCars, scene.subwayCap),
      scene.subwayCap
    );
  }

  // Labels
  drawLabel(plural(scene.cars, "car", "cars") + (carLane.jammed ? "  (traffic jam)" : ""), 10, CAR_LANE_Y - 6);
  drawLabel(plural(scene.buses, "bus", "buses"), 10, BUS_LANE_Y + 2);
  drawLabel(plural(scene.streetcars, "streetcar", "streetcars"), 10, STREETCAR_LANE_Y + 2);
  drawLabel(
    "Subway: 1 train, " + plural(scene.subwayCars, "car", "cars") + " (no street space)",
    10,
    TUNNEL_TOP - 30
  );

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

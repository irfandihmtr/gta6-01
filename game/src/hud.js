// hud.js — real HUD (re-record milestone 3): 2D minimap canvas (district,
// roads, plaza, buildings, player, cars, pedestrians, objective marker)
// plus speed readout, wanted stars and the mission objective line.
// main.js calls update(dt, { playerPosition, playerSpeed, cars, peds }).

const MAP_SIZE = 168;
const WANTED_MAX = 5;

export function createHud(city) {
  // --- DOM: minimap (top right), objective + wanted (top left),
  // speed (bottom left). ---
  const style = document.createElement('style');
  style.textContent = [
    '#hud-minimap { position: fixed; right: 16px; top: 14px; z-index: 2; border: 2px solid rgba(242,245,249,0.65); border-radius: 6px; background: #10151c; }',
    '#hud-top-left { position: fixed; left: 16px; top: 86px; z-index: 2; font-family: "Helvetica Neue", Arial, sans-serif; color: #f2f5f9; text-shadow: 0 2px 8px rgba(0,0,0,0.7); pointer-events: none; }',
    '#hud-objective { margin: 0 0 4px; font-size: 13px; letter-spacing: 1px; }',
    '#hud-wanted { margin: 0; font-size: 15px; letter-spacing: 3px; color: #ffd23f; }',
    '#hud-speed { position: fixed; left: 16px; bottom: 16px; z-index: 2; font-family: "Helvetica Neue", Arial, sans-serif; color: #f2f5f9; text-shadow: 0 2px 8px rgba(0,0,0,0.7); pointer-events: none; }',
    '#hud-speed b { font-size: 30px; }',
    '#hud-speed span { font-size: 13px; opacity: 0.8; margin-left: 4px; }',
  ].join('\n');
  document.head.appendChild(style);

  const mapCanvas = document.createElement('canvas');
  mapCanvas.id = 'hud-minimap';
  mapCanvas.width = MAP_SIZE;
  mapCanvas.height = MAP_SIZE;
  document.body.appendChild(mapCanvas);
  const ctx = mapCanvas.getContext('2d');

  const topLeft = document.createElement('div');
  topLeft.id = 'hud-top-left';
  const objective = document.createElement('p');
  objective.id = 'hud-objective';
  objective.textContent = 'OBJECTIVE — Reach the fountain at the plaza';
  const wanted = document.createElement('p');
  wanted.id = 'hud-wanted';
  wanted.textContent = 'WANTED ' + '☆'.repeat(WANTED_MAX);
  topLeft.appendChild(objective);
  topLeft.appendChild(wanted);
  document.body.appendChild(topLeft);

  const speedBox = document.createElement('div');
  speedBox.id = 'hud-speed';
  const speedValue = document.createElement('b');
  speedValue.textContent = '0';
  const speedUnit = document.createElement('span');
  speedUnit.textContent = 'km/h';
  speedBox.appendChild(speedValue);
  speedBox.appendChild(speedUnit);
  document.body.appendChild(speedBox);

  // --- Minimap projection: world [-bounds, bounds] -> canvas [0, MAP_SIZE]. ---
  const scale = MAP_SIZE / city.districtSpan;
  const toMapX = (x) => MAP_SIZE / 2 + x * scale;
  const toMapZ = (z) => MAP_SIZE / 2 + z * scale;

  let wantedLevel = 0; // no police system yet — stays 0 until a later phase
  let lastSpeedText = '';

  function drawMap(state) {
    ctx.fillStyle = '#10151c';
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Roads.
    ctx.strokeStyle = '#3d4048';
    ctx.lineWidth = Math.max(2, 8 * scale);
    for (const road of city.roadLines) {
      ctx.beginPath();
      if (road.axis === 'x') {
        ctx.moveTo(toMapX(road.at), toMapZ(road.from));
        ctx.lineTo(toMapX(road.at), toMapZ(road.to));
      } else {
        ctx.moveTo(toMapX(road.from), toMapZ(road.at));
        ctx.lineTo(toMapX(road.to), toMapZ(road.at));
      }
      ctx.stroke();
    }

    // Plaza.
    ctx.fillStyle = '#8a8d90';
    const plazaHalf = (40 - 8) / 2 * scale;
    ctx.fillRect(MAP_SIZE / 2 - plazaHalf, MAP_SIZE / 2 - plazaHalf, plazaHalf * 2, plazaHalf * 2);

    // Buildings.
    ctx.fillStyle = '#6b7a8c';
    for (const box of city.colliders) {
      ctx.fillRect(
        toMapX(box.minX), toMapZ(box.minZ),
        (box.maxX - box.minX) * scale, (box.maxZ - box.minZ) * scale,
      );
    }

    // Objective marker: the fountain at the plaza centre.
    ctx.fillStyle = '#5bc8e8';
    ctx.beginPath();
    ctx.arc(toMapX(city.plaza.x), toMapZ(city.plaza.z), 4, 0, Math.PI * 2);
    ctx.fill();

    // Pedestrians as tiny dots.
    ctx.fillStyle = 'rgba(242,245,249,0.75)';
    for (const ped of state.peds) {
      ctx.fillRect(toMapX(ped.group.position.x) - 1, toMapZ(ped.group.position.z) - 1, 2, 2);
    }

    // Cars as orange dots.
    ctx.fillStyle = '#ff9f2e';
    for (const car of state.cars) {
      ctx.beginPath();
      ctx.arc(toMapX(car.group.position.x), toMapZ(car.group.position.z), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player: yellow dot with a white ring.
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(toMapX(state.playerPosition.x), toMapZ(state.playerPosition.z), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(toMapX(state.playerPosition.x), toMapZ(state.playerPosition.z), 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  function update(dt, state) {
    drawMap(state);

    const kmh = Math.round((state.playerSpeed || 0) * 3.6);
    const speedText = String(kmh);
    if (speedText !== lastSpeedText) {
      lastSpeedText = speedText;
      speedValue.textContent = speedText;
    }

    const stars = '★'.repeat(wantedLevel) + '☆'.repeat(WANTED_MAX - wantedLevel);
    const wantedText = 'WANTED ' + stars;
    if (wanted.textContent !== wantedText) wanted.textContent = wantedText;
  }

  return { update, setWanted(level) { wantedLevel = Math.max(0, Math.min(WANTED_MAX, level)); } };
}

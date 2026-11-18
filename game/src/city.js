// city.js — the seeded district as a reusable world factory.
// createCity() builds renderer, scene and camera, then returns the world
// plus the data other systems need: building AABBs for player collision,
// road lines for traffic and pedestrians, the open centre plaza (the
// mission objective) and the district bounds. It starts NO render loop —
// main.js owns the loop and the camera. Deterministic: the same seed
// always builds the same skyline (mulberry32 PRNG). The centre block is
// kept clear of buildings so the plaza is a real open square.

import * as THREE from 'three';

// --- Seeded PRNG (mulberry32): deterministic across runs and machines. ---
function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CITY_SEED = 20261119;
export const BLOCK_SIZE = 40; // metres per city block, roads included
export const BLOCKS_PER_SIDE = 3; // 3 x 3 blocks of buildings around the centre plaza
export const ROAD_WIDTH = 8;

export function createCity() {
  const canvas = document.getElementById('city-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87a5c4); // late-afternoon sky
  scene.fog = new THREE.Fog(0x87a5c4, 180, 420);

  const camera = new THREE.PerspectiveCamera(
    55, window.innerWidth / window.innerHeight, 0.1, 800,
  );
  camera.position.set(95, 70, 95);
  camera.lookAt(0, 0, 0);

  // --- Light: warm sun + cool sky fill. ---
  const sun = new THREE.DirectionalLight(0xffe3b3, 1.6);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd4e6, 0x3a3f46, 0.9));

  // --- Ground: one dark asphalt slab for the whole district. ---
  const districtSpan = BLOCKS_PER_SIDE * BLOCK_SIZE;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(districtSpan, districtSpan),
    new THREE.MeshLambertMaterial({ color: 0x2e3138 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // --- Roads: lighter asphalt strips on the grid lines between blocks,
  // plus dashed centre markings (one InstancedMesh for all dashes). ---
  const halfSpan = districtSpan / 2;
  const roadLines = []; // { axis: 'x'|'z', at: number, from: number, to: number }
  for (const at of [-BLOCK_SIZE / 2, BLOCK_SIZE / 2]) {
    roadLines.push({ axis: 'x', at, from: -halfSpan + 4, to: halfSpan - 4 });
    roadLines.push({ axis: 'z', at, from: -halfSpan + 4, to: halfSpan - 4 });
  }
  const roadMaterial = new THREE.MeshLambertMaterial({ color: 0x3d4048 });
  for (const road of roadLines) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(
        road.axis === 'x' ? ROAD_WIDTH : road.to - road.from,
        road.axis === 'x' ? road.to - road.from : ROAD_WIDTH,
      ),
      roadMaterial,
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(road.axis === 'x' ? road.at : 0, 0.01, road.axis === 'z' ? road.at : 0);
    scene.add(strip);
  }
  const dashGeometry = new THREE.PlaneGeometry(0.35, 2.4);
  const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xd8d3c0 });
  const dashSpots = [];
  for (const road of roadLines) {
    for (let along = road.from + 3; along < road.to - 2; along += 6) {
      dashSpots.push({
        x: road.axis === 'x' ? road.at : along,
        z: road.axis === 'z' ? road.at : along,
        rotate: road.axis === 'x',
      });
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeometry, dashMaterial, dashSpots.length);
  const dashMatrix = new THREE.Matrix4();
  dashSpots.forEach((spot, index) => {
    dashMatrix.makeRotationX(-Math.PI / 2);
    if (spot.rotate) dashMatrix.multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    dashMatrix.setPosition(spot.x, 0.03, spot.z);
    dashes.setMatrixAt(index, dashMatrix);
  });
  dashes.instanceMatrix.needsUpdate = true;
  scene.add(dashes);

  // --- Buildings: one InstancedMesh of boxes, seeded heights and tints.
  // Two per block, split along x; the centre block stays clear (open plaza). ---
  const random = mulberry32(CITY_SEED);
  const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
  const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const placements = [];
  const colliders = []; // 2D AABBs, { minX, maxX, minZ, maxZ }
  for (let bx = 0; bx < BLOCKS_PER_SIDE; bx++) {
    for (let bz = 0; bz < BLOCKS_PER_SIDE; bz++) {
      const blockX = (bx - (BLOCKS_PER_SIDE - 1) / 2) * BLOCK_SIZE;
      const blockZ = (bz - (BLOCKS_PER_SIDE - 1) / 2) * BLOCK_SIZE;
      if (bx === 1 && bz === 1) continue; // centre plaza stays open
      const inner = BLOCK_SIZE - ROAD_WIDTH;
      for (let half = 0; half < 2; half++) {
        const width = inner * (0.32 + random() * 0.12);
        const depth = inner * (0.72 + random() * 0.16);
        const height = 8 + random() * 42;
        const x = blockX + (half === 0 ? -inner / 4 : inner / 4);
        const z = blockZ;
        placements.push({ x, z, width, depth, height, shade: 0.55 + random() * 0.45 });
        colliders.push({
          minX: x - width / 2, maxX: x + width / 2,
          minZ: z - depth / 2, maxZ: z + depth / 2,
        });
      }
    }
  }
  const buildings = new THREE.InstancedMesh(
    buildingGeometry, buildingMaterial, placements.length,
  );
  const matrix = new THREE.Matrix4();
  const colour = new THREE.Color();
  placements.forEach((building, index) => {
    matrix.makeScale(building.width, building.height, building.depth);
    matrix.setPosition(building.x, building.height / 2, building.z);
    buildings.setMatrixAt(index, matrix);
    colour.setHSL(0.58, 0.08, 0.32 + building.shade * 0.35);
    buildings.setColorAt(index, colour);
  });
  buildings.instanceMatrix.needsUpdate = true;
  if (buildings.instanceColor) buildings.instanceColor.needsUpdate = true;
  scene.add(buildings);

  // --- Centre plaza: a lighter concrete square marking the district heart,
  // genuinely open — the mission objective lives here. ---
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(BLOCK_SIZE - ROAD_WIDTH, BLOCK_SIZE - ROAD_WIDTH),
    new THREE.MeshLambertMaterial({ color: 0x8a8d90 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  scene.add(plaza);

  // A small fountain marker at the plaza centre, so the objective reads
  // from the minimap and from the street.
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(3, 3.4, 1.1, 20),
    new THREE.MeshLambertMaterial({ color: 0x5b7d8c }),
  );
  fountain.position.set(0, 0.55, 0);
  scene.add(fountain);

  return {
    canvas,
    renderer,
    scene,
    camera,
    colliders,
    roadLines,
    plaza: { x: 0, z: 0, radius: 14 },
    bounds: halfSpan - 2, // playable half-extent in metres
    districtSpan,
  };
}

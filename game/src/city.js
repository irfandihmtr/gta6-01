// city.js — FASE 0 foundation: one seeded city block rendered with three.js.
// Deterministic: the same seed always builds the same skyline (mulberry32 PRNG).
// Later phases add the player, traffic, pedestrians, HUD and audio; this file
// only proves the renderer, the import map and the seeded city generator work.

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

const CITY_SEED = 20261119;
const BLOCK_SIZE = 40; // metres per city block, roads included
const BLOCKS_PER_SIDE = 3; // 3 x 3 blocks of buildings around the centre plaza
const ROAD_WIDTH = 8;

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

// --- Light: warm sun + cool sky fill, no shadows in FASE 0 (speed first). ---
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

// --- Buildings: one InstancedMesh of boxes, seeded heights and tints. ---
const random = mulberry32(CITY_SEED);
const buildingGeometry = new THREE.BoxGeometry(1, 1, 1);
const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const placements = [];
for (let bx = 0; bx < BLOCKS_PER_SIDE; bx++) {
  for (let bz = 0; bz < BLOCKS_PER_SIDE; bz++) {
    const blockX = (bx - (BLOCKS_PER_SIDE - 1) / 2) * BLOCK_SIZE;
    const blockZ = (bz - (BLOCKS_PER_SIDE - 1) / 2) * BLOCK_SIZE;
    const inner = BLOCK_SIZE - ROAD_WIDTH;
    // Two buildings per block, split along x, each with a seeded footprint.
    for (let half = 0; half < 2; half++) {
      const width = inner * (0.32 + random() * 0.12);
      const depth = inner * (0.72 + random() * 0.16);
      const height = 8 + random() * 42;
      const x = blockX + (half === 0 ? -inner / 4 : inner / 4);
      const z = blockZ;
      placements.push({ x, z, width, depth, height, shade: 0.55 + random() * 0.45 });
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

// --- Centre plaza: a lighter concrete square marking the district heart. ---
const plaza = new THREE.Mesh(
  new THREE.PlaneGeometry(BLOCK_SIZE - ROAD_WIDTH, BLOCK_SIZE - ROAD_WIDTH),
  new THREE.MeshLambertMaterial({ color: 0x8a8d90 }),
);
plaza.rotation.x = -Math.PI / 2;
plaza.position.y = 0.02;
scene.add(plaza);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Render loop: a slow orbit so the skyline reads from every angle. ---
const clock = new THREE.Clock();
function renderFrame() {
  const elapsed = clock.getElapsedTime();
  const angle = elapsed * 0.05;
  camera.position.set(Math.cos(angle) * 130, 70, Math.sin(angle) * 130);
  camera.lookAt(0, 8, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(renderFrame);
}
renderFrame();

window.__shotReady = true;

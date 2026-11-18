// player.js — the player on foot: WASD movement, run, third-person camera.
// Movement is relative to the camera yaw; the body is a simple capsule figure
// (torso + head + backpack) that turns toward its travel direction. Collision
// is 2D AABB against the building footprints exported by city.js, resolved
// axis by axis so the player slides along walls instead of sticking.

import * as THREE from 'three';

const WALK_SPEED = 4.2;
const RUN_SPEED = 8.5;
const PLAYER_RADIUS = 0.5;

export function createPlayer(scene, city) {
  // --- Mesh: bright yellow jacket so the player reads at a glance. ---
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0xffd23f });
  const dark = new THREE.MeshLambertMaterial({ color: 0x23262b });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.05, 12), jacket);
  torso.position.y = 0.95;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skin);
  head.position.y = 1.75;
  group.add(head);
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.22), dark);
  pack.position.set(0, 1.0, -0.42);
  group.add(pack);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.3), dark);
  legs.position.y = 0.22;
  group.add(legs);
  scene.add(group);

  // Spawn at the south edge of the plaza, facing the fountain.
  const position = new THREE.Vector3(0, 0, 14);
  const velocity = new THREE.Vector3();
  let heading = Math.PI; // facing north (-z) at spawn
  let camYaw = 0; // camera sits south of the player, looking north
  let camPitch = 0.32;
  let speed = 0;

  // --- Input: WASD + arrows, Shift to run, drag to orbit the camera. ---
  const keys = new Set();
  const watched = new Set([
    'KeyW', 'KeyA', 'KeyS', 'KeyD',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'ShiftLeft', 'ShiftRight',
  ]);
  window.addEventListener('keydown', (event) => {
    if (watched.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  city.canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    city.canvas.setPointerCapture(event.pointerId);
  });
  city.canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    camYaw -= (event.clientX - lastX) * 0.005;
    camPitch = Math.min(1.05, Math.max(0.08, camPitch + (event.clientY - lastY) * 0.003));
    lastX = event.clientX;
    lastY = event.clientY;
  });
  const endDrag = () => { dragging = false; };
  city.canvas.addEventListener('pointerup', endDrag);
  city.canvas.addEventListener('pointercancel', endDrag);

  function hitsBuilding(x, z) {
    for (const box of city.colliders) {
      if (
        x > box.minX - PLAYER_RADIUS && x < box.maxX + PLAYER_RADIUS &&
        z > box.minZ - PLAYER_RADIUS && z < box.maxZ + PLAYER_RADIUS
      ) return true;
    }
    return false;
  }

  function update(dt, camera) {
    // Wish direction in camera space: W = away from camera (north on screen).
    const forward = new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const wish = new THREE.Vector3();
    if (keys.has('KeyW') || keys.has('ArrowUp')) wish.add(forward);
    if (keys.has('KeyS') || keys.has('ArrowDown')) wish.sub(forward);
    if (keys.has('KeyD') || keys.has('ArrowRight')) wish.add(right);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) wish.sub(right);

    const running = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const targetSpeed = wish.lengthSq() > 0 ? (running ? RUN_SPEED : WALK_SPEED) : 0;
    if (wish.lengthSq() > 0) wish.normalize();

    // Smooth acceleration so starts and stops feel weighted, not binary.
    const targetVelocity = wish.multiplyScalar(targetSpeed);
    velocity.lerp(targetVelocity, Math.min(1, dt * 10));
    speed = velocity.length();

    // Move axis by axis; a blocked axis is dropped so the player slides.
    const nextX = position.x + velocity.x * dt;
    if (!hitsBuilding(nextX, position.z)) position.x = nextX;
    const nextZ = position.z + velocity.z * dt;
    if (!hitsBuilding(position.x, nextZ)) position.z = nextZ;
    position.x = Math.max(-city.bounds, Math.min(city.bounds, position.x));
    position.z = Math.max(-city.bounds, Math.min(city.bounds, position.z));

    // Face the travel direction.
    if (speed > 0.4) {
      const targetHeading = Math.atan2(velocity.x, velocity.z);
      let delta = targetHeading - heading;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      heading += delta * Math.min(1, dt * 12);
    }
    group.position.copy(position);
    group.rotation.y = heading;
    // Walk bob: the torso dips a touch with each step.
    group.position.y = speed > 0.4 ? Math.abs(Math.sin(performance.now() * 0.012)) * 0.05 : 0;

    // Third-person camera: orbit around the player at camYaw / camPitch.
    const distance = 9;
    const horizontal = Math.cos(camPitch) * distance;
    camera.position.set(
      position.x + Math.sin(camYaw) * horizontal,
      position.y + 1.6 + Math.sin(camPitch) * distance,
      position.z + Math.cos(camYaw) * horizontal,
    );
    camera.lookAt(position.x, position.y + 1.6, position.z);
  }

  return { group, position, update, get speed() { return speed; } };
}

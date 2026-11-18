// peds.js — real pedestrian system (re-record milestone 2): 48 walkers
// strolling the sidewalks beside the road grid. Each walker owns a straight
// segment along one road edge, walks it at a stroll pace, turns around at
// the ends and bobs gently with each step. `list` is exposed for the HUD
// minimap. Seeded so the crowd is the same every run.

import * as THREE from 'three';

const PED_COUNT = 48;

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

const SHIRTS = [0xe8e8e8, 0x3b7dd2, 0xd23b3b, 0x4caf50, 0xe0a83b, 0x8e44ad, 0x5b7d8c, 0x2b2e33];

export function createPedestrians(scene, city) {
  const random = mulberry32(20261119 + 13);
  const bodyGeometry = new THREE.CylinderGeometry(0.22, 0.26, 0.85, 8);
  const headGeometry = new THREE.SphereGeometry(0.16, 8, 8);
  const list = [];

  for (let i = 0; i < PED_COUNT; i++) {
    const road = city.roadLines[Math.floor(random() * city.roadLines.length)];
    // Sidewalk: just outside the road strip, on either side.
    const side = random() < 0.5 ? 1 : -1;
    const edge = road.at + side * 6.5;
    const from = road.from + 2;
    const to = road.to - 2;
    const along = from + random() * (to - from);
    const direction = random() < 0.5 ? 1 : -1;
    const speed = 0.9 + random() * 0.9;
    const phase = random() * Math.PI * 2;

    const group = new THREE.Group();
    const shirt = new THREE.Mesh(
      bodyGeometry,
      new THREE.MeshLambertMaterial({ color: SHIRTS[Math.floor(random() * SHIRTS.length)] }),
    );
    shirt.position.y = 0.62;
    const head = new THREE.Mesh(
      headGeometry,
      new THREE.MeshLambertMaterial({ color: 0xd9a066 }),
    );
    head.position.y = 1.2;
    group.add(shirt);
    group.add(head);
    scene.add(group);

    const baseHeading = road.axis === 'x' ? 0 : Math.PI / 2;
    group.rotation.y = direction > 0 ? baseHeading : baseHeading + Math.PI;

    list.push({ group, road, edge, from, to, along, direction, speed, phase, baseHeading });
  }

  function place(ped) {
    const x = ped.road.axis === 'x' ? ped.edge : ped.along;
    const z = ped.road.axis === 'z' ? ped.edge : ped.along;
    ped.group.position.set(x, 0, z);
  }

  list.forEach(place);

  function update(dt) {
    for (const ped of list) {
      ped.along += ped.direction * ped.speed * dt;
      if (ped.along > ped.to) { ped.along = ped.to; ped.direction = -1; ped.group.rotation.y = ped.baseHeading + Math.PI; }
      if (ped.along < ped.from) { ped.along = ped.from; ped.direction = 1; ped.group.rotation.y = ped.baseHeading; }
      place(ped);
      // Gentle step bob.
      ped.phase += dt * ped.speed * 6;
      ped.group.position.y = Math.abs(Math.sin(ped.phase)) * 0.04;
    }
  }

  return { list, update };
}

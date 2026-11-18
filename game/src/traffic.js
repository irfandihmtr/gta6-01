// traffic.js — real traffic system (re-record milestone 2): 24 cars driving
// the road grid. Each car owns one road line from city.roadLines, a lane
// offset (right-hand traffic) and a direction; cars wrap at the end of
// their road. Colours and speeds are seeded so the flow looks the same
// every run. `cars` is exposed for the HUD minimap.

import * as THREE from 'three';

const CAR_COUNT = 24;

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

const PALETTE = [0xd23b3b, 0x3b7dd2, 0xe8e8e8, 0x2b2e33, 0xe0a83b, 0x4caf50, 0x8e44ad, 0x5b7d8c];

export function createTraffic(scene, city) {
  const random = mulberry32(20261119 + 7);
  const bodyGeometry = new THREE.BoxGeometry(2.0, 0.7, 4.2);
  const cabinGeometry = new THREE.BoxGeometry(1.7, 0.6, 2.2);
  const cars = [];

  for (let i = 0; i < CAR_COUNT; i++) {
    const road = city.roadLines[Math.floor(random() * city.roadLines.length)];
    const direction = random() < 0.5 ? 1 : -1;
    // Right-hand lane: offset to the right of the travel direction.
    const lane = direction * 2.0;
    const along = road.from + random() * (road.to - road.from);
    const speed = 6 + random() * 6;

    const colour = PALETTE[Math.floor(random() * PALETTE.length)];
    const body = new THREE.Mesh(
      bodyGeometry, new THREE.MeshLambertMaterial({ color: colour }),
    );
    body.position.y = 0.55;
    const cabin = new THREE.Mesh(
      cabinGeometry, new THREE.MeshLambertMaterial({ color: 0x1a2027 }),
    );
    cabin.position.set(0, 1.15, -0.2);
    const group = new THREE.Group();
    group.add(body);
    group.add(cabin);
    scene.add(group);

    const heading = road.axis === 'x'
      ? (direction > 0 ? 0 : Math.PI)
      : (direction > 0 ? Math.PI / 2 : -Math.PI / 2);
    group.rotation.y = heading;

    cars.push({ group, road, lane, direction, along, speed, heading });
  }

  function place(car) {
    const x = car.road.axis === 'x' ? car.road.at + car.lane : car.along;
    const z = car.road.axis === 'z' ? car.road.at + car.lane : car.along;
    car.group.position.set(x, 0, z);
  }

  cars.forEach(place);

  function update(dt) {
    for (const car of cars) {
      car.along += car.direction * car.speed * dt;
      if (car.along > car.road.to) car.along = car.road.from;
      if (car.along < car.road.from) car.along = car.road.to;
      place(car);
    }
  }

  return { cars, update };
}

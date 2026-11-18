// main.js — boot module: builds the city, the player, traffic, pedestrians
// and HUD, then runs the single render loop. Milestone by milestone the
// systems are wired here; nothing else in the game starts a loop.

import * as THREE from 'three';
import { createCity } from './city.js';
import { createPlayer } from './player.js';
import { createTraffic } from './traffic.js';
import { createPedestrians } from './peds.js';
import { createHud } from './hud.js';

const city = createCity();
const player = createPlayer(city.scene, city);
const traffic = createTraffic(city.scene, city);
const peds = createPedestrians(city.scene, city);
const hud = createHud(city);

window.addEventListener('resize', () => {
  city.camera.aspect = window.innerWidth / window.innerHeight;
  city.camera.updateProjectionMatrix();
  city.renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let firstFrame = true;

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  player.update(dt, city.camera);
  traffic.update(dt);
  peds.update(dt);
  hud.update(dt, {
    playerPosition: player.position,
    playerSpeed: player.speed,
    cars: traffic.cars,
    peds: peds.list,
  });
  city.renderer.render(city.scene, city.camera);
  if (firstFrame) {
    firstFrame = false;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
frame();

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';

const CAMERA_PRESETS = {
  DEFAULT: {
    position: { x: 4, y: 2.4, z: 5.2 },
    target: { x: 0, y: 1.05, z: 0 },
    duration: 1.2,
  },
  CLICK_DUMMY: {
    position: { x: -2.3, y: 1.45, z: 2.1 },
    target: { x: -1.15, y: 0.9, z: 0.15 },
    duration: 1.2,
  },
  CLICK_CPU: {
    position: { x: 1.35, y: 1.45, z: 1.75 },
    target: { x: 0.4, y: 1.05, z: 0.05 },
    duration: 1.2,
  },
  CLICK_GPU: {
    position: { x: 1.85, y: 1.2, z: 1.95 },
    target: { x: 0.6, y: 0.75, z: 0.05 },
    duration: 1.2,
  },
  CLICK_RAM: {
    position: { x: 1.15, y: 1.65, z: 1.65 },
    target: { x: 0.25, y: 1.25, z: 0 },
    duration: 1.2,
  },
  CLICK_FANS: {
    position: { x: 2.2, y: 1.45, z: 1.35 },
    target: { x: 0.85, y: 1.1, z: -0.15 },
    duration: 1.2,
  },
  CLICK_CABLES: {
    position: { x: 1.8, y: 1.15, z: 2.25 },
    target: { x: 0.55, y: 0.65, z: 0.25 },
    duration: 1.2,
  },
  CLICK_CASE: {
    position: { x: 3.1, y: 2.0, z: 3.4 },
    target: { x: 0.35, y: 0.95, z: 0 },
    duration: 1.2,
  },
};

export default class Camera {
  constructor(experience) {
    this.experience = experience;
    this.sizes = experience.sizes;
    this.scene = experience.scene;
    this.canvas = experience.canvas;

    this.instance = new THREE.PerspectiveCamera(
      45,
      this.sizes.width / this.sizes.height,
      0.1,
      100
    );
    this.instance.position.set(
      CAMERA_PRESETS.DEFAULT.position.x,
      CAMERA_PRESETS.DEFAULT.position.y,
      CAMERA_PRESETS.DEFAULT.position.z
    );
    this.scene.add(this.instance);

    this.controls = new OrbitControls(this.instance, this.canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(
      CAMERA_PRESETS.DEFAULT.target.x,
      CAMERA_PRESETS.DEFAULT.target.y,
      CAMERA_PRESETS.DEFAULT.target.z
    );
    this.controls.update();

    this.activeTweens = [];

    window.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'p') {
        this.logCurrentPreset();
      }
    });
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height;
    this.instance.updateProjectionMatrix();
  }

  update() {
    this.controls.update();
  }

  moveToPreset(targetName) {
    const preset = CAMERA_PRESETS[targetName] ?? CAMERA_PRESETS.DEFAULT;

    this.activeTweens.forEach((tween) => tween.kill());
    this.activeTweens = [];
    this.controls.enabled = false;

    console.log('Camera preset:', targetName, preset);

    const duration = preset.duration ?? 1.2;
    const ease = 'power2.inOut';

    const positionTween = gsap.to(this.instance.position, {
      x: preset.position.x,
      y: preset.position.y,
      z: preset.position.z,
      duration,
      ease,
      onUpdate: () => {
        this.controls.update();
      },
    });

    const targetTween = gsap.to(this.controls.target, {
      x: preset.target.x,
      y: preset.target.y,
      z: preset.target.z,
      duration,
      ease,
      onUpdate: () => {
        this.controls.update();
      },
      onComplete: () => {
        this.controls.enabled = true;
        this.controls.update();
        this.activeTweens = [];
      },
    });

    this.activeTweens = [positionTween, targetTween];
  }

  logCurrentPreset() {
    const pose = {
      position: {
        x: Number(this.instance.position.x.toFixed(3)),
        y: Number(this.instance.position.y.toFixed(3)),
        z: Number(this.instance.position.z.toFixed(3)),
      },
      target: {
        x: Number(this.controls.target.x.toFixed(3)),
        y: Number(this.controls.target.y.toFixed(3)),
        z: Number(this.controls.target.z.toFixed(3)),
      },
      duration: 1.2,
    };

    console.log('Copy this camera preset:', pose);
  }
}

export { CAMERA_PRESETS };

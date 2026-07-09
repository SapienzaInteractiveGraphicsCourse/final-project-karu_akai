import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DESKTOP_VISUAL_CONFIG } from '../VisualConfig.js';

export default class Environment {
  constructor(experience) {
    this.scene = experience.scene;
    this.renderer = experience.renderer.instance;
    this.config = DESKTOP_VISUAL_CONFIG.environment;

    this.setBackground();
    this.setEnvironmentMap();
    this.setLights();
  }

  setBackground() {
    const background = new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}textures/background/library-background.png`
    );
    background.colorSpace = THREE.SRGBColorSpace;
    background.minFilter = THREE.LinearFilter;
    background.magFilter = THREE.LinearFilter;
    this.scene.background = background;
    this.scene.backgroundIntensity = this.config.backgroundIntensityOff;
  }

  setEnvironmentMap() {
    if (!this.renderer) return;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnvironment = new RoomEnvironment();
    const environmentTarget = pmremGenerator.fromScene(roomEnvironment, 0.04);

    this.environmentTexture = environmentTarget.texture;
    this.scene.environment = this.environmentTexture;
    this.scene.environmentIntensity = this.config.environmentIntensityOff;

    roomEnvironment.dispose();
    pmremGenerator.dispose();
  }

  setLights() {
    this.ambientLight = new THREE.AmbientLight(0xffead7, 0.008);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0xdabda5, 0x090d13, 0.012);
    this.scene.add(this.hemisphereLight);

    this.keyTarget = new THREE.Object3D();
    this.keyTarget.position.set(-7, -8, 5);
    this.scene.add(this.keyTarget);

    this.keyLight = new THREE.DirectionalLight(0xffdfbd, 0.012);
    this.keyLight.position.set(-15, 18, 26);
    this.keyLight.target = this.keyTarget;
    // The practical lamp is the only shadow-casting light. Keeping this broad
    // studio key shadowless avoids a second full-scene shadow render.
    this.keyLight.castShadow = false;
    this.scene.add(this.keyLight);

    this.coolLight = new THREE.PointLight(0x6e9caf, 0.01, 34, 2);
    this.coolLight.position.set(-20, 1.5, 8);
    this.scene.add(this.coolLight);

    this.warmLight = new THREE.PointLight(0xffb574, 0.008, 30, 2);
    this.warmLight.position.set(12, -2.5, 4);
    this.scene.add(this.warmLight);
  }

  setPowerAmount(amount) {
    const power = THREE.MathUtils.clamp(amount, 0, 1);
    this.ambientLight.intensity = THREE.MathUtils.lerp(0.008, 0.032, power);
    this.hemisphereLight.intensity = THREE.MathUtils.lerp(0.012, 0.075, power);
    this.keyLight.intensity = THREE.MathUtils.lerp(0.012, 0.26, power);
    this.coolLight.intensity = THREE.MathUtils.lerp(0.01, 0.2, power);
    this.warmLight.intensity = THREE.MathUtils.lerp(0.008, 0.11, power);
    this.scene.environmentIntensity = THREE.MathUtils.lerp(
      Math.max(this.config.environmentIntensityOff, 0.18),
      this.config.environmentIntensityOn,
      power
    );
    this.scene.backgroundIntensity = THREE.MathUtils.lerp(
      Math.max(this.config.backgroundIntensityOff, 0.38),
      this.config.backgroundIntensityOn,
      power
    );
  }
}

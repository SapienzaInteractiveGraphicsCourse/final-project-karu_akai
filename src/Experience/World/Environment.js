import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DESKTOP_VISUAL_CONFIG } from '../VisualConfig.js';

const BACKGROUND_TEXTURE_PATH =
  'textures_optimized/background/library_background.png';

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
      `${import.meta.env.BASE_URL}${BACKGROUND_TEXTURE_PATH}`
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

    this.hemisphereLight = new THREE.HemisphereLight(
      0xdabda5,
      0x090d13,
      0.012
    );
    this.scene.add(this.hemisphereLight);

    this.keyTarget = new THREE.Object3D();
    this.keyTarget.position.set(-7, -8, 5);
    this.scene.add(this.keyTarget);

    this.keyLight = new THREE.DirectionalLight(0xffdfbd, 0.012);
    this.keyLight.position.set(-15, 18, 26);
    this.keyLight.target = this.keyTarget;
    // This broad key only preserves readability. Local practical lights provide
    // the visible modelling and shadows.
    this.keyLight.castShadow = false;
    this.scene.add(this.keyLight);

    this.coolLight = new THREE.PointLight(0x6e9caf, 0.004, 34, 2);
    this.coolLight.position.set(-20, 1.5, 8);
    this.coolLight.castShadow = false;
    this.scene.add(this.coolLight);

    this.warmLight = new THREE.PointLight(0xffb574, 0.008, 30, 2);
    this.warmLight.position.set(12, -2.5, 4);
    this.warmLight.castShadow = false;
    this.scene.add(this.warmLight);

    this.practicalLights = (this.config.practicalLights ?? []).map((config) => {
      const light = new THREE.PointLight(
        config.color,
        config.intensityOff,
        config.distance,
        config.decay
      );
      light.name = config.name;
      light.position.fromArray(config.position);
      light.castShadow = false;
      this.scene.add(light);
      return { light, config };
    });

    const fanAccent = this.config.fanAccent;
    this.fanAccentLight = fanAccent
      ? new THREE.PointLight(
          fanAccent.color,
          fanAccent.intensityOff,
          fanAccent.distance,
          fanAccent.decay
        )
      : null;

    if (this.fanAccentLight) {
      this.fanAccentLight.name = 'CaseFanLedAccentLight';
      this.fanAccentLight.position.fromArray(fanAccent.position);
      this.fanAccentLight.castShadow = false;
      this.scene.add(this.fanAccentLight);
    }
  }

  setPowerAmount(amount) {
    const power = THREE.MathUtils.clamp(amount, 0, 1);
    this.ambientLight.intensity = THREE.MathUtils.lerp(0.008, 0.024, power);
    this.hemisphereLight.intensity = THREE.MathUtils.lerp(0.012, 0.05, power);
    this.keyLight.intensity = THREE.MathUtils.lerp(0.012, 0.09, power);
    this.coolLight.intensity = THREE.MathUtils.lerp(0.004, 0.018, power);
    this.warmLight.intensity = THREE.MathUtils.lerp(0.008, 0.075, power);

    this.practicalLights?.forEach(({ light, config }) => {
      light.intensity = THREE.MathUtils.lerp(
        config.intensityOff,
        config.intensityOn,
        power
      );
    });

    if (this.fanAccentLight && this.config.fanAccent) {
      this.fanAccentLight.intensity = THREE.MathUtils.lerp(
        this.config.fanAccent.intensityOff,
        this.config.fanAccent.intensityOn,
        power
      );
    }

    this.scene.environmentIntensity = THREE.MathUtils.lerp(
      this.config.environmentIntensityOff,
      this.config.environmentIntensityOn,
      power
    );
    this.scene.backgroundIntensity = THREE.MathUtils.lerp(
      this.config.backgroundIntensityOff,
      this.config.backgroundIntensityOn,
      power
    );
  }
}

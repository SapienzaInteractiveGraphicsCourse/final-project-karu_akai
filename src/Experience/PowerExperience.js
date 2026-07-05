import * as THREE from 'three';

const POWERED_LAMP_INTENSITY = 24;
const TRANSITION_SPEED = 3.4;
const LAMP_NAME_PATTERN = /(lampada|lampadina|lamp|bulb|shade)/i;

/** Coordinates the first, deliberately simple, power-on interaction. */
export default class PowerExperience {
  constructor({ scene, model, environment, clickTargets, ledController }) {
    this.scene = scene;
    this.model = model;
    this.environment = environment;
    this.clickTargets = clickTargets;
    this.ledController = ledController;
    this.poweredOn = false;
    this.powerAmount = 0;

    this.chainTarget = model?.getObjectByName('CLICK_CHAIN') ?? null;
    this.lampRoot = this.findLampRoot();
    this.lampMaterials = this.collectLampMaterials();
    this.lampLight = this.createLampLight();

    this.registerLampClickFallback();
    this.applyPowerAmount(0);

    if (!this.chainTarget || !this.lampRoot) {
      this.logRelevantMeshNames();
    }
  }

  findLampRoot() {
    const preferredNames = ['LAMPADA DA TAVOLO_3', 'LAMPADINA_4'];
    for (const name of preferredNames) {
      const object = this.model?.getObjectByName(name);
      if (object) return object;
    }

    let match = null;
    this.model?.traverse((object) => {
      if (!match && LAMP_NAME_PATTERN.test(object.name ?? '')) match = object;
    });
    return match;
  }

  collectLampMaterials() {
    const materials = new Set();
    const bulb = this.model?.getObjectByName('LAMPADINA_4') ?? this.lampRoot;
    bulb?.traverse((object) => {
      if (!object.isMesh) return;
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      objectMaterials.forEach((material) => {
        if (material?.emissive) materials.add(material);
      });
    });
    return [...materials];
  }

  createLampLight() {
    const light = new THREE.PointLight(0xffb968, 0, 34, 1.8);
    light.name = 'LampPowerWarmLight';
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.0005;

    const bulb = this.model?.getObjectByName('LAMPADINA_4') ?? this.lampRoot;
    this.model?.updateWorldMatrix(true, true);
    bulb?.getWorldPosition(light.position);
    this.scene.add(light);
    return light;
  }

  registerLampClickFallback() {
    if (!this.lampRoot) return;

    this.lampRoot.userData.isClickTarget = true;
    this.lampRoot.userData.isPowerTarget = true;
    this.lampRoot.traverse((object) => object.layers.enable(1));

    if (!this.clickTargets.includes(this.lampRoot)) {
      this.clickTargets.push(this.lampRoot);
    }
    if (this.chainTarget) this.chainTarget.userData.isPowerTarget = true;
  }

  isPowerTarget(object) {
    let current = object;
    while (current) {
      if (current.userData.isPowerTarget) return true;
      current = current.parent;
    }
    return false;
  }

  handleClick(object) {
    if (!this.isPowerTarget(object)) return false;
    this.setPoweredOn(!this.poweredOn);
    return true;
  }

  setPoweredOn(poweredOn) {
    this.poweredOn = Boolean(poweredOn);
    this.ledController?.setEnabled(true);
  }

  update(delta) {
    const deltaSeconds = Math.min(delta, 100) / 1000;
    const target = this.poweredOn ? 1 : 0;
    const alpha = 1 - Math.exp(-TRANSITION_SPEED * deltaSeconds);
    this.powerAmount = THREE.MathUtils.lerp(this.powerAmount, target, alpha);
    if (Math.abs(this.powerAmount - target) < 0.001) this.powerAmount = target;
    this.applyPowerAmount(this.powerAmount);
  }

  applyPowerAmount(amount) {
    this.lampLight.intensity = POWERED_LAMP_INTENSITY * amount;
    this.ledController?.setIntensityScale(amount);

    this.lampMaterials.forEach((material) => {
      material.emissive.set(0xffc477);
      material.emissiveIntensity = 1.8 * amount;
    });

    this.environment?.setPowerAmount(amount);
  }

  logRelevantMeshNames() {
    const names = [];
    this.model?.traverse((object) => {
      if (object.isMesh && /(lamp|chain|case|led)/i.test(object.name ?? '')) {
        names.push(object.name);
      }
    });
    console.warn('[PowerExperience] Lamp/chain/case mesh names:', names);
  }
}

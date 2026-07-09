import * as THREE from 'three';
import { DESKTOP_VISUAL_CONFIG } from './VisualConfig.js';

// ExtraLight owns the shaped lamp rig; this is only a restrained local fill.
const POWERED_LAMP_INTENSITY = 4;
const LAMP_NAME_PATTERN = /(lampada|lampadina|lamp|bulb|shade)/i;
const CPU_RING_OFF = new THREE.Color(0x06120f);
const CPU_RING_ON = new THREE.Color(0xcbb48e);
const CPU_EMISSIVE_ON = new THREE.Color(0xb98b58);
const CPU_LABEL_ON = new THREE.Color(0x72d8bd);
const CPU_LABEL_EMISSIVE_ON = new THREE.Color(0x2f8f79);

/** Coordinates the first, deliberately simple, power-on interaction. */
export default class PowerExperience {
  constructor({
    scene,
    model,
    environment,
    renderer,
    ledController,
    cpuCore,
    cpuCentralLightRing,
    cpuCentralLightRingMeshes = [],
    fanAnimator,
  }) {
    this.scene = scene;
    this.model = model;
    this.environment = environment;
    this.renderer = renderer;
    this.ledController = ledController;
    this.cpuCore = cpuCore;
    this.cpuCentralLightRing = cpuCentralLightRing;
    this.cpuCentralLightRingMeshes = Array.isArray(cpuCentralLightRingMeshes)
      ? cpuCentralLightRingMeshes
      : [];
    this.fanAnimator = fanAnimator;
    this.poweredOn = false;
    this.hasUserInteracted = false;
    this.powerAmount = 0;
    this.transitionStartAmount = 0;
    this.transitionElapsed = 0;
    this.transitionDuration = DESKTOP_VISUAL_CONFIG.intro.transitionDuration;
    this.caseLighting = DESKTOP_VISUAL_CONFIG.caseLighting;

    this.chainTarget = model?.getObjectByName('CLICK_CHAIN') ?? null;
    this.lampRoot = this.findLampRoot();
    this.lampMaterials = this.collectLampMaterials();
    this.lampLight = this.createLampLight();

    if (this.chainTarget) this.chainTarget.userData.isPowerTarget = true;
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
    const light = new THREE.PointLight(0xffb968, 0, 14, 2);
    light.name = 'LampPowerWarmLight';
    light.castShadow = false;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.bias = -0.0005;

    const bulb = this.model?.getObjectByName('LAMPADINA_4') ?? this.lampRoot;
    this.model?.updateWorldMatrix(true, true);
    bulb?.getWorldPosition(light.position);
    this.scene.add(light);
    return light;
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
    this.hasUserInteracted = true;
    this.setPoweredOn(!this.poweredOn);
    return true;
  }

  setPoweredOn(poweredOn) {
    const nextState = Boolean(poweredOn);
    if (nextState === this.poweredOn && this.transitionElapsed > 0) return;

    this.poweredOn = nextState;
    this.transitionStartAmount = this.powerAmount;
    this.transitionElapsed = 0;
    this.ledController?.setEnabled(true);
    this.fanAnimator?.setEnabled(this.poweredOn);
    this.redrawCpuSbcLabel();
  }

  update(deltaMilliseconds) {
    const seconds = Math.min(deltaMilliseconds ?? 0, 100) / 1000;
    const target = this.poweredOn ? 1 : 0;

    if (this.powerAmount !== target) {
      this.transitionElapsed += seconds;
      const progress = THREE.MathUtils.clamp(
        this.transitionElapsed / this.transitionDuration,
        0,
        1
      );
      const easedProgress = progress * progress * (3 - 2 * progress);
      this.powerAmount = THREE.MathUtils.lerp(
        this.transitionStartAmount,
        target,
        easedProgress
      );
      if (progress >= 1) this.powerAmount = target;
    }

    this.applyPowerAmount(this.powerAmount);
  }

  applyPowerAmount(amount) {
    const power = THREE.MathUtils.clamp(amount, 0, 1);
    const caseIntensity = THREE.MathUtils.lerp(
      this.caseLighting.intensityOff,
      this.caseLighting.intensityOn,
      power
    );

    this.ledController?.setIntensityScale(caseIntensity);
    this.lampLight.intensity = POWERED_LAMP_INTENSITY * power;
    this.lampMaterials.forEach((material) => {
      material.emissive.set(0xffc477);
      material.emissiveIntensity = 1.05 * power;
    });

    this.environment?.setPowerAmount(power);
    this.renderer?.setPowerAmount(power);

    if (this.cpuCentralLightRing) {
      this.cpuCentralLightRing.visible = power > 0.01;
      const ringMeshes = this.cpuCentralLightRingMeshes.length
        ? this.cpuCentralLightRingMeshes
        : this.cpuCentralLightRing.isMesh
          ? [this.cpuCentralLightRing]
          : [];

      ringMeshes.forEach((mesh) => {
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        materials.forEach((material) => {
          if (!material?.isMaterial) return;
          material.color
            ?.set(0x06120f)
            .lerp(CPU_RING_ON, power);
          material.emissive
            ?.set(0x06120f)
            .lerp(CPU_EMISSIVE_ON, power);
          material.emissiveIntensity = 1.5 * power;
        });
      });
    }

    this.updateCpuMaterials(power);
  }

  redrawCpuSbcLabel() {
    const context = this.cpuCore?.labelContext;
    const texture = this.cpuCore?.labelTexture;
    const canvas = context?.canvas;
    if (!context || !canvas || !texture) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = this.poweredOn ? '#72d8bd' : '#06120f';
    context.font = '600 132px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('SBC', canvas.width / 2, canvas.height / 2);
    texture.needsUpdate = true;
  }

  updateCpuMaterials(amount = this.powerAmount) {
    const power = THREE.MathUtils.clamp(amount, 0, 1);
    const labelMaterial = this.cpuCore?.label?.material;
    const ringMaterial = this.cpuCore?.ring?.material;

    if (labelMaterial) {
      labelMaterial.color.copy(CPU_RING_OFF).lerp(CPU_LABEL_ON, power);
      labelMaterial.emissive.set(0x000000).lerp(CPU_LABEL_EMISSIVE_ON, power);
      labelMaterial.emissiveIntensity = 0.1 * power;
      labelMaterial.opacity = THREE.MathUtils.lerp(0.08, 0.72, power);
    }

    if (ringMaterial) {
      ringMaterial.color.set(0x0b1f1a).lerp(CPU_RING_ON, power);
      ringMaterial.emissive.copy(CPU_RING_OFF).lerp(CPU_EMISSIVE_ON, power);
      ringMaterial.emissiveIntensity = THREE.MathUtils.lerp(0.015, 0.32, power);
    }
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

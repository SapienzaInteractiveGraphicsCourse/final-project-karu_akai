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
    this.isTransitioning = false;
    this.callbacks = {
      transitionComplete: [],
    };
    this.caseLighting = DESKTOP_VISUAL_CONFIG.caseLighting;
    this.caseLedSpill = this.caseLighting.ledSpill;

    this.chainTarget = model?.getObjectByName('CLICK_CHAIN') ?? null;
    this.lampRoot = this.findLampRoot();
    this.lampMaterials = this.collectLampMaterials();
    this.lampLight = this.createLampLight();
    this.createCaseLedSpillLights();

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

  findTableRoot() {
    const preferredNames = ['Table', 'table', 'Tavolo', 'tavolo'];
    for (const name of preferredNames) {
      const object = this.model?.getObjectByName(name);
      if (object) return object;
    }

    let match = null;
    this.model?.traverse((object) => {
      if (
        !match &&
        /(^table$|round[_\s-]*wooden[_\s-]*table|tavolo)/i.test(
          object.name ?? ''
        )
      ) {
        match = object;
      }
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

  isDescendantOf(object, ancestor) {
    if (!object || !ancestor) return false;

    let current = object;
    while (current) {
      if (current === ancestor) return true;
      current = current.parent;
    }
    return false;
  }

  hasNamedAncestor(object, pattern) {
    let current = object;
    while (current) {
      if (pattern.test(current.name ?? '')) return true;
      current = current.parent;
    }
    return false;
  }

  computeCaseBounds({ dummyRoot, tableRoot }) {
    const bounds = new THREE.Box3();
    let hasBounds = false;

    this.model?.updateWorldMatrix(true, true);
    this.model?.traverse((object) => {
      if (
        !object.isMesh ||
        object.name?.startsWith('CLICK_') ||
        this.isDescendantOf(object, dummyRoot) ||
        this.isDescendantOf(object, tableRoot) ||
        this.hasNamedAncestor(object, LAMP_NAME_PATTERN) ||
        /(plant|leaf|trunk|sketchfab|komish)/i.test(object.name ?? '')
      ) {
        return;
      }

      const geometry = object.geometry;
      if (!geometry) return;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      if (!geometry.boundingBox) return;

      const objectBounds = geometry.boundingBox
        .clone()
        .applyMatrix4(object.matrixWorld);
      if (objectBounds.isEmpty()) return;

      if (!hasBounds) {
        bounds.copy(objectBounds);
        hasBounds = true;
      } else {
        bounds.union(objectBounds);
      }
    });

    return hasBounds ? bounds : null;
  }

  createCaseLedSpillLights() {
    const config = this.caseLedSpill;
    const dummyRoot = this.model?.getObjectByName('Dummy_root') ?? null;
    const tableRoot = this.findTableRoot();

    this.model?.updateWorldMatrix(true, true);

    const caseBounds = this.computeCaseBounds({ dummyRoot, tableRoot });
    const dummyBounds = dummyRoot
      ? new THREE.Box3().setFromObject(dummyRoot)
      : null;
    const tableBounds = tableRoot
      ? new THREE.Box3().setFromObject(tableRoot)
      : null;

    const fillPosition = new THREE.Vector3().fromArray(
      config.fallback.fillPosition
    );
    const spotPosition = new THREE.Vector3().fromArray(
      config.fallback.spotPosition
    );
    const targetPosition = new THREE.Vector3().fromArray(
      config.fallback.target
    );
    let spotDistance = config.fallback.distance;

    if (caseBounds && !caseBounds.isEmpty()) {
      const caseCenter = caseBounds.getCenter(new THREE.Vector3());
      const caseSize = caseBounds.getSize(new THREE.Vector3());

      fillPosition.set(
        caseCenter.x,
        caseCenter.y + caseSize.y * config.fill.verticalFactor,
        caseBounds.max.z + config.fill.frontOffset
      );

      spotPosition.set(
        caseBounds.min.x - config.spot.sideOffset,
        caseCenter.y + caseSize.y * config.spot.heightFactor,
        caseBounds.max.z + config.spot.frontOffset
      );
    }

    if (dummyBounds && !dummyBounds.isEmpty()) {
      const dummyCenter = dummyBounds.getCenter(new THREE.Vector3());
      const dummySize = dummyBounds.getSize(new THREE.Vector3());
      targetPosition.copy(dummyCenter);

      if (tableBounds && !tableBounds.isEmpty()) {
        targetPosition.y =
          tableBounds.max.y + Math.max(dummySize.y * 0.48, 0.6);
      }

      spotDistance =
        spotPosition.distanceTo(targetPosition) +
        config.spot.distancePadding;
    }

    this.caseLedFillLight = new THREE.PointLight(
      config.color,
      0,
      config.fill.distance,
      config.fill.decay
    );
    this.caseLedFillLight.name = 'CaseLedInteriorFillLight';
    this.caseLedFillLight.position.copy(fillPosition);
    this.caseLedFillLight.castShadow = false;

    this.caseLedSpillTarget = new THREE.Object3D();
    this.caseLedSpillTarget.name = 'CaseLedSpillTarget';
    this.caseLedSpillTarget.position.copy(targetPosition);

    this.caseLedSpillLight = new THREE.SpotLight(
      config.color,
      0,
      spotDistance,
      config.spot.angle,
      config.spot.penumbra,
      config.spot.decay
    );
    this.caseLedSpillLight.name = 'CaseLedSpillLight';
    this.caseLedSpillLight.position.copy(spotPosition);
    this.caseLedSpillLight.target = this.caseLedSpillTarget;
    this.caseLedSpillLight.castShadow = true;

    const shadow = config.spot.shadow;
    this.caseLedSpillLight.shadow.mapSize.set(
      shadow.mapSize,
      shadow.mapSize
    );
    this.caseLedSpillLight.shadow.bias = shadow.bias;
    this.caseLedSpillLight.shadow.normalBias = shadow.normalBias;
    this.caseLedSpillLight.shadow.radius = shadow.radius;
    this.caseLedSpillLight.shadow.camera.near = shadow.near;
    this.caseLedSpillLight.shadow.camera.far = spotDistance;
    this.caseLedSpillLight.shadow.focus = 1;

    this.scene.add(
      this.caseLedFillLight,
      this.caseLedSpillTarget,
      this.caseLedSpillLight
    );
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

  on(eventName, callback) {
    if (!this.callbacks[eventName]) return () => {};

    this.callbacks[eventName].push(callback);
    return () => {
      this.callbacks[eventName] = this.callbacks[eventName].filter(
        (registeredCallback) => registeredCallback !== callback
      );
    };
  }

  trigger(eventName, payload) {
    this.callbacks[eventName]?.forEach((callback) => callback(payload));
  }

  setPoweredOn(poweredOn) {
    const nextState = Boolean(poweredOn);
    if (nextState === this.poweredOn && this.transitionElapsed > 0) return;

    this.poweredOn = nextState;
    this.transitionStartAmount = this.powerAmount;
    this.transitionElapsed = 0;
    this.isTransitioning = this.powerAmount !== (this.poweredOn ? 1 : 0);
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
      if (progress >= 1) {
        this.powerAmount = target;
        if (this.isTransitioning) {
          this.isTransitioning = false;
          this.trigger('transitionComplete', {
            poweredOn: this.poweredOn,
          });
        }
      }
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
    this.updateCaseLedSpillLights(power);
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

  updateCaseLedSpillLights(powerAmount) {
    if (this.caseLedFillLight) {
      this.caseLedFillLight.intensity =
        this.caseLedSpill.fill.maximumIntensity * powerAmount;
    }

    if (this.caseLedSpillLight) {
      this.caseLedSpillLight.intensity =
        this.caseLedSpill.spot.maximumIntensity * powerAmount;
    }
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

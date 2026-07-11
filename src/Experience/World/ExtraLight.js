import * as THREE from 'three';
import { DESKTOP_VISUAL_CONFIG } from '../../Experience/VisualConfig.js';

const TABLE_SURFACE_FALLBACK_Y = -15.06;

const LAMP_CONFIG = DESKTOP_VISUAL_CONFIG.lamp ?? {};

const DEFAULTS = Object.freeze({
  color: 0xffc47a,
  shadeEmissiveColor: 0xffc27a,
  shadeEmissiveIntensity: 0.46,
  coreGlowColor: 0xffbd6a,
  coreGlowOpacity: 0.34,
  coreGlowRadius: 0.085,
  positionOffset: new THREE.Vector3(0, -0.035, 0),
  spotPositionOffset: new THREE.Vector3(0, -0.12, 0),
  fillOffset: new THREE.Vector3(-0.12, 0.02, 0.32),
  leftShadeOffset: new THREE.Vector3(-0.3, 0.02, 0.55),
  targetOffset: new THREE.Vector3(0, 0, 0),
  tableSurfaceOffset: 0.04,
  poolPositionOffset: new THREE.Vector3(0, 0, 0),
  poolSurfaceOffset: 0.02,
  poolSize: 5,
  poolOpacity: 0.3,
  poolColor: 0xffb86b,
  pointIntensity: 12,
  pointDistance: 6,
  fillIntensity: 3.2,
  fillDistance: 7,
  leftShadeIntensity: 7,
  leftShadeDistance: 3.2,
  spotIntensity: 26,
  spotDistance: 5,
  spotAngle: Math.PI * 0.44,
  spotPenumbra: 0.96,
  areaIntensity: 7,
  areaWidth: 1.15,
  areaHeight: 0.8,
  decay: 2,
  transitionSpeed: 3.2,
  // shadow tuning picked from visual config defaults if available
  shadowMapSize: LAMP_CONFIG.shadowMapSize ?? 1024,
  shadowBias: LAMP_CONFIG.shadowBias ?? -0.00018,
  shadowNormalBias: LAMP_CONFIG.shadowNormalBias ?? 0.035,
});

/** Adds a warm secondary light rig without owning the scene's power state. */
export default class ExtraLight {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = { ...DEFAULTS, ...options };
    this.amount = 0;
    this.targetAmount = 0;

    this.shade =
      this.scene.getObjectByName('object_8') ??
      this.scene.getObjectByName('Object_8') ??
      null;
    this.originalShadeMaterial = this.shade?.material ?? null;
    this.shadeMaterials = this.cloneShadeMaterials();

    const anchor = this.shade ?? this.options.lamp ?? null;
    const position = new THREE.Vector3();
    anchor?.updateWorldMatrix(true, false);
    const shadeBounds = this.shade
      ? new THREE.Box3().setFromObject(this.shade)
      : null;
    if (shadeBounds && !shadeBounds.isEmpty()) {
      shadeBounds.getCenter(position);
    } else {
      anchor?.getWorldPosition(position);
    }
    position.add(this.options.positionOffset);
    this.tableSurfaceY = this.getTableSurfaceY();

    this.coreGlowMaterial = new THREE.MeshBasicMaterial({
      color: this.options.coreGlowColor,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.coreGlow = new THREE.Mesh(
      new THREE.SphereGeometry(this.options.coreGlowRadius, 16, 10),
      this.coreGlowMaterial
    );
    this.coreGlow.name = 'ExtraLampCoreGlow';
    this.coreGlow.position.copy(position);
    this.coreGlow.castShadow = false;
    this.coreGlow.receiveShadow = false;

    this.pointLight = new THREE.PointLight(
      this.options.color,
      0,
      this.options.pointDistance,
      this.options.decay
    );
    this.pointLight.name = 'ExtraLampInnerLight';
    this.pointLight.position.copy(position);
    this.pointLight.castShadow = false; // inner fill should remain shadowless

    this.fillLight = new THREE.PointLight(
      this.options.color,
      0,
      this.options.fillDistance,
      this.options.decay
    );
    this.fillLight.name = 'ExtraLampWarmFill';
    this.fillLight.position.copy(position).add(this.options.fillOffset);
    this.fillLight.castShadow = false;

    // A small, shadowless fill on the inner-left side prevents the shade from
    // reading as a hard black band while preserving its fabric modelling.
    this.leftShadeLight = new THREE.PointLight(
      this.options.color,
      0,
      this.options.leftShadeDistance,
      this.options.decay
    );
    this.leftShadeLight.name = 'ExtraLampLeftShadeFill';
    this.leftShadeLight.position
      .copy(position)
      .add(this.options.leftShadeOffset);
    this.leftShadeLight.castShadow = false;

    this.spotTarget = new THREE.Object3D();
    this.spotTarget.name = 'ExtraLampTableTarget';
    this.spotTarget.position
      .copy(position)
      .setY(this.tableSurfaceY + this.options.tableSurfaceOffset)
      .add(this.options.targetOffset);

    this.poolTexture = this.createTableLightTexture();
    this.poolMaterial = new THREE.MeshBasicMaterial({
      map: this.poolTexture,
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.lightPool = new THREE.Mesh(
      new THREE.PlaneGeometry(this.options.poolSize, this.options.poolSize),
      this.poolMaterial
    );
    this.lightPool.name = 'ExtraLampTableLightPool';
    this.lightPool.rotation.x = -Math.PI * 1.5;
    this.lightPool.position
      .copy(position)
      .setY(this.tableSurfaceY + this.options.poolSurfaceOffset)
      .add(this.options.poolPositionOffset);
    this.lightPool.castShadow = false;
    this.lightPool.receiveShadow = false;

    this.spotLight = new THREE.SpotLight(
      this.options.color,
      0,
      this.options.spotDistance,
      this.options.spotAngle,
      this.options.spotPenumbra,
      this.options.decay
    );
    this.spotLight.name = 'ExtraLampTableLight';
    this.spotLight.position
      .copy(position)
      .add(this.options.spotPositionOffset);
    this.spotLight.target = this.spotTarget;
    // The practical desk lamp is the primary shadow-casting light.
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.set(
      this.options.shadowMapSize,
      this.options.shadowMapSize
    );
    this.spotLight.shadow.bias = this.options.shadowBias;
    this.spotLight.shadow.normalBias = this.options.shadowNormalBias;

    this.sceneSpillConfig = {
      enabled: false,
      color: this.options.color,
      intensity: 0,
      angle: 0.75,
      penumbra: 0.95,
      distancePadding: 3,
      targetCaseBlend: 0.45,
      targetHeightAboveTable: 2.5,
      decay: 2,
      ...(LAMP_CONFIG.sceneSpill ?? {}),
      ...(this.options.sceneSpill ?? {}),
    };
    this.sceneSpillTarget = null;
    this.sceneSpillLight = null;

    if (this.sceneSpillConfig.enabled && anchor) {
      const sceneSpillTargetPosition = this.getSceneSpillTargetPosition(
        this.sceneSpillConfig
      );

      if (sceneSpillTargetPosition) {
        const sceneSpillSourcePosition = this.spotLight.position.clone();
        const sceneSpillDistance =
          sceneSpillSourcePosition.distanceTo(sceneSpillTargetPosition) +
          Math.max(0, this.sceneSpillConfig.distancePadding);

        if (Number.isFinite(sceneSpillDistance) && sceneSpillDistance > 0) {
          const sceneSpillTarget = new THREE.Object3D();
          sceneSpillTarget.name = 'ExtraLampSceneSpillTarget';
          sceneSpillTarget.position.copy(sceneSpillTargetPosition);

          const sceneSpillLight = new THREE.SpotLight(
            this.sceneSpillConfig.color,
            0,
            sceneSpillDistance,
            this.sceneSpillConfig.angle,
            this.sceneSpillConfig.penumbra,
            this.sceneSpillConfig.decay
          );
          sceneSpillLight.name = 'ExtraLampSceneSpill';
          sceneSpillLight.position.copy(sceneSpillSourcePosition);
          sceneSpillLight.target = sceneSpillTarget;
          sceneSpillLight.castShadow = false;

          this.sceneSpillTarget = sceneSpillTarget;
          this.sceneSpillLight = sceneSpillLight;
        }
      }
    }

    // Tighten the shadow camera to the useful range of the lamp
    const fov = THREE.MathUtils.radToDeg(this.options.spotAngle * 2);
    if (this.spotLight.shadow.camera) {
      this.spotLight.shadow.camera.fov = Math.max(10, fov);
      this.spotLight.shadow.camera.near = 0.05;
      this.spotLight.shadow.camera.far = Math.max(4, this.options.spotDistance + 1);
      this.spotLight.shadow.camera.updateProjectionMatrix();
    }

    // Broad, shadowless diffusion under the shade fills the hard ring left by
    // the lamp geometry without flattening the rest of the table.
    this.areaLight = new THREE.RectAreaLight(
      this.options.color,
      0,
      this.options.areaWidth,
      this.options.areaHeight
    );
    this.areaLight.name = 'ExtraLampTableAreaLight';
    this.areaLight.position
      .copy(position)
      .add(this.options.spotPositionOffset);
    this.areaLight.castShadow = false;
    this.areaLight.lookAt(this.spotTarget.position);

    this.scene.add(
      this.coreGlow,
      this.pointLight,
      this.fillLight,
      this.leftShadeLight,
      this.lightPool,
      this.spotTarget,
      this.spotLight,
      this.areaLight
    );

    if (this.sceneSpillTarget && this.sceneSpillLight) {
      this.scene.add(this.sceneSpillTarget, this.sceneSpillLight);
    }

    // Ensure the lampshade and bulb do not cast blocking shadows
    try {
      if (this.shade) {
        this.shade.traverse((o) => {
          if (o.isMesh) o.castShadow = false;
        });
      }
      if (this.options.lamp) {
        this.options.lamp.traverse((o) => {
          if (o.isMesh) o.castShadow = false;
        });
      }
    } catch (e) {
      // ignore
    }

    // Ensure table receives shadows
    const table = this.findTableObject();
    if (table) {
      table.traverse((o) => {
        if (o.isMesh) o.receiveShadow = true;
      });
    }

  }

  setPoweredOn(isOn) {
    this.targetAmount = isOn ? 1 : 0;
  }

  createTableLightTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const color = new THREE.Color(this.options.poolColor);
    const srgbHex = color.getHex(THREE.SRGBColorSpace);
    const red = (srgbHex >> 16) & 255;
    const green = (srgbHex >> 8) & 255;
    const blue = srgbHex & 255;
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);

    gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, 0.9)`);
    gradient.addColorStop(0.38, `rgba(${red}, ${green}, ${blue}, 0.48)`);
    gradient.addColorStop(0.72, `rgba(${red}, ${green}, ${blue}, 0.14)`);
    gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }

  getTableSurfaceY() {
    const preferredNames = ['Table', 'table', 'Tavolo', 'tavolo'];
    let table = null;

    for (const name of preferredNames) {
      table = this.scene.getObjectByName(name);
      if (table) break;
    }

    if (!table) {
      this.scene.traverse((object) => {
        if (
          !table &&
          /(^table$|round[_\s-]*wooden[_\s-]*table|tavolo)/i.test(
            object.name ?? ''
          )
        ) {
          table = object;
        }
      });
    }

    if (!table) {
      return TABLE_SURFACE_FALLBACK_Y;
    }

    table.updateWorldMatrix(true, true);
    const bounds = new THREE.Box3().setFromObject(table);
    const surfaceY = bounds.isEmpty()
      ? TABLE_SURFACE_FALLBACK_Y
      : bounds.max.y;
    return surfaceY;
  }

  findTableObject() {
    const preferredNames = ['Table', 'table', 'Tavolo', 'tavolo'];
    let table = null;

    for (const name of preferredNames) {
      table = this.scene.getObjectByName(name);
      if (table) break;
    }

    if (!table) {
      this.scene.traverse((object) => {
        if (
          !table &&
          /(^table$|round[_\s-]*wooden[_\s-]*table|tavolo)/i.test(
            object.name ?? ''
          )
        ) {
          table = object;
        }
      });
    }

    return table;
  }

  getSceneSpillTargetPosition(config) {
    const dummyRoot = this.scene.getObjectByName('Dummy_root');
    const caseAnchor =
      this.scene.getObjectByName('Case_exerior') ??
      this.scene.getObjectByName('Case_exterior') ??
      this.scene.getObjectByName('case_exerior') ??
      this.scene.getObjectByName('case_exterior');
    const tableRoot = this.findTableObject();

    if (!dummyRoot || !caseAnchor || !tableRoot) return null;

    dummyRoot.updateWorldMatrix(true, true);
    caseAnchor.updateWorldMatrix(true, true);
    tableRoot.updateWorldMatrix(true, true);

    const dummyBounds = new THREE.Box3().setFromObject(dummyRoot);
    const caseBounds = new THREE.Box3().setFromObject(caseAnchor);
    const tableBounds = new THREE.Box3().setFromObject(tableRoot);

    if (
      dummyBounds.isEmpty() ||
      caseBounds.isEmpty() ||
      tableBounds.isEmpty()
    ) {
      return null;
    }

    const dummyCenter = dummyBounds.getCenter(new THREE.Vector3());
    const targetHeightAboveTable = Math.max(
      0.01,
      config.targetHeightAboveTable
    );
    const closestCasePoint = caseBounds.clampPoint(
      dummyCenter,
      new THREE.Vector3()
    );
    const target = dummyCenter.clone().lerp(
      closestCasePoint,
      THREE.MathUtils.clamp(config.targetCaseBlend, 0, 1)
    );
    target.y = THREE.MathUtils.clamp(
      Math.max(
        target.y,
        tableBounds.max.y + targetHeightAboveTable
      ),
      tableBounds.max.y + 0.01,
      dummyCenter.y
    );

    return [target.x, target.y, target.z].every(Number.isFinite)
      ? target
      : null;
  }

  cloneShadeMaterials() {
    if (!this.shade?.material) return [];

    const sourceMaterials = Array.isArray(this.shade.material)
      ? this.shade.material
      : [this.shade.material];
    const clonedMaterials = sourceMaterials.map((material) => {
      const clone = material.clone();
      clone.emissive?.set(this.options.shadeEmissiveColor);
      clone.emissiveIntensity = 0;
      clone.side = THREE.DoubleSide;
      clone.needsUpdate = true;
      return clone;
    });

    this.shade.material = Array.isArray(this.shade.material)
      ? clonedMaterials
      : clonedMaterials[0];
    return clonedMaterials;
  }

  update(delta) {
    const seconds = Math.min(delta ?? 0, 100) / 1000;
    const alpha = 1 - Math.exp(-this.options.transitionSpeed * seconds);
    this.amount = THREE.MathUtils.lerp(this.amount, this.targetAmount, alpha);
    if (Math.abs(this.amount - this.targetAmount) < 0.001) {
      this.amount = this.targetAmount;
    }
    const visualAmount = this.amount;

    this.pointLight.intensity = this.options.pointIntensity * this.amount;
    this.fillLight.intensity = this.options.fillIntensity * this.amount;
    this.leftShadeLight.intensity =
      this.options.leftShadeIntensity * this.amount;
    this.spotLight.intensity = this.options.spotIntensity * this.amount;
    if (this.sceneSpillLight) {
      this.sceneSpillLight.intensity =
        this.sceneSpillConfig.intensity * visualAmount;
    }
    this.areaLight.intensity = this.options.areaIntensity * this.amount;
    this.coreGlowMaterial.opacity =
      this.options.coreGlowOpacity * this.amount;
    this.poolMaterial.opacity = this.options.poolOpacity * this.amount;
    this.shadeMaterials.forEach((material) => {
      material.emissiveIntensity =
        this.options.shadeEmissiveIntensity * this.amount;
    });
  }

  dispose() {
    this.scene.remove(
      this.coreGlow,
      this.pointLight,
      this.fillLight,
      this.leftShadeLight,
      this.lightPool,
      this.spotTarget,
      this.spotLight,
      this.areaLight
    );
    if (this.sceneSpillLight) this.scene.remove(this.sceneSpillLight);
    if (this.sceneSpillTarget) this.scene.remove(this.sceneSpillTarget);
    this.sceneSpillLight = null;
    this.sceneSpillTarget = null;
    this.coreGlow.geometry.dispose();
    this.coreGlowMaterial.dispose();
    this.lightPool.geometry.dispose();
    this.poolMaterial.dispose();
    this.poolTexture.dispose();
    if (this.shade && this.originalShadeMaterial) {
      this.shade.material = this.originalShadeMaterial;
    }
    this.shadeMaterials.forEach((material) => material.dispose());
  }
}

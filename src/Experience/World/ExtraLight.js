import * as THREE from 'three';
import { DESKTOP_VISUAL_CONFIG } from '../VisualConfig.js';

const TABLE_SURFACE_FALLBACK_Y = -15.06;

const DEFAULTS = Object.freeze({
  ...DESKTOP_VISUAL_CONFIG.lamp,
  positionOffset: new THREE.Vector3(0, -0.035, 0),
  spotPositionOffset: new THREE.Vector3(0, -0.12, 0),
  fillOffset: new THREE.Vector3(-0.12, 0.02, 0.32),
  leftShadeOffset: new THREE.Vector3(-0.3, 0.02, 0.55),
  targetOffset: new THREE.Vector3(0, 0, 0),
  coneVisibilityBoost: 2.35,
  tableSurfaceOffset: 0.04,
  poolPositionOffset: new THREE.Vector3(0, 0, 0),
  poolSurfaceOffset: 0.1,
});

/** Adds a warm secondary light rig without owning the scene's power state. */
export default class ExtraLight {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.options = { ...DEFAULTS, ...options };
    this.amount = 0;
    this.targetAmount = 0;
    this.transitionStartAmount = 0;
    this.transitionElapsed = 0;

    this.shade =
      this.scene.getObjectByName('object_8') ??
      this.scene.getObjectByName('Object_8') ??
      null;
    this.originalShadeMaterial = this.shade?.material ?? null;
    this.shadeMaterials = this.cloneShadeMaterials();
    this.createShadeOverlay();

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
    this.beamTargetPosition = this.getBeamTargetPosition(position);
    this.coneHeight = Math.max(
      0.6,
      position.distanceTo(this.beamTargetPosition)
    );
    this.coneBottomRadius = Math.max(
      0.65,
      Math.tan(this.options.spotAngle) * this.coneHeight * 0.88
    );
    const shadeSize = shadeBounds?.getSize(new THREE.Vector3());
    this.coneTopRadius = Math.max(
      0.28,
      Math.min(shadeSize?.x ?? 1.2, shadeSize?.z ?? 1.2) * 0.18
    );

    this.coneTexture = this.createConeTexture();
    this.coreGlowMaterial = new THREE.MeshBasicMaterial({
      color: this.options.coneColor,
      alphaMap: this.coneTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    this.coreGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(
        this.coneTopRadius,
        this.coneBottomRadius,
        this.coneHeight,
        48,
        8,
        true
      ),
      this.coreGlowMaterial
    );
    this.coreGlow.name = 'ExtraLampCoreGlow';
    // This is a purely additive volume, not scene geometry. Letting SSAO render
    // it with its opaque normal override turns the warm beam into a dark cone.
    this.coreGlow.userData.excludeFromSSAO = true;
    this.coreGlow.position
      .copy(position)
      .add(this.beamTargetPosition)
      .multiplyScalar(0.5);
    this.coreGlow.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      position.clone().sub(this.beamTargetPosition).normalize()
    );
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
    this.pointLight.castShadow = false;

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
    this.spotTarget.position.copy(this.beamTargetPosition);

    this.poolTexture = this.createPoolTexture();
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
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.lightPool = new THREE.Mesh(
      new THREE.PlaneGeometry(
        Math.max(this.options.poolSize, this.coneBottomRadius * 1.8),
        Math.max(this.options.poolSize, this.coneBottomRadius * 1.8)
      ),
      this.poolMaterial
    );
    this.lightPool.name = 'ExtraLampTableLightPool';
    this.lightPool.userData.excludeFromSSAO = true;
    this.lightPool.rotation.x = -Math.PI * 1.5;
    this.lightPool.position
      .copy(this.beamTargetPosition)
      .setY(this.tableSurfaceY + this.options.poolSurfaceOffset)
      .add(this.options.poolPositionOffset);
    this.lightPool.castShadow = false;
    this.lightPool.receiveShadow = false;
    this.lightPool.renderOrder = 20;

    this.spotLight = new THREE.SpotLight(
      this.options.color,
      0,
      this.coneHeight + 1.5,
      this.options.spotAngle,
      this.options.spotPenumbra,
      this.options.decay
    );
    this.spotLight.name = 'ExtraLampTableLight';
    this.spotLight.position
      .copy(position)
      .add(this.options.spotPositionOffset);
    this.spotLight.target = this.spotTarget;
    this.spotLight.castShadow = true;
    this.spotLight.shadow.mapSize.set(
      this.options.shadowMapSize,
      this.options.shadowMapSize
    );
    this.spotLight.shadow.camera.near = 0.1;
    this.spotLight.shadow.camera.far = this.coneHeight + 1.5;
    this.spotLight.shadow.focus = 0.78;
    this.spotLight.shadow.bias = this.options.shadowBias;
    this.spotLight.shadow.normalBias = this.options.shadowNormalBias;

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
  }

  setPoweredOn(isOn) {
    const targetAmount = isOn ? 1 : 0;
    if (targetAmount === this.targetAmount && this.transitionElapsed > 0) return;

    this.transitionStartAmount = this.amount;
    this.transitionElapsed = 0;
    this.targetAmount = targetAmount;
  }

  createShadeOverlay() {
    if (!this.shade?.geometry) {
      this.shadeOverlay = null;
      this.shadeOverlayMaterial = null;
      return;
    }

    this.shadeOverlayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.options.shadeEmissiveColor) },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDirection;

        void main() {
          vUv = uv;
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          vNormalView = normalize(normalMatrix * normal);
          vViewDirection = normalize(-viewPosition.xyz);
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDirection;

        void main() {
          float verticalFibres = sin(vUv.x * 920.0 + sin(vUv.y * 37.0) * 3.0);
          float crossFibres = sin(vUv.y * 610.0 + sin(vUv.x * 29.0) * 2.0);
          float paperVariation = 0.82 + 0.09 * verticalFibres + 0.06 * crossFibres;
          float rim = pow(
            1.0 - abs(dot(normalize(vNormalView), normalize(vViewDirection))),
            2.2
          );
          float surfaceSide = gl_FrontFacing ? 0.46 : 1.0;
          float alpha = uOpacity * paperVariation * surfaceSide * mix(0.72, 1.25, rim);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
    });
    this.shadeOverlay = new THREE.Mesh(
      this.shade.geometry.clone(),
      this.shadeOverlayMaterial
    );
    this.shadeOverlay.name = 'ExtraLampShadeGlowOverlay';
    this.shadeOverlay.userData.excludeFromSSAO = true;
    this.shadeOverlay.scale.setScalar(1.002);
    this.shadeOverlay.castShadow = false;
    this.shadeOverlay.receiveShadow = false;
    this.shadeOverlay.renderOrder = 20;
    this.shade.add(this.shadeOverlay);
  }

  createPoolTexture() {
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

  createConeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);

    // Cylinder UVs run from the lower/table end at v=0 to the lamp at v=1.
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.2, '#707070');
    gradient.addColorStop(0.58, '#d8d8d8');
    gradient.addColorStop(0.88, '#ffffff');
    gradient.addColorStop(1, '#000000');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
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

  getBeamTargetPosition(sourcePosition) {
    return sourcePosition
      .clone()
      .setY(this.tableSurfaceY + this.options.tableSurfaceOffset)
      .add(this.options.targetOffset);
  }

  cloneShadeMaterials() {
    if (!this.shade?.material) return [];

    const sourceMaterials = Array.isArray(this.shade.material)
      ? this.shade.material
      : [this.shade.material];
    const clonedMaterials = sourceMaterials.map((material) => {
      const clone = material.clone();
      clone.emissive?.set(this.options.shadeEmissiveColor);
      if ('emissiveMap' in clone && clone.map) clone.emissiveMap = clone.map;
      clone.emissiveIntensity = 0;
      if ('roughness' in clone) clone.roughness = 0.88;
      if ('metalness' in clone) clone.metalness = 0;
      if ('envMapIntensity' in clone) clone.envMapIntensity = 0.42;
      clone.side = THREE.DoubleSide;
      clone.needsUpdate = true;
      return clone;
    });

    this.shade.material = Array.isArray(this.shade.material)
      ? clonedMaterials
      : clonedMaterials[0];
    return clonedMaterials;
  }

  update(deltaMilliseconds) {
    // Time.delta is generated by requestAnimationFrame and is expressed in ms.
    const seconds = Math.min(deltaMilliseconds ?? 0, 100) / 1000;
    let progress = 1;
    if (this.amount !== this.targetAmount) {
      this.transitionElapsed += seconds;
      progress = THREE.MathUtils.clamp(
        this.transitionElapsed / this.options.transitionDuration,
        0,
        1
      );
      const easedProgress = progress * progress * (3 - 2 * progress);
      this.amount = THREE.MathUtils.lerp(
        this.transitionStartAmount,
        this.targetAmount,
        easedProgress
      );
      if (progress >= 1) this.amount = this.targetAmount;
    }

    let visualAmount = this.amount;
    if (this.targetAmount === 1 && progress < 0.62) {
      const flickerEnvelope =
        THREE.MathUtils.smoothstep(progress, 0.05, 0.14) *
        (1 - THREE.MathUtils.smoothstep(progress, 0.34, 0.62));
      const flicker = Math.sin(progress * 71) * Math.sin(progress * 43);
      visualAmount *= 1 - Math.abs(flicker) * flickerEnvelope * this.options.flickerAmount;
    }

    this.pointLight.intensity = this.options.pointIntensity * visualAmount;
    this.fillLight.intensity = this.options.fillIntensity * visualAmount;
    this.leftShadeLight.intensity =
      this.options.leftShadeIntensity * visualAmount;
    this.spotLight.intensity = this.options.spotIntensity * visualAmount;
    this.areaLight.intensity = this.options.areaIntensity * visualAmount;
    this.coreGlowMaterial.opacity =
      this.options.coneOpacity * this.options.coneVisibilityBoost * visualAmount;
    this.poolMaterial.opacity = this.options.poolOpacity * visualAmount;
    if (this.shadeOverlayMaterial) {
      this.shadeOverlayMaterial.uniforms.uOpacity.value =
        this.options.shadeOverlayOpacity * visualAmount;
    }
    this.shadeMaterials.forEach((material) => {
      material.emissiveIntensity =
        this.options.shadeEmissiveIntensity * visualAmount;
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
    this.coreGlow.geometry.dispose();
    this.coreGlowMaterial.dispose();
    this.coneTexture.dispose();
    this.lightPool.geometry.dispose();
    this.poolMaterial.dispose();
    this.poolTexture.dispose();
    if (this.shadeOverlay) {
      this.shade.remove(this.shadeOverlay);
      this.shadeOverlay.geometry.dispose();
      this.shadeOverlayMaterial.dispose();
    }
    if (this.shade && this.originalShadeMaterial) {
      this.shade.material = this.originalShadeMaterial;
    }
    this.shadeMaterials.forEach((material) => material.dispose());
  }
}

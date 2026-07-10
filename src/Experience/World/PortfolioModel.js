import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DummyAnimator } from '../../animations/DummyAnimator.js';
import { AnimatorChain } from '../../animations/AnimatorChain.js';
import { FanAnimator } from '../../animations/FanAnimator.js';
import { TubeFlowAnimator } from '../../animations/TubeFlowAnimator.js';
import ApplyingTexture from '../../utils/ApplyingTexture.js';
import CozyLedMaterials from '../../utils/CozyLedMaterials.js';
import { secureModelMaterials } from '../../utils/ModelMaterialSafety.js';
import { InteractionState } from '../InteractionState.js';
import PowerExperience from '../PowerExperience.js';
import { DESKTOP_VISUAL_CONFIG } from '../VisualConfig.js';
import ExtraLight from './ExtraLight.js';
import MaterialEnhancements from './MaterialEnhancements.js';
import PlantMaterialTint from './PlantMaterialTint.js';

const CLICK_LAYER = 1;
const FAN_CONFIGS = [
  { name: 'FAN_ROT_Y_1', axis: 'y', speedMultiplier: 0.96 },
  { name: 'FAN_ROT_Y_2', axis: 'y', speedMultiplier: 1.02 },
  { name: 'FAN_ROT_Y_3', axis: 'y', speedMultiplier: 1.06 },
  { name: 'FAN_ROT_Z_1', axis: 'z', speedMultiplier: 0.94 },
  { name: 'FAN_ROT_Z_2', axis: 'z', speedMultiplier: 1.00 },
  { name: 'FAN_ROT_Z_3', axis: 'z', speedMultiplier: 1.04 },
  { name: 'FAN_ROT_Z_4', axis: 'z', speedMultiplier: 0.98 },
  { name: 'FAN_ROT_Z_5', axis: 'z', speedMultiplier: 1.07 },
  { name: 'FAN_ROT_Z_6', axis: 'z', speedMultiplier: 0.92 },
  { name: 'FAN_ROT_X', axis: 'x', speedMultiplier: 1.03 },
 ];

const DEBUG_DUMMY_HIERARCHY = false;
const DEBUG_TRANSPARENT_MATERIALS = false;
const DEBUG_MODEL_DIAGNOSTICS = false;
const CPU_RING_RADIUS = 0.31;
const CPU_RING_TUBE_RADIUS = 0.017;
const CPU_CORE_OFFSET_X = 0;
const CPU_CORE_OFFSET_Y = 0.02;
const CPU_CORE_OFFSET_Z = 0;
const CPU_CORE_SCALE = 1;

const SECTION_ID_BY_OBJECT = {
  CLICK_DUMMY: 'dummy',
  CLICK_CPU: 'about',
  CLICK_GPU: 'projects',
  CLICK_RAM: 'academic',
  CLICK_FANS: 'experience',
  CLICK_CABLES: 'interests',
};

export default class PortfolioModel {
  constructor(experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.renderer = experience.renderer.instance;
    this.loadingScreen = document.querySelector('#loading-screen');
    this.clickTargets = [];
    this.fanRotors = [];
    this.loadedModel = null;
    this.dummyAnimator = null;
    this.animatorChain = null;
    this.fanAnimator = null;
    this.powerExperience = null;
    this.tubeFlowAnimator = null;
    this.extraLight = null;
    this.cpuCentralLightRing = null;
    this.cpuCentralLightRingMeshes = [];
    this.casePoweredVisuals = [];
    this.introElapsed = 0;
    this.introTriggered = false;
    const introParameter = new URLSearchParams(window.location.search).get('intro');
    this.introEnabled =
      DESKTOP_VISUAL_CONFIG.intro.enabled && introParameter !== 'off';
    this.applyingTexture = new ApplyingTexture();
    this.materialEnhancements = new MaterialEnhancements();
    this.plantMaterialTint = new PlantMaterialTint();
    this.cozyLedMaterials = new CozyLedMaterials({ enabled: true });

    this.setPlaceholder();
    this.loadModel();
  }

  setPlaceholder() {
    this.placeholderGroup = new THREE.Group();
    this.scene.add(this.placeholderGroup);

    const caseGeometry = new THREE.BoxGeometry(1.8, 1.7, 1.05);
    const caseMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      roughness: 0.38,
      metalness: 0.12,
    });

    const placeholderCase = new THREE.Mesh(caseGeometry, caseMaterial);
    placeholderCase.position.set(0.45, 0.85, 0);
    placeholderCase.castShadow = true;
    placeholderCase.receiveShadow = true;
    this.placeholderGroup.add(placeholderCase);

    const glassGeometry = new THREE.PlaneGeometry(1.55, 1.35);
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9bdcff,
      transparent: true,
      opacity: 0.24,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.35,
    });

    const placeholderGlass = new THREE.Mesh(glassGeometry, glassMaterial);
    placeholderGlass.position.set(0.45, 0.86, 0.531);
    placeholderGlass.castShadow = false;
    this.placeholderGroup.add(placeholderGlass);

    const dummyGeometry = new THREE.CapsuleGeometry(0.22, 0.7, 4, 12);
    const dummyMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.65,
    });

    this.placeholderDummy = new THREE.Mesh(dummyGeometry, dummyMaterial);
    this.placeholderDummy.position.set(-1.3, 0.62, 0.25);
    this.placeholderDummy.castShadow = true;
    this.placeholderGroup.add(this.placeholderDummy);
  }

  loadModel() {
    const loader = new GLTFLoader();
    const modelUrl = `${import.meta.env.BASE_URL}models/portfolio_case.glb`;

    loader.load(
      modelUrl,
      (gltf) => {
        this.loadedModel = gltf.scene;
        this.applyingTexture.applyToModel(this.loadedModel);
        this.normalizeCpuCentralDiscName();
        this.applyCpuCentralDiscMaterial();
        const cpuCore = this.createCpuCoreVisual();
        // Isolate shared GLTF material instances before changing render flags.
        secureModelMaterials(this.loadedModel, {
          cloneMaterials: true,
          debug: DEBUG_TRANSPARENT_MATERIALS,
        });
        this.cozyLedMaterials.applyToModel(this.loadedModel);
        this.applyCpuCentralDiscMaterial();
        if (DEBUG_MODEL_DIAGNOSTICS) this.logMaterialDiagnostics();

        this.scene.add(this.loadedModel);
        this.placeholderGroup.visible = false;

        const dummyRoot = this.loadedModel.getObjectByName('Dummy_root');

        if (DEBUG_DUMMY_HIERARCHY) {
          dummyRoot?.traverse((child) => {
            console.log(child.name, child.type);
          });
        }

        this.dummyAnimator = new DummyAnimator({
          dummyRoot,
          renderer: this.renderer,
          debug: false,
        });

        const chainRoot = this.findObjectByNormalizedName('chain.001');
        this.animatorChain = new AnimatorChain({
          chainRoot,
          clickTarget: this.loadedModel.getObjectByName('CLICK_CHAIN'),
          debug: false,
        });

        const cpuCentralRingObject = this.loadedModel.getObjectByName('CPU_CENTRAL_RING');
        const cpuCentralRingMeshes = [];

        if (cpuCentralRingObject) {
          if (cpuCentralRingObject.isMesh) {
            cpuCentralRingMeshes.push(cpuCentralRingObject);
          } else {
            cpuCentralRingObject.traverse((object) => {
              if (object.isMesh) cpuCentralRingMeshes.push(object);
            });
          }
        }

        this.loadedModel.traverse((object) => {
          if (object.name?.startsWith('CLICK_')) {
            this.setupClickTarget(object);
          } else if (object.isMesh) {
            this.setupVisibleMesh(object);
          }
        });

        this.materialEnhancements.apply(this.loadedModel);
        this.plantMaterialTint.apply(this.loadedModel);

        if (DEBUG_MODEL_DIAGNOSTICS) this.logModelDiagnostics();

        if (!cpuCentralRingObject || cpuCentralRingMeshes.length === 0) {
          console.warn('[PORTFOLIO MODEL] CPU_CENTRAL_RING was not found or contains no mesh children. CPU central ring will not be enabled.');
        } else {
          const ringMaterial = this.createCpuCentralRingMaterial();
          cpuCentralRingMeshes.forEach((mesh) => {
            mesh.material = Array.isArray(mesh.material)
              ? mesh.material.map(() => ringMaterial.clone())
              : ringMaterial.clone();
            mesh.renderOrder = 999;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.material.needsUpdate = true;
          });
          this.cpuCentralLightRing = cpuCentralRingObject;
          this.cpuCentralLightRingMeshes = cpuCentralRingMeshes;
          this.casePoweredVisuals.push(cpuCentralRingObject);
        }

        FAN_CONFIGS.forEach((config) => {
          const configuredObject = this.loadedModel.getObjectByName(config.name);
          let containsMesh = false;

          configuredObject?.traverse((object) => {
            containsMesh ||= object.isMesh;
          });

          const rotorObject = containsMesh
            ? configuredObject
            : config.fallbackName
              ? this.loadedModel.getObjectByName(config.fallbackName)
              : null;

          if (rotorObject) {
            this.fanRotors.push({
              object: rotorObject,
              axis: config.axis,
              speedMultiplier: config.speedMultiplier ?? 1,
            });
          } else {
            console.warn(`[FAN MISSING] ${config.name}`);
          }
        });

        this.fanAnimator = new FanAnimator({
          fanRotors: this.fanRotors,
          enabled: false,
        });

        this.powerExperience = new PowerExperience({
          scene: this.scene,
          model: this.loadedModel,
          environment: this.experience.world.environment,
          renderer: this.experience.renderer,
          ledController: this.cozyLedMaterials,
          cpuCore,
          cpuCentralLightRing: this.cpuCentralLightRing,
          cpuCentralLightRingMeshes: this.cpuCentralLightRingMeshes,
          fanAnimator: this.fanAnimator,
        });

        this.powerExperience.on('transitionComplete', ({ poweredOn }) => {
          const interactions = this.experience.interactions;
          if (!interactions?.hasTransition('power')) return;

          interactions.completeTransition('power', {
            nextState: poweredOn
              ? InteractionState.READY
              : InteractionState.DARK,
          });
        });

        this.extraLight = new ExtraLight(this.scene, {
          lamp: this.loadedModel.getObjectByName('LAMPADINA_4'),
        });

        this.tubeFlowAnimator = new TubeFlowAnimator({
          parent: this.loadedModel,
          scene: this.scene,
          enabled: this.powerExperience.poweredOn,
        });

        const originalSetPoweredOn = this.powerExperience.setPoweredOn.bind(this.powerExperience);
        this.powerExperience.setPoweredOn = (poweredOn) => {
          originalSetPoweredOn(poweredOn);
          this.tubeFlowAnimator?.setPoweredOn(this.powerExperience.poweredOn);
          this.extraLight?.setPoweredOn(this.powerExperience.poweredOn);
        };

        this.powerExperience.setPoweredOn(this.powerExperience.poweredOn);
        this.hideLoadingScreen();
      },
      undefined,
      (error) => {
        console.warn(
          'GLB not found yet. The placeholder scene will remain visible.',
          error
        );
        this.hideLoadingScreen();
      }
    );
  }

  setupVisibleMesh(object) {
    if (this.isPlantLikeMesh(object)) {
      object.castShadow = false;
      object.receiveShadow = false;
    } else {
      object.castShadow = true;
      object.receiveShadow = true;
    }

    if (object.material) {
      object.material.needsUpdate = true;
    }
  }

  isPlantLikeMesh(object) {
    const name = object?.name ?? '';
    return /(plant|leaf|trunk|sketchfab|komish)/i.test(name);
  }

  findObjectByNormalizedName(name) {
    const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    let match = null;

    this.loadedModel?.traverse((object) => {
      const objectName = object.name
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      if (!match && objectName === normalizedName) {
        match = object;
      }
    });

    return match;
  }

  createCpuCoreVisual() {
    const obsoleteObjects = [];
    this.loadedModel?.traverse((object) => {
      if (
        object.name === 'CPU_CENTRAL_LED_RING' ||
        object.name === 'CPU_CORE_VISUAL'
      ) {
        obsoleteObjects.push(object);
      }
    });
    obsoleteObjects.forEach((object) => {
      object.removeFromParent();
      object.geometry?.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material?.dispose());
    });

    let cpu = null;
    this.loadedModel?.traverse((object) => {
      if (!cpu && object.isMesh && /^cpu_central$/i.test(object.name)) {
        cpu = object;
      }
    });
    if (!cpu?.geometry) return null;

    cpu.material = new THREE.MeshStandardMaterial({
      name: 'CpuCentralBaseMaterial',
      color: 0x1b211f,
      roughness: 0.65,
      metalness: 0.1,
      transparent: false,
      opacity: 1,
      depthTest: true,
      depthWrite: true,
    });
    cpu.userData.modelMaterialRole = 'cpu-core';

    cpu.geometry.computeBoundingBox();
    const bounds = cpu.geometry.boundingBox;
    if (!bounds) return null;

    const center = bounds.getCenter(new THREE.Vector3());
    const group = new THREE.Group();
    group.name = 'CPU_CORE_VISUAL';
    group.position.set(
      center.x + CPU_CORE_OFFSET_X,
      bounds.max.y + CPU_CORE_OFFSET_Y,
      center.z + CPU_CORE_OFFSET_Z
    );
    group.rotation.x = -Math.PI / 2;
    group.scale.setScalar(CPU_CORE_SCALE);
    group.userData.modelMaterialRole = 'cpu-core-visual';

    const ringGeometry = new THREE.TorusGeometry(
      CPU_RING_RADIUS,
      CPU_RING_TUBE_RADIUS,
      16,
      64
    );
    const ringMaterial = new THREE.MeshStandardMaterial({
      name: 'CpuCoreWarmLedMaterial',
      color: 0x0b1f1a,
      emissive: 0x06120f,
      emissiveIntensity: 0.03,
      roughness: 0.35,
      metalness: 0,
      toneMapped: true,
      transparent: false,
      opacity: 1,
      depthTest: true,
      depthWrite: true,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.name = 'CPU_CORE_WARM_LED';
    ring.position.z = 0.003;
    ring.renderOrder = 0;
    ring.castShadow = false;
    ring.receiveShadow = false;

    const diskGeometry = new THREE.CircleGeometry(
      CPU_RING_RADIUS - CPU_RING_TUBE_RADIUS * 2.4,
      64
    );
    const diskMaterial = new THREE.MeshStandardMaterial({
      name: 'CpuCoreDarkDiscMaterial',
      color: 0x201a16,
      roughness: 0.65,
      metalness: 0.05,
      transparent: false,
      opacity: 1,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    const disk = new THREE.Mesh(diskGeometry, diskMaterial);
    disk.name = 'CPU_CORE_DISC';
    disk.renderOrder = 0;

    const label = this.createCpuCoreLabel();
    label.position.z = 0.006;

    group.add(disk, ring, label);
    cpu.add(group);
    return {
      group,
      ring,
      label,
      labelContext: label.userData.labelContext,
      labelTexture: label.userData.labelTexture,
    };
  }

  createCpuCoreLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#06120f';
    context.font = '600 132px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('SBC', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      name: 'CpuCoreSbcLabelMaterial',
      color: 0x06120f,
      emissive: 0x000000,
      emissiveIntensity: 0,
      map: texture,
      transparent: true,
      opacity: 0.08,
      roughness: 0.65,
      metalness: 0,
      depthTest: true,
      depthWrite: false,
      toneMapped: true,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(
      CPU_RING_RADIUS * 1.25,
      CPU_RING_RADIUS * 0.58
    );
    const label = new THREE.Mesh(geometry, material);
    label.name = 'CPU_CORE_SBC_LABEL';
    label.userData.modelMaterialRole = 'cpu-core-label';
    label.userData.labelContext = context;
    label.userData.labelTexture = texture;
    label.renderOrder = 0;
    return label;
  }

  normalizeCpuCentralDiscName() {
    if (!this.loadedModel) return;

    const discTypo = this.loadedModel.getObjectByName('CPU_CENTRAL_DISCK');
    const discCorrect = this.loadedModel.getObjectByName('CPU_CENTRAL_DISC');

    if (discTypo && !discCorrect) {
      discTypo.name = 'CPU_CENTRAL_DISC';
      console.warn(
        '[PORTFOLIO MODEL] Renamed GLB node CPU_CENTRAL_DISCK to CPU_CENTRAL_DISC to preserve the separate CPU disc mesh.'
      );
    }
  }

  applyCpuCentralDiscMaterial() {
    if (!this.loadedModel) return;

    const discMesh = this.loadedModel.getObjectByName('CPU_CENTRAL_DISC');
    if (!discMesh || !discMesh.isMesh) return;

    const discMaterial = new THREE.MeshStandardMaterial({
      name: 'CpuCentralDiscMaterial',
      color: 0x201a16,
      roughness: 0.65,
      metalness: 0.05,
      transparent: false,
      opacity: 1,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });

    discMesh.material = Array.isArray(discMesh.material)
      ? discMesh.material.map(() => discMaterial.clone())
      : discMaterial;
    discMesh.castShadow = false;
    discMesh.receiveShadow = false;
    discMesh.material.needsUpdate = true;
  }

  createCpuCentralRingMaterial() {
    return new THREE.MeshStandardMaterial({
      name: 'CpuCentralRingMaterial',
      color: 0xffe9c6,
      emissive: 0xffd8a8,
      emissiveIntensity: 0.32,
      roughness: 0.25,
      metalness: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1,
    });
  }

  logMaterialDiagnostics() {
    this.loadedModel?.traverse((object) => {
      const name = object.name ?? '';
      const shouldLog =
        /^cpu_central$/i.test(name) ||
        /^cpu_core_/i.test(name) ||
        /(?:tube|tubes|pipe|hose|cooling)/i.test(name);
      if (!object.isMesh || !shouldLog) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material, slot) => {
        console.log('[Material diagnostic]', {
          mesh: name,
          slot,
          material: material?.name,
          color: material?.color
            ? `#${material.color.getHexString()}`
            : null,
          emissive: material?.emissive
            ? `#${material.emissive.getHexString()}`
            : null,
          opacity: material?.opacity,
          transparent: material?.transparent,
        });
      });
    });
  }

  logModelDiagnostics() {
    if (!this.loadedModel) return;

    const meshes = [];
    const materialSet = new Set();
    const largeTextures = [];
    const materialNameCounts = new Map();

    this.loadedModel.traverse((object) => {
      if (!object.isMesh || !object.geometry) return;

      const geometry = object.geometry;
      const triangleCount = this.getApproximateTriangleCount(geometry);
      const materials = Array.isArray(object.material)
        ? object.material
        : object.material
          ? [object.material]
          : [];

      materials.forEach((material) => {
        if (material) materialSet.add(material);
        if (material?.isMaterial) {
          const baseName = this.getMaterialBaseName(material.name || '');
          materialNameCounts.set(baseName, (materialNameCounts.get(baseName) || 0) + 1);

          const textureEntries = this.collectMaterialTextures(material);
          textureEntries.forEach((textureInfo) => {
            if (textureInfo.width >= 2048 || textureInfo.height >= 2048) {
              largeTextures.push(textureInfo);
            }
          });
        }
      });

      meshes.push({
        name: object.name || '(unnamed)',
        triangleCount,
        materialCount: materials.length,
        materialName: materials[0]?.name || '(none)',
        parentName: object.parent?.name || '(root)',
        visible: object.visible,
        castShadow: object.castShadow,
        receiveShadow: object.receiveShadow,
      });
    });

    meshes.sort((a, b) => b.triangleCount - a.triangleCount);

    const duplicateMaterialNames = [...materialNameCounts.entries()]
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    console.groupCollapsed('[PORTFOLIO MODEL] GLB diagnostics');
    console.log('Mesh count', meshes.length);
    console.log('Approximate triangle count', meshes.reduce((sum, mesh) => sum + mesh.triangleCount, 0));
    console.log('Material count', materialSet.size);
    console.log('Top 30 heaviest meshes', meshes.slice(0, 30).map((mesh) => ({
      name: mesh.name,
      triangles: mesh.triangleCount,
      material: mesh.materialName,
      parent: mesh.parentName,
      visible: mesh.visible,
      castShadow: mesh.castShadow,
      receiveShadow: mesh.receiveShadow,
    })));
    console.log('Duplicate material names (base name)', duplicateMaterialNames);
    console.log('Large textures', largeTextures.slice(0, 20));
    console.groupEnd();
  }

  getMaterialBaseName(name) {
    if (!name) return '(unnamed)';
    const match = name.match(/^(.*?)(?:\.\d+)?$/);
    return match?.[1] || name;
  }

  getApproximateTriangleCount(geometry) {
    if (!geometry) return 0;

    if (geometry.index) {
      return Math.max(0, geometry.index.count / 3);
    }

    const positionAttribute = geometry.getAttribute?.('position');
    return positionAttribute ? Math.max(0, positionAttribute.count / 3) : 0;
  }

  collectMaterialTextures(material) {
    if (!material?.isMaterial) return [];

    const textures = [];
    const textureKeys = [
      'map',
      'aoMap',
      'bumpMap',
      'normalMap',
      'displacementMap',
      'emissiveMap',
      'envMap',
      'metalnessMap',
      'roughnessMap',
      'alphaMap',
    ];

    textureKeys.forEach((textureKey) => {
      const texture = material[textureKey];
      if (!texture?.image) return;

      const width = texture.image.width ?? 0;
      const height = texture.image.height ?? 0;
      textures.push({
        key: textureKey,
        name: texture.name || textureKey,
        width,
        height,
        src: texture.image.currentSrc || texture.image.src || null,
      });
    });

    return textures;
  }

  setupClickTarget(object) {
    object.layers.set(CLICK_LAYER);
    object.userData.isClickTarget = true;

    object.userData.sectionId = SECTION_ID_BY_OBJECT[object.name] ?? null;

    if (object.isMesh) {
      object.material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      });
      // Raycaster does not require render visibility. Hiding proxy meshes keeps
      // them out of shadow and ambient-occlusion depth passes while preserving
      // interaction.
      object.visible = false;
    }

    this.clickTargets.push(object);
  }

  hideLoadingScreen() {
    this.loadingScreen?.classList.add('hidden');
  }

  toggleFans() {
    return this.fanAnimator?.toggle();
  }

  setLedsEnabled(enabled) {
    this.cozyLedMaterials.setEnabled(enabled);
  }

  toggleLeds() {
    return this.cozyLedMaterials.toggle();
  }

  updateCinematicIntro(delta) {
    if (
      !this.introEnabled ||
      this.introTriggered ||
      !this.powerExperience ||
      this.powerExperience.hasUserInteracted
    ) {
      return;
    }

    this.introElapsed += Math.min(delta ?? 0, 100) / 1000;
    if (this.introElapsed < DESKTOP_VISUAL_CONFIG.intro.delay) return;
    if (!this.experience.interactions?.canTogglePower()) return;

    this.introTriggered = true;
    this.experience.interactions?.beginTransition('power', {
      nextState: InteractionState.READY,
    });
    this.powerExperience.setPoweredOn(true);
  }

  update(delta) {
    if (this.placeholderDummy) {
      this.placeholderDummy.rotation.y += 0.01;
    }

    this.dummyAnimator?.update(delta);
    this.animatorChain?.update(delta);
    this.updateCinematicIntro(delta);
    this.powerExperience?.update(delta);
    this.tubeFlowAnimator?.setPowerAmount(
      this.powerExperience?.powerAmount ?? 0
    );
    this.fanAnimator?.update(delta);
    this.tubeFlowAnimator?.update(delta);
    this.extraLight?.setPoweredOn(this.powerExperience?.poweredOn ?? false);
    this.extraLight?.update(delta);
    this.cozyLedMaterials.update(delta);
  }
}

export { CLICK_LAYER };

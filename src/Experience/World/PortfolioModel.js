import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DummyAnimator } from '../../animations/DummyAnimator.js';
import { AnimatorChain } from '../../animations/AnimatorChain.js';
import ApplyingTexture from '../../utils/ApplyingTexture.js';
import CozyLedMaterials from '../../utils/CozyLedMaterials.js';
import { secureModelMaterials } from '../../utils/ModelMaterialSafety.js';
import PowerExperience from '../PowerExperience.js';

const CLICK_LAYER = 1;
const FAN_CONFIGS = [
  { name: 'FAN_ROT_Y_1', axis: 'y' },
  { name: 'FAN_ROT_Y_2', axis: 'y' },
  { name: 'FAN_ROT_Y_3', axis: 'y' },
  {name: 'FAN_ROT_Z_1',axis: 'z'},
  {name: 'FAN_ROT_Z_2',axis: 'z'},
  {name: 'FAN_ROT_Z_3',axis: 'z'},
  { name: 'FAN_ROT_Z_4', axis: 'z' },
  { name: 'FAN_ROT_Z_5', axis: 'z' },
  { name: 'FAN_ROT_Z_6', axis: 'z' },
  { name: 'FAN_ROT_X', axis: 'x' },
 ];

const FAN_TARGET_SPEED = 18;
const FAN_ACCELERATION = 6;
const DEBUG_DUMMY_HIERARCHY = false;
const DEBUG_TRANSPARENT_MATERIALS = false;
const CPU_RING_RADIUS = 0.31;
const CPU_RING_TUBE_RADIUS = 0.017;
const CPU_CORE_OFFSET_X = 0;
const CPU_CORE_OFFSET_Y = 0.02;
const CPU_CORE_OFFSET_Z = 0;
const CPU_CORE_SCALE = 1;

const SECTION_BY_OBJECT = {
  CLICK_DUMMY: {
    title: 'Intro',
    text: 'Dummy introduces the interactive portfolio and guides the visitor through the scene.',
  },
  CLICK_CPU: {
    title: 'About me',
    text: 'Personal profile, background, and main interests.',
  },
  CLICK_GPU: {
    title: 'Projects',
    text: 'Selected technical and creative projects.',
  },
  CLICK_RAM: {
    title: 'Academic',
    text: 'University path, relevant exams, and academic skills.',
  },
  CLICK_FANS: {
    title: 'Work experience',
    text: 'Professional experiences, tutoring, and applied activities.',
  },
  CLICK_CABLES: {
    title: 'Hobby and interests',
    text: 'Creative interests, drawing, games, cinema, and personal passions.',
  },
  CLICK_CASE: {
    title: 'Contact me',
    text: 'Contact information and external links.',
  },
};

export default class PortfolioModel {
  constructor(experience) {
    this.experience = experience;
    this.scene = experience.scene;
    this.renderer = experience.renderer.instance;
    this.loadingScreen = document.querySelector('#loading-screen');
    this.clickTargets = [];
    this.fanRotors = [];
    this.fanEnabled = true;
    this.fanCurrentSpeed = 0;
    this.loadedModel = null;
    this.dummyAnimator = null;
    this.animatorChain = null;
    this.powerExperience = null;
    this.applyingTexture = new ApplyingTexture();
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

    loader.load(
      '/models/portfolio_case.glb',
      (gltf) => {
        this.loadedModel = gltf.scene;
        this.applyingTexture.applyToModel(this.loadedModel);
        const cpuCore = this.createCpuCoreVisual();
        // Isolate shared GLTF material instances before changing render flags.
        secureModelMaterials(this.loadedModel, {
          cloneMaterials: true,
          debug: DEBUG_TRANSPARENT_MATERIALS,
        });
        if (cpuCore?.ring) {
          this.cozyLedMaterials.assign(cpuCore.ring, 'cpuCore');
        }
        this.cozyLedMaterials.applyToModel(this.loadedModel);
        this.logMaterialDiagnostics();

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
          debug: true,
        });

        const chainRoot = this.findObjectByNormalizedName('chain.001');
        this.animatorChain = new AnimatorChain({
          chainRoot,
          clickTarget: this.loadedModel.getObjectByName('CLICK_CHAIN'),
          debug: true,
        });

        this.loadedModel.traverse((object) => {
          if (object.name?.startsWith('CLICK_')) {
            this.setupClickTarget(object);
          } else if (object.isMesh) {
            this.setupVisibleMesh(object);
          }
        });

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
            });
          } else {
            console.warn(`[FAN MISSING] ${config.name}`);
          }
        });

        this.powerExperience = new PowerExperience({
          scene: this.scene,
          model: this.loadedModel,
          environment: this.experience.world.environment,
          clickTargets: this.clickTargets,
          ledController: this.cozyLedMaterials,
        });

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
    object.castShadow = true;
    object.receiveShadow = true;

    if (object.material) {
      object.material.needsUpdate = true;
    }
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
      color: 0xfff1d0,
      emissive: 0xfff1d0,
      emissiveIntensity: 0.8,
      roughness: 0.35,
      metalness: 0,
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
    return { group, ring };
  }

  createCpuCoreLabel() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#fff1d0';
    context.font = '600 132px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('SBC', canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      name: 'CpuCoreSbcLabelMaterial',
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(
      CPU_RING_RADIUS * 1.25,
      CPU_RING_RADIUS * 0.58
    );
    const label = new THREE.Mesh(geometry, material);
    label.name = 'CPU_CORE_SBC_LABEL';
    label.userData.modelMaterialRole = 'cpu-core-label';
    label.renderOrder = 0;
    return label;
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

  setupClickTarget(object) {
    object.layers.set(CLICK_LAYER);
    object.userData.isClickTarget = true;

    object.userData.section = SECTION_BY_OBJECT[object.name] ?? {
      title: object.name,
      text: 'Section content not assigned yet.',
    };

    if (object.isMesh) {
      object.material = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      });
    }

    this.clickTargets.push(object);
  }

  hideLoadingScreen() {
    this.loadingScreen?.classList.add('hidden');
  }

  toggleFans() {
    this.fanEnabled = !this.fanEnabled;
  }

  setLedsEnabled(enabled) {
    this.cozyLedMaterials.setEnabled(enabled);
  }

  toggleLeds() {
    return this.cozyLedMaterials.toggle();
  }

  update(delta) {
    if (this.placeholderDummy) {
      this.placeholderDummy.rotation.y += 0.01;
    }

    const deltaTime = Math.min(delta, 100) / 1000;
    this.dummyAnimator?.update(delta);
    this.animatorChain?.update(delta);
    this.powerExperience?.update(delta);
    this.cozyLedMaterials.update(delta);

    const targetSpeed =
      this.fanEnabled && this.powerExperience?.poweredOn ? FAN_TARGET_SPEED : 0;
    const speedStep = FAN_ACCELERATION * deltaTime;

    if (this.fanCurrentSpeed < targetSpeed) {
      this.fanCurrentSpeed = Math.min(
        this.fanCurrentSpeed + speedStep,
        targetSpeed
      );
    } else if (this.fanCurrentSpeed > targetSpeed) {
      this.fanCurrentSpeed = Math.max(
        this.fanCurrentSpeed - speedStep,
        targetSpeed
      );
    }

    this.fanRotors.forEach((fan) => {
      fan.object.rotation[fan.axis] += this.fanCurrentSpeed * deltaTime;
    });
  }
}

export { CLICK_LAYER };

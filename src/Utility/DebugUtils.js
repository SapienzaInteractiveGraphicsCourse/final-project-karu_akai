import * as THREE from 'three';
import gsap from 'gsap';

/** Development diagnostics kept isolated from the runtime experience. */
export default class DebugUtils {
  constructor({ canvas, cameraController, scene, interactions, enabled = false }) {
    this.canvas = canvas;
    this.cameraController = cameraController;
    this.camera = cameraController?.instance;
    this.controls = cameraController?.controls;
    this.scene = scene;
    this.interactions = interactions;
    this.enabled = Boolean(enabled);
    this.model = null;
    this.calibrationTarget = null;
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    if (this.enabled) {
      this.canvas?.addEventListener('click', this.onClick, { passive: true });
      window.addEventListener('keydown', this.onKeyDown);
    }
  }

  setModel(model) {
    this.model = model;
    if (!this.enabled || !model) return;

    this.logDummyHierarchy();
    this.logMaterialDiagnostics();
    this.logModelDiagnostics();
  }

  setCalibrationTarget(object) {
    if (!this.enabled) return;
    this.calibrationTarget = object;
    console.log(`Calibration target set: ${object?.name || '(unnamed)'}`);
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();

    if (key === 'f') {
      if (this.interactions?.isInteractionLocked()) return;
      this.frameCalibrationTarget();
    } else if (key === 'p') {
      this.logCurrentPreset();
    } else if (key === 'd') {
      this.logCurrentPreset('DEFAULT');
    } else if (key === '0') {
      if (this.interactions?.isInteractionLocked()) return;
      this.cameraController?.moveToDefault();
    }
  }

  frameCalibrationTarget() {
    if (!this.calibrationTarget) {
      console.warn('Calibration target missing: click a CLICK_ target before pressing F.');
      return;
    }

    const box = new THREE.Box3().setFromObject(this.calibrationTarget);
    if (box.isEmpty()) {
      console.warn(`Cannot frame calibration target: ${this.calibrationTarget.name} has an empty bounding box.`);
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(Math.max(size.x, size.y, size.z) * 3, 1.2);
    const direction = this.camera.getWorldDirection(new THREE.Vector3())
      .multiplyScalar(-1)
      .normalize();
    const newPosition = center.clone().add(direction.multiplyScalar(distance));
    const controller = this.cameraController;

    controller.transitionId += 1;
    const transitionId = controller.transitionId;
    controller.activeTweens.forEach((tween) => tween.kill());
    controller.activeTweens = [];
    this.controls.enabled = false;
    let completedTweens = 0;

    const handleUpdate = () => this.controls.update();
    const handleComplete = () => {
      completedTweens += 1;
      if (completedTweens < 2 || transitionId !== controller.transitionId) return;
      this.controls.enabled = true;
      this.controls.update();
      controller.activeTweens = [];
    };
    const options = {
      duration: 0.8,
      ease: 'power2.inOut',
      overwrite: true,
      onUpdate: handleUpdate,
      onComplete: handleComplete,
    };

    controller.activeTweens = [
      gsap.to(this.camera.position, { ...options, ...newPosition }),
      gsap.to(this.controls.target, { ...options, ...center }),
    ];
  }

  logCurrentPreset(presetName) {
    const name = presetName ?? this.cameraController?.currentPresetName ??
      this.calibrationTarget?.name ?? 'COPY_ME';
    const format = (value) => Math.abs(value) < 0.0005 ? '0.000' : value.toFixed(3);
    const position = this.camera.position;
    const target = this.controls.target;

    console.log(`${name}: {
  position: { x: ${format(position.x)}, y: ${format(position.y)}, z: ${format(position.z)} },
  target: { x: ${format(target.x)}, y: ${format(target.y)}, z: ${format(target.z)} },
  duration: 1.2,
},`);
  }

  onClick(event) {
    if (!this.canvas || !this.camera || !this.scene) return;
    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersection = this.raycaster.intersectObjects(this.scene.children, true)
      .find(({ object }) => DebugUtils.isVisibleInHierarchy(object));
    if (intersection) DebugUtils.logMeshHierarchy(intersection.object);
  }

  logDummyHierarchy() {
    const dummyRoot = this.model?.getObjectByName('Dummy_root');
    if (!dummyRoot) return;
    console.groupCollapsed('[Debug] Dummy hierarchy');
    dummyRoot.traverse((child) => console.log(child.name, child.type));
    console.groupEnd();
  }

  logMaterialDiagnostics() {
    this.model?.traverse((object) => {
      const name = object.name ?? '';
      if (!object.isMesh || !(/^cpu_central$/i.test(name) || /^cpu_core_/i.test(name) || /(?:tube|tubes|pipe|hose|cooling)/i.test(name))) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material, slot) => console.log('[Material diagnostic]', {
        mesh: name,
        slot,
        material: material?.name,
        color: material?.color ? `#${material.color.getHexString()}` : null,
        emissive: material?.emissive ? `#${material.emissive.getHexString()}` : null,
        opacity: material?.opacity,
        transparent: material?.transparent,
      }));
    });
  }

  logModelDiagnostics() {
    if (!this.model) return;
    const meshes = [];
    const materialSet = new Set();
    const largeTextures = [];
    const materialNameCounts = new Map();

    this.model.traverse((object) => {
      if (!object.isMesh || !object.geometry) return;
      const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      materials.forEach((material) => {
        if (material) materialSet.add(material);
        if (!material?.isMaterial) return;
        const baseName = this.getMaterialBaseName(material.name || '');
        materialNameCounts.set(baseName, (materialNameCounts.get(baseName) || 0) + 1);
        this.collectMaterialTextures(material).forEach((textureInfo) => {
          if (textureInfo.width >= 2048 || textureInfo.height >= 2048) largeTextures.push(textureInfo);
        });
      });
      meshes.push({
        name: object.name || '(unnamed)',
        triangleCount: this.getApproximateTriangleCount(object.geometry),
        materialName: materials[0]?.name || '(none)',
        parentName: object.parent?.name || '(root)',
        visible: object.visible,
        castShadow: object.castShadow,
        receiveShadow: object.receiveShadow,
      });
    });
    meshes.sort((a, b) => b.triangleCount - a.triangleCount);
    const duplicates = [...materialNameCounts.entries()]
      .filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 20);

    console.groupCollapsed('[PORTFOLIO MODEL] GLB diagnostics');
    console.log('Mesh count', meshes.length);
    console.log('Approximate triangle count', meshes.reduce((sum, mesh) => sum + mesh.triangleCount, 0));
    console.log('Material count', materialSet.size);
    console.log('Top 30 heaviest meshes', meshes.slice(0, 30));
    console.log('Duplicate material names (base name)', duplicates);
    console.log('Large textures', largeTextures.slice(0, 20));
    console.groupEnd();
  }

  getMaterialBaseName(name) {
    if (!name) return '(unnamed)';
    return name.match(/^(.*?)(?:\.\d+)?$/)?.[1] || name;
  }

  getApproximateTriangleCount(geometry) {
    if (!geometry) return 0;
    if (geometry.index) return Math.max(0, geometry.index.count / 3);
    const position = geometry.getAttribute?.('position');
    return position ? Math.max(0, position.count / 3) : 0;
  }

  collectMaterialTextures(material) {
    if (!material?.isMaterial) return [];
    return ['map', 'aoMap', 'bumpMap', 'normalMap', 'displacementMap', 'emissiveMap',
      'envMap', 'metalnessMap', 'roughnessMap', 'alphaMap'].flatMap((key) => {
      const texture = material[key];
      if (!texture?.image) return [];
      return [{
        key,
        name: texture.name || key,
        width: texture.image.width ?? 0,
        height: texture.image.height ?? 0,
        src: texture.image.currentSrc || texture.image.src || null,
      }];
    });
  }

  static logMeshHierarchy(mesh) {
    const hierarchy = [];
    let object = mesh;
    while (object) {
      hierarchy.push({ level: hierarchy.length, name: object.name || '(senza nome)', type: object.type });
      object = object.parent;
    }
    console.groupCollapsed(`[Debug] Mesh cliccata: ${mesh.name || '(senza nome)'}`);
    console.table(hierarchy);
    console.log('Mesh:', mesh);
    console.log('Parent:', mesh.parent ?? null);
    console.groupEnd();
  }

  static isVisibleInHierarchy(object) {
    let current = object;
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }

  destroy() {
    this.canvas?.removeEventListener('click', this.onClick);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}

import * as THREE from 'three';
import { isExplicitGlassObject } from './ModelMaterialSafety.js';

const CASE_INSIDE_NAME = /^case_inside_retro(?:[._\s-].*)?$/i;
const CASE_UPSIDE_NAME = /^case_upside(?:[._\s-].*)?$/i;
const MEMORY_NAME = /^(?:memory|ram)(?:[._\s-].*|\d+)?$/i;
const TUBE_NAME = /(?:tube|tubes|pipe|cooling|liquid|hose)/i;
const LABEL_NAME = /^(?:label|text|sarah[_\s-]?lab|logo|nameplate)(?:[._\s-].*)?$/i;
const LED_NAME = /^led(?:[._\s-].*)?$/i;
const PROTECTED_CASE_NAME = /^(?:case|frame|marble)(?:[._\s-].*)?$/i;
const CPU_CORE_NAME = /^(?:cpu_central|cpu_core(?:_|$))/i;

function matchesAnyName(names, pattern) {
  return names.some(
    (name) => typeof name === 'string' && pattern.test(name.trim())
  );
}

function stableMaterialIndex(name, count) {
  let hash = 0;
  for (const character of name) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % count;
}

export default class ApplyingTexture {
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.materials = {};
    this.createMaterials();
  }

  loadColorTexture(path) {
    const texture = this.textureLoader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    return texture;
  }

  loadDataTexture(path) {
    const texture = this.textureLoader.load(path);
    texture.flipY = false;
    return texture;
  }

  createMaterials() {
    // Sostituisci questi placeholder con i nomi dei file in public/textures/.
    const dummyMap = this.loadColorTexture('/textures/dummy/dummy-color.jpg');
    const dummyRoughnessMap = this.loadDataTexture(
      '/textures/dummy/dummy-roughness.jpg'
    );
    const dummyNormalMap = this.loadDataTexture(
      '/textures/dummy/dummy-normal.jpg'
    );
    const tableMap = this.loadColorTexture('/textures/table/table-color.png');
    const tableRoughnessMap = this.loadDataTexture(
      '/textures/table/table-roughness.png'
    );
    const tableNormalMap = this.loadDataTexture(
      '/textures/table/table-normal.png'
    );
    const caseMap = this.loadColorTexture('/textures/case/case-color.png');
    const caseRoughnessMap = this.loadDataTexture(
      '/textures/case/case-roughness.png'
    );
    const caseNormalMap = this.loadDataTexture(
      '/textures/case/case-normal.png'
    );
    const fansMap = this.loadColorTexture('/textures/fans/fans-color.png');
    const fansRoughnessMap = this.loadDataTexture(
      '/textures/fans/fans-roughness.png'
    );
    const fansNormalMap = this.loadDataTexture(
      '/textures/fans/fans-normal.png'
    );
    const fansMetalnessMap = this.loadDataTexture(
      '/textures/fans/fans-metalness.png'
    );
    const plasticMap = this.loadColorTexture(
      '/textures/plastic004/plastic-color.png'
    );
    const plasticRoughnessMap = this.loadDataTexture(
      '/textures/plastic004/plastic-roughness.png'
    );
    const plasticNormalMap = this.loadDataTexture(
      '/textures/plastic004/plastic-normal.png'
    );
    const fanRingMap = this.loadColorTexture(
      '/textures/plastic013a/plastic-color.jpg'
    );
    const fanRingRoughnessMap = this.loadDataTexture(
      '/textures/plastic013a/plastic-roughness.jpg'
    );
    const fanRingNormalMap = this.loadDataTexture(
      '/textures/plastic013a/plastic-normal.jpg'
    );
    const fanOutlineMap = this.loadColorTexture(
      '/textures/metal043a/metal-color.png'
    );
    const fanOutlineRoughnessMap = this.loadDataTexture(
      '/textures/metal043a/metal-roughness.png'
    );
    const fanOutlineNormalMap = this.loadDataTexture(
      '/textures/metal043a/metal-normal.png'
    );
    const fanOutlineMetalnessMap = this.loadDataTexture(
      '/textures/metal043a/metal-metalness.png'
    );
    const outsideComponentsMap = this.loadColorTexture(
      '/textures/metal045a/metal-color.jpg'
    );
    const outsideComponentsRoughnessMap = this.loadDataTexture(
      '/textures/metal045a/metal-roughness.jpg'
    );
    const outsideComponentsNormalMap = this.loadDataTexture(
      '/textures/metal045a/metal-normal.jpg'
    );
    const outsideComponentsMetalnessMap = this.loadDataTexture(
      '/textures/metal045a/metal-metalness.jpg'
    );

    this.materials = {
      dummy: new THREE.MeshStandardMaterial({
        name: 'DummyMaterial',
        map: dummyMap,
        roughnessMap: dummyRoughnessMap,
        normalMap: dummyNormalMap,
        roughness: 0.7,
        metalness: 0,
      }),
      table: new THREE.MeshStandardMaterial({
        name: 'TableMaterial',
        map: tableMap,
        roughnessMap: tableRoughnessMap,
        normalMap: tableNormalMap,
        roughness: 0.85,
        metalness: 0,
      }),
      case: new THREE.MeshStandardMaterial({
        name: 'Marble021Material',
        map: caseMap,
        roughnessMap: caseRoughnessMap,
        normalMap: caseNormalMap,
        roughness: 0.5,
        metalness: 0,
      }),
      metal033: new THREE.MeshStandardMaterial({
        name: 'Metal033Material',
        map: fansMap,
        roughnessMap: fansRoughnessMap,
        normalMap: fansNormalMap,
        metalnessMap: fansMetalnessMap,
        roughness: 0.68,
        metalness: 0.38,
      }),
      memory043a: new THREE.MeshStandardMaterial({
        name: 'MemoryMetal043AMaterial',
        map: fanOutlineMap,
        roughnessMap: fanOutlineRoughnessMap,
        normalMap: fanOutlineNormalMap,
        metalnessMap: fanOutlineMetalnessMap,
        roughness: 0.62,
        metalness: 0.35,
      }),
      tube: new THREE.MeshStandardMaterial({
        name: 'CozySageTubeMaterial',
        color: 0xa9d7c4,
        roughness: 0.42,
        metalness: 0,
        transparent: true,
        opacity: 0.65,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      plastic: new THREE.MeshStandardMaterial({
        name: 'Plastic004Material',
        map: plasticMap,
        roughnessMap: plasticRoughnessMap,
        normalMap: plasticNormalMap,
        roughness: 0.6,
        metalness: 0,
      }),
      fanRing: new THREE.MeshStandardMaterial({
        name: 'Plastic013AMaterial',
        map: fanRingMap,
        roughnessMap: fanRingRoughnessMap,
        normalMap: fanRingNormalMap,
        roughness: 0.58,
        metalness: 0,
        emissive: 0xffd6a3,
        emissiveIntensity: 0,
      }),
      fanOutline: new THREE.MeshStandardMaterial({
        name: 'Metal043AMaterial',
        map: fanOutlineMap,
        roughnessMap: fanOutlineRoughnessMap,
        normalMap: fanOutlineNormalMap,
        metalnessMap: fanOutlineMetalnessMap,
        roughness: 0.65,
        metalness: 0.4,
      }),
      fanExtra: new THREE.MeshStandardMaterial({
        name: 'Metal043ADarkMaterial',
        map: fanOutlineMap,
        roughnessMap: fanOutlineRoughnessMap,
        normalMap: fanOutlineNormalMap,
        metalnessMap: fanOutlineMetalnessMap,
        color: 0x686868,
        roughness: 0.7,
        metalness: 0.35,
      }),
      outsideComponents: new THREE.MeshStandardMaterial({
        name: 'Metal045AMaterial',
        map: outsideComponentsMap,
        roughnessMap: outsideComponentsRoughnessMap,
        normalMap: outsideComponentsNormalMap,
        metalnessMap: outsideComponentsMetalnessMap,
        roughness: 0.65,
        metalness: 0.4,
      }),
      caseFoot: new THREE.MeshStandardMaterial({
        name: 'CaseFootWarmIvoryMaterial',
        color: 0xd8cdbb,
        roughness: 0.72,
        metalness: 0,
        emissive: 0x000000,
        emissiveIntensity: 0,
      }),
      fallbackPalette: [
        [0x1d2222, 0.7, 0.18, 'DarkGraphite'],
        [0x2b2a27, 0.68, 0.08, 'WarmDarkGrey'],
        [0x5c554b, 0.72, 0.05, 'MutedTaupe'],
        [0x4b3b32, 0.62, 0.22, 'DeepBronze'],
        [0x2f3d38, 0.66, 0.12, 'DarkDesaturatedGreen'],
      ].map(
        ([color, roughness, metalness, name]) =>
          new THREE.MeshStandardMaterial({
            name: `Fallback${name}`,
            color,
            roughness,
            metalness,
          })
      ),
    };

    return this.materials;
  }

  applyToModel(root) {
    root?.traverse((child) => {
      if (!child.isMesh) return;

      child.castShadow = true;
      child.receiveShadow = true;

      const sourceMaterials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      const searchableName = [
        child.name,
        ...sourceMaterials.map((material) => material?.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const childName = child.name?.toLowerCase() ?? '';
      const sourceNames = [
        child.name,
        ...sourceMaterials.map((material) => material?.name),
      ];
      const hasTextureMap = sourceMaterials.some((material) => material?.map);
      // Keep the authored glass material; generic component rules must not replace it.
      if (isExplicitGlassObject(child)) return;

      let parent = child.parent;
      let belongsToFan = searchableName.includes('fan');
      let belongsToCaseInside = matchesAnyName(sourceNames, CASE_INSIDE_NAME);
      let belongsToCaseUpside = matchesAnyName(sourceNames, CASE_UPSIDE_NAME);
      let belongsToMemory = matchesAnyName(sourceNames, MEMORY_NAME);
      let belongsToTube = matchesAnyName(sourceNames, TUBE_NAME);
      let belongsToLabel = matchesAnyName(sourceNames, LABEL_NAME);
      let belongsToLed = matchesAnyName(sourceNames, LED_NAME);
      let belongsToProtectedCase = matchesAnyName(
        sourceNames,
        PROTECTED_CASE_NAME
      );
      let isCpuManaged = matchesAnyName(sourceNames, CPU_CORE_NAME);
      let belongsToFanRing = childName.includes('fan_circle');
      let belongsToFanOutline = childName.includes('fan_outline');
      let belongsToFanExtra = childName.startsWith('fan_extra');
      let belongsToCaseFoot = /^foot(?:[._-]?\d+)?$/.test(childName);
      let belongsToOutsideComponent = ['gpu_outside', 'cpu_outside'].includes(
        childName
      );
      let belongsToFanRotor = childName.startsWith('fan_rot_');
      let belongsToMetalHardware = ['screw', 'scres', 'bracket', 'bolt'].some(
        (name) => searchableName.includes(name)
      );
      let belongsToCaseExterior = ['case_exterior', 'case_exerior'].some(
        (name) => child.name?.toLowerCase() === name
      );

      while (parent && parent !== root) {
        const parentName = parent.name?.toLowerCase() ?? '';
        belongsToFan ||= parentName.includes('fan');
        belongsToCaseInside ||= CASE_INSIDE_NAME.test(parentName);
        belongsToCaseUpside ||= CASE_UPSIDE_NAME.test(parentName);
        belongsToMemory ||= MEMORY_NAME.test(parentName);
        belongsToTube ||= TUBE_NAME.test(parentName);
        belongsToLabel ||= LABEL_NAME.test(parentName);
        belongsToLed ||= LED_NAME.test(parentName);
        belongsToProtectedCase ||= PROTECTED_CASE_NAME.test(parentName);
        isCpuManaged ||= CPU_CORE_NAME.test(parentName);
        belongsToFanRing ||= parentName.includes('fan_circle');
        belongsToFanOutline ||= parentName.includes('fan_outline');
        belongsToFanExtra ||= parentName.startsWith('fan_extra');
        belongsToCaseFoot ||= /^foot(?:[._-]?\d+)?$/.test(parentName);
        belongsToOutsideComponent ||= [
          'gpu_outside',
          'cpu_outside',
        ].includes(parentName);
        belongsToFanRotor ||= parentName.startsWith('fan_rot_');
        belongsToMetalHardware ||= [
          'screw',
          'scres',
          'bracket',
          'bolt',
        ].some((name) => parentName.includes(name));
        belongsToCaseExterior ||= ['case_exterior', 'case_exerior'].includes(
          parentName
        );
        parent = parent.parent;
      }

      let material;
      let materialRole;

      if (
        belongsToCaseInside ||
        belongsToCaseUpside ||
        belongsToCaseFoot ||
        belongsToCaseExterior
      ) {
        material = belongsToCaseFoot
          ? this.materials.caseFoot
          : belongsToCaseExterior
            ? this.materials.case
            : this.materials.metal033;
        materialRole = 'case';
      } else if (belongsToTube) {
        material = this.materials.tube;
        materialRole = 'tube';
      } else if (belongsToMemory) {
        material = this.materials.memory043a;
        materialRole = 'memory';
      } else if (belongsToOutsideComponent) {
        material = this.materials.outsideComponents;
        materialRole = 'component';
      } else if (belongsToFanExtra) {
        material = this.materials.fanExtra;
        materialRole = 'fan';
      } else if (belongsToFanOutline) {
        material = this.materials.fanOutline;
        materialRole = 'fan';
      } else if (belongsToFanRing) {
        material = this.materials.fanRing;
        materialRole = 'fan';
      } else if (belongsToFanRotor) {
        material = this.materials.plastic;
        materialRole = 'fan';
      } else if (belongsToMetalHardware) {
        material = this.materials.metal033;
        materialRole = 'hardware';
      } else if (belongsToFan) {
        material = this.materials.metal033;
        materialRole = 'fan';
      } else if (searchableName.includes('dummy')) {
        material = this.materials.dummy;
        materialRole = 'dummy';
      } else if (
        ['table', 'desk', 'tavolo'].some((name) =>
          searchableName.includes(name)
        )
      ) {
        material = this.materials.table;
        materialRole = 'table';
      } else if (
        !hasTextureMap &&
        !belongsToLed &&
        !belongsToLabel &&
        !belongsToProtectedCase &&
        !isCpuManaged
      ) {
        const palette = this.materials.fallbackPalette;
        material = palette[stableMaterialIndex(childName, palette.length)];
        materialRole = 'fallback';
      }

      if (material) {
        child.material = material.clone();
        child.userData.modelMaterialRole = materialRole;
        if (belongsToCaseFoot) child.layers.disable(2);
        child.material.needsUpdate = true;
      }
    });

    // Final override: tube groups and meshes must win over every fallback rule.
    this.applyTubeMaterialOverride(root);
  }

  applyTubeMaterialOverride(root) {
    const tubeMeshes = new Set();

    root?.traverse((object) => {
      if (!TUBE_NAME.test(object.name ?? '')) return;

      if (object.isMesh) tubeMeshes.add(object);
      object.traverse?.((child) => {
        if (child.isMesh) tubeMeshes.add(child);
      });
    });

    tubeMeshes.forEach((mesh) => {
      mesh.material = this.materials.tube.clone();
      mesh.userData.modelMaterialRole = 'tube';
      mesh.material.needsUpdate = true;
    });
  }

  getMaterial(name) {
    return this.materials[name?.toLowerCase()];
  }
}

import * as THREE from 'three';

const PLANT_NAME_PATTERN =
  /(plant|plants|pianta|piante|vine|vines|ivy|leaf|leaves|foliage|grass|rampicante)/i;
const READABLE_GREEN = new THREE.Color('#24822a');
const SUBTLE_EMISSIVE_GREEN = new THREE.Color('#50cd78');

function hasPlantNameInHierarchy(object) {
  let current = object;

  while (current) {
    if (PLANT_NAME_PATTERN.test(current.name ?? '')) return true;
    current = current.parent;
  }

  return false;
}

function isTooDark(color) {
  if (!color?.isColor) return true;

  const hsl = {};
  color.getHSL(hsl);
  return hsl.l < 0.08;
}

/** Makes imported plant materials readable without adding or changing lights. */
export default class PlantMaterialTint {
  constructor({ debug = import.meta.env.DEV } = {}) {
    this.debug = debug;
  }

  apply(root) {
    const modifiedMeshNames = [];

    root?.traverse((object) => {
      if (
        !object.isMesh ||
        !object.material ||
        !hasPlantNameInHierarchy(object)
      ) {
        return;
      }

      const sourceMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const tintStrength = /^plant_gpu(?:[._]|$)/i.test(object.name ?? '')
        ? 0.42
        : 0.18;
      const tintedMaterials = sourceMaterials.map((sourceMaterial) =>
        this.createTintedMaterial(sourceMaterial, tintStrength)
      );

      object.material = Array.isArray(object.material)
        ? tintedMaterials
        : tintedMaterials[0];
      object.castShadow = false;
      object.receiveShadow = true;
      modifiedMeshNames.push(object.name || '(unnamed)');
    });

    if (this.debug) {
      console.info(
        `[PlantMaterialTint] found ${modifiedMeshNames.length} plant meshes`,
        modifiedMeshNames
      );
    }
  }

  createTintedMaterial(sourceMaterial, tintStrength) {
    const clonedMaterial = sourceMaterial.clone();
    const supportsPbrTint =
      clonedMaterial.color?.isColor &&
      'metalness' in clonedMaterial &&
      'roughness' in clonedMaterial;
    const material = supportsPbrTint
      ? clonedMaterial
      : this.createStandardMaterial(clonedMaterial);
    const tooDark = isTooDark(material.color);

    if (tooDark) {
      material.color.copy(READABLE_GREEN);
    } else {
      material.color.lerp(READABLE_GREEN, tintStrength);
    }

    material.metalness = 0;
    material.roughness = 0.8;
    material.side = THREE.DoubleSide;

    if (material.emissive?.isColor) {
      material.emissive.copy(SUBTLE_EMISSIVE_GREEN);
      material.emissiveIntensity = 0.035;
    }

    material.needsUpdate = true;
    return material;
  }

  createStandardMaterial(material) {
    return new THREE.MeshStandardMaterial({
      name: material.name,
      color: material.color?.isColor
        ? material.color.clone()
        : READABLE_GREEN.clone(),
      map: material.map ?? null,
      alphaMap: material.alphaMap ?? null,
      aoMap: material.aoMap ?? null,
      bumpMap: material.bumpMap ?? null,
      normalMap: material.normalMap ?? null,
      displacementMap: material.displacementMap ?? null,
      transparent: material.transparent === true,
      opacity: material.opacity ?? 1,
      alphaTest: material.alphaTest ?? 0,
      depthTest: material.depthTest ?? true,
      depthWrite: material.depthWrite ?? true,
      vertexColors: material.vertexColors === true,
      side: THREE.DoubleSide,
      metalness: 0,
      roughness: 0.8,
    });
  }
}

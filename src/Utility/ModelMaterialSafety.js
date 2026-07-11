import * as THREE from 'three';

const GLASS_NAME = /^(?:(?:glass|transparent_glass|side_glass)(?:[._\s-]|$)|glassfront$|glasstop$)/i;

function hierarchyMatches(object, pattern) {
  let current = object;
  while (current) {
    if (typeof current.name === 'string' && pattern.test(current.name)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function hasExplicitName(object, pattern, material) {
  return (
    hierarchyMatches(object, pattern) ||
    (typeof material?.name === 'string' && pattern.test(material.name))
  );
}

export function isExplicitGlassObject(object) {
  const materials = Array.isArray(object?.material)
    ? object.material
    : [object?.material];
  return materials.some((material) => hasExplicitName(object, GLASS_NAME, material));
}

/**
 * Applies conservative render flags to imported model materials.
 * Transparency is preserved only for explicitly named glass meshes/materials.
 */
export function secureModelMaterials(
  root,
  { cloneMaterials = false, debug = false } = {}
) {
  root?.traverse((object) => {
    if (!object.isMesh || !object.material) return;

    let materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    if (cloneMaterials) {
      materials = materials.map((material) => material?.clone() ?? material);
      object.material = Array.isArray(object.material) ? materials : materials[0];
    }

    materials.forEach((material) => {
      if (!material) return;

      const isGlass = hasExplicitName(object, GLASS_NAME, material);
      const isTube = object.userData.modelMaterialRole === 'tube';
      const isCpuLabel =
        object.userData.modelMaterialRole === 'cpu-core-label';

      material.depthTest = true;

      if (isCpuLabel) {
        material.transparent = true;
        material.opacity = 1;
        material.depthWrite = false;
        material.alphaTest = 0.1;
      } else if (isTube) {
        material.transparent = true;
        material.opacity = Math.min(material.opacity, 0.65);
        material.depthWrite = false;
      } else if (isGlass) {
        material.transparent = true;
        material.opacity = Math.min(material.opacity, 0.22);
        material.depthWrite = false;
      } else {
        material.transparent = false;
        material.opacity = 1;
        material.depthWrite = true;
        material.alphaTest = 0;
        material.alphaHash = false;
        material.alphaToCoverage = false;
        material.premultipliedAlpha = false;
        material.colorWrite = true;
        material.blending = THREE.NormalBlending;
        if ('transmission' in material) material.transmission = 0;
      }

      if (object.userData.cozyLedRole) {
        material.transparent = false;
        material.opacity = 1;
      }

      // The GLB contains many disconnected, inconsistently wound thin surfaces.
      // The diagnostic material test confirmed that all of them need both sides.
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;

      if (debug && (material.transparent || material.opacity < 1)) {
        console.debug('[Material transparency]', {
          mesh: object.name,
          material: material.name,
          opacity: material.opacity,
          transparent: material.transparent,
        });
      }
    });
  });
}

export { GLASS_NAME };

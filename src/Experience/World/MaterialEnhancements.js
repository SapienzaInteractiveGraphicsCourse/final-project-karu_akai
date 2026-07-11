import * as THREE from 'three';

const LAMP_PATTERN = /(lamp|lampada|lampadina|paralume|bulb|shade)/i;
const GLASS_PATTERN = /(glass|vetro|acrylic)/i;
const CABLE_PATTERN = /(cable|tube|pipe|hose|cooling)/i;
const TABLE_PATTERN = /(table|desk|tavolo|wood_table)/i;
const MARBLE_CASE_PATTERN = /(?:^|[\s._-])(?:case(?:_exterior|_exerior)?|frame|marble(?:021)?)(?=$|[\s._-])/i;
const NON_MARBLE_CASE_PATTERN = /(case_inside|case_upside|foot|fan|gpu|cpu|tube|pipe|cooling|memory|ram|screw|bolt|bracket)/i;

function getSearchableName(object, material) {
  const names = [object.name, material?.name];
  let parent = object.parent;

  while (parent) {
    names.push(parent.name);
    parent = parent.parent;
  }

  return names.filter(Boolean).join(' ');
}

function getDirectName(object, material) {
  return [object.name, material?.name].filter(Boolean).join(' ');
}

/** Refines authored materials while preserving their maps and object identity. */
export default class MaterialEnhancements {
  constructor() {
    this.lampBumpTexture = this.createLampBumpTexture();
  }

  apply(root) {
    root?.traverse((object) => {
      if (!object.isMesh || !object.material) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material?.isMaterial) return;

        const searchableName = getSearchableName(object, material);
        const directName = getDirectName(object, material);
        const role = object.userData?.modelMaterialRole ?? '';
        const isExplicitMarbleCase =
          MARBLE_CASE_PATTERN.test(directName) &&
          !NON_MARBLE_CASE_PATTERN.test(directName);
        const isNonMetalCase =
          role === 'case' && (material.metalness ?? 0) <= 0.15;

        if (TABLE_PATTERN.test(searchableName) || role === 'table') {
          this.enhanceTable(material);
          object.receiveShadow = true;
        } else if (isExplicitMarbleCase || isNonMetalCase) {
          this.enhanceMarbleCase(material);
          object.userData.modelMaterialRole = 'case';
        } else if (GLASS_PATTERN.test(searchableName)) {
          this.enhanceGlass(material);
          object.castShadow = false;
        } else if (LAMP_PATTERN.test(searchableName)) {
          this.enhanceLamp(material, searchableName);
        } else if (CABLE_PATTERN.test(searchableName) || role === 'tube') {
          this.enhanceCables(material);
        } else if (['case', 'component', 'hardware', 'fan'].includes(role)) {
          this.enhanceHardware(material, role);
        }

        material.needsUpdate = true;
      });
    });
  }

  enhanceTable(material) {
    // The table should read as matte wood, not as a broad reflector of the
    // neutral RoomEnvironment. Local lamp and LED lights remain visible.
    if ('roughness' in material) material.roughness = 0.68;
    if ('metalness' in material) material.metalness = 0;
    if ('envMapIntensity' in material) material.envMapIntensity = 0.18;
    if ('clearcoat' in material) material.clearcoat = 0.02;
    if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.72;
    if (material.color) material.color.lerp(new THREE.Color(0x56382b), 0.16);
    if (material.normalScale) material.normalScale.setScalar(0.4);
    [material.map, material.roughnessMap, material.normalMap].forEach((texture) => {
      if (texture) texture.anisotropy = Math.max(texture.anisotropy ?? 1, 8);
    });
  }

  enhanceMarbleCase(material) {
    // Keep the marble readable as ivory stone instead of a white studio reflector.
    if ('roughness' in material) material.roughness = 0.72;
    if ('metalness' in material) material.metalness = 0;
    if ('envMapIntensity' in material) material.envMapIntensity = 0.16;
    if (material.color) material.color.lerp(new THREE.Color(0xd6cbbf), 0.2);
    if (material.normalScale) material.normalScale.setScalar(0.38);
    if (material.emissive) material.emissive.set(0x000000);
    if ('emissiveIntensity' in material) material.emissiveIntensity = 0;
  }

  enhanceGlass(material) {
    if ('roughness' in material) material.roughness = 0.12;
    if ('metalness' in material) material.metalness = 0;
    if ('envMapIntensity' in material) material.envMapIntensity = 1.15;
    if ('ior' in material) material.ior = 1.46;
    if ('transmission' in material) material.transmission = 0.12;
    if ('thickness' in material) material.thickness = 0.08;
    material.transparent = true;
    material.opacity = Math.min(material.opacity ?? 1, 0.42);
    material.depthWrite = false;
    material.side = THREE.DoubleSide;
  }

  enhanceLamp(material, searchableName) {
    if (/paralume|shade/i.test(searchableName)) {
      if ('roughness' in material) material.roughness = 0.82;
      if ('metalness' in material) material.metalness = 0;
      material.side = THREE.DoubleSide;
      return;
    }

    if (/bulb|lampadina/i.test(searchableName)) {
      if ('roughness' in material) material.roughness = 0.28;
      if ('metalness' in material) material.metalness = 0;
      return;
    }

    if ('roughness' in material) material.roughness = 0.48;
    if ('metalness' in material) {
      material.metalness = Math.min(material.metalness ?? 0, 0.12);
    }
    if ('envMapIntensity' in material) material.envMapIntensity = 0.78;
    if ('bumpMap' in material && !material.bumpMap) {
      material.bumpMap = this.lampBumpTexture;
      material.bumpScale = 0.018;
    }
  }

  enhanceCables(material) {
    if ('roughness' in material) material.roughness = 0.36;
    if ('metalness' in material) material.metalness = 0;
    if ('envMapIntensity' in material) material.envMapIntensity = 0.72;
  }

  enhanceHardware(material, role) {
    const sourceMetalness = material.metalness ?? 0;

    if (role === 'case' && sourceMetalness <= 0.15) {
      this.enhanceMarbleCase(material);
      return;
    }

    const isMetal =
      ['component', 'hardware'].includes(role) ||
      ((role === 'fan' || role === 'case') && sourceMetalness > 0.15);

    if ('roughness' in material) {
      material.roughness = isMetal
        ? THREE.MathUtils.clamp(material.roughness ?? 0.55, 0.34, 0.62)
        : THREE.MathUtils.clamp(material.roughness ?? 0.62, 0.54, 0.74);
    }
    if ('envMapIntensity' in material) {
      material.envMapIntensity = isMetal ? 0.7 : 0.4;
    }
  }

  createLampBumpTexture() {
    const size = 128;
    const data = new Uint8Array(size * size);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const grain = Math.sin(x * 0.73 + Math.sin(y * 0.17) * 2.1) * 8;
        const fineNoise = Math.sin(x * 2.37 + y * 1.91) * 4;
        data[y * size + x] = THREE.MathUtils.clamp(
          Math.round(128 + grain + fineNoise),
          0,
          255
        );
      }
    }

    const texture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RedFormat,
      THREE.UnsignedByteType
    );
    texture.name = 'LampSatinProceduralBump';
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5);
    texture.needsUpdate = true;
    return texture;
  }
}

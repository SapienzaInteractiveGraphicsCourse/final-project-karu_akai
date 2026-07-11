import * as THREE from 'three';

const PALETTE = {
  warmIvory: 0xfff1d0,
  champagne: 0xd9b77a,
  softAmber: 0xc9822f,
  sageGlow: 0x9fd6c2,
};

const COZY_BLOOM_LAYER = 2;

const ROLE_CONFIG = {
  fan: { color: 'champagne', intensity: 0.28, breathing: true },
  motherboard: { color: 'softAmber', intensity: 0.34 },
  cpuCore: {
    color: 'warmIvory',
    baseColor: 'warmIvory',
    intensity: 0.32,
  },
  label: { color: 'sageGlow', baseColor: 'sageGlow', intensity: 0.2 },
  logo: { color: 'warmIvory', intensity: 0.18 },
  accent: { color: 'sageGlow', intensity: 0.3 },
};

const ROLE_PATTERNS = {
  fan: [/fan[_\s-]?(circle|ring|led)/, /(circle|ring)[_\s-]?fan/],
  motherboard: [
    /(motherboard|mainboard|mobo).*(led|light)/,
    /(led|light).*(motherboard|mainboard|mobo)/,
    /(capacitor|chip|component)[_\s-]?(led|light)/,
    /lights?[_\s-]?ram/,
  ],
  logo: [
    /(^|\s)led[_\s-]?logo[_\s-]?ivory(?:\.\d+)?(\s|$)/,
    /(^|\s)(logo|wordmark|text(?:\.\d+)?)(\s|$)/,
    /(label).*(led|light|glow)/,
  ],
  accent: [
    /(sci[_\s-]?fi|accent|detail).*(led|light|glow)/,
    /(led|light|glow).*(sci[_\s-]?fi|accent|detail)/,
    /(^|\s)(led|light\d*)(\s|$)/,
  ],
};

/** Warm, restrained emissive materials for the case lighting. */
export default class CozyLedMaterials {
  constructor({
    enabled = true,
    intensityScale = 1,
    breathingAmount = 0.035,
    breathingPeriod = 9,
  } = {}) {
    this.enabled = enabled;
    this.intensityScale = intensityScale;
    this.breathingAmount = breathingAmount;
    this.breathingPeriod = breathingPeriod;
    this.elapsed = 0;
    this.leds = [];
  }

  applyToModel(root) {
    root?.traverse((object) => {
      if (!object.isMesh || !object.material || object.userData.cozyLedRole) {
        return;
      }
      if (this.isCaseFoot(object)) {
        object.layers.disable(COZY_BLOOM_LAYER);
        return;
      }
      const role = this.findRole(object);
      if (role) this.assign(object, role);
    });
  }

  isCaseFoot(object) {
    let current = object;

    while (current) {
      const name = current.name?.toLowerCase() ?? '';
      if (/^foot(?:[._-]?\d+)?$/.test(name)) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }

  findRole(object) {
    const names = [object.name];
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    names.push(...materials.map((material) => material?.name));

    let parent = object.parent;
    while (parent) {
      names.push(parent.name);
      parent = parent.parent;
    }

    if (
      names.some((name) =>
        /^(?:label|text|sarah[_\s-]?lab|logo|nameplate)(?:[._\s-].*)?$/i.test(
          name ?? ''
        )
      )
    ) {
      return 'label';
    }

    if (names.some((name) => /^led(?:[._\s-]|$)/i.test(name ?? ''))) {
      return 'accent';
    }

    const searchableName = names.filter(Boolean).join(' ').toLowerCase();
    return Object.entries(ROLE_PATTERNS).find(([, patterns]) =>
      patterns.some((pattern) => pattern.test(searchableName))
    )?.[0];
  }

  /** Explicit assignment is useful when a mesh name is not descriptive. */
  assign(object, role = 'accent', overrides = {}) {
    if (!object?.isMesh || !ROLE_CONFIG[role]) return null;

    const config = { ...ROLE_CONFIG[role], ...overrides };
    const sourceMaterials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const ledMaterialIndices = config.materialIndices ?? sourceMaterials.map(
      (_, index) => index
    );
    const ledMaterials = [];
    const assignedMaterials = sourceMaterials.map((source, index) => {
      if (!ledMaterialIndices.includes(index)) return source;

      const material = source.clone();
      material.name = `CozyLed_${role}_${object.name || index}`;
      material.emissive = new THREE.Color(PALETTE[config.color] ?? config.color);
      if (config.baseColor && material.color) {
        material.color = new THREE.Color(
          PALETTE[config.baseColor] ?? config.baseColor
        );
      }
      material.emissiveIntensity = 0;
      material.transparent = false;
      material.opacity = 1;
      material.depthWrite = true;
      material.depthTest = true;
      // Case accents remain inside the same exposure/tone-mapping hierarchy as
      // the lamp instead of bypassing ACES and visually dominating the scene.
      material.toneMapped = true;
      material.needsUpdate = true;
      ledMaterials.push(material);
      return material;
    });

    object.material = Array.isArray(object.material)
      ? assignedMaterials
      : assignedMaterials[0];
    object.userData.cozyLedRole = role;
    object.userData.cozyLedMaterialIndices = ledMaterialIndices;
    if (this.enabled) object.layers.enable(COZY_BLOOM_LAYER);
    else object.layers.disable(COZY_BLOOM_LAYER);
    object.renderOrder = 0;
    this.leds.push({
      object,
      materials: ledMaterials,
      baseIntensity: config.intensity,
      breathing: Boolean(config.breathing),
    });
    this.updateIntensities();
    return object.material;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.leds.forEach(({ object }) => {
      if (this.enabled) object.layers.enable(COZY_BLOOM_LAYER);
      else object.layers.disable(COZY_BLOOM_LAYER);
    });
    this.updateIntensities();
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  setIntensityScale(scale) {
    this.intensityScale = Math.max(0, scale);
    this.updateIntensities();
  }

  update(delta) {
    this.elapsed += Math.min(delta, 100) / 1000;
    this.updateIntensities();
  }

  updateIntensities() {
    const phase = (this.elapsed / this.breathingPeriod) * Math.PI * 2;
    const breathingScale = 1 + Math.sin(phase) * this.breathingAmount;

    this.leds.forEach(({ materials, baseIntensity, breathing }) => {
      const intensity = this.enabled
        ? baseIntensity * this.intensityScale * (breathing ? breathingScale : 1)
        : 0;
      materials.forEach((material) => {
        material.emissiveIntensity = intensity;
      });
    });
  }
}

export { COZY_BLOOM_LAYER, PALETTE as COZY_LED_PALETTE };

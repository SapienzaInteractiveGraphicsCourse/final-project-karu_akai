import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { COZY_BLOOM_LAYER } from '../utils/CozyLedMaterials.js';
import { DESKTOP_VISUAL_CONFIG } from './VisualConfig.js';

const { renderer: RENDERER_CONFIG, postProcessing: POST_CONFIG } =
  DESKTOP_VISUAL_CONFIG;

const bloomCompositeShader = {
  uniforms: {
    baseTexture: { value: null },
    bloomTexture: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
    }
  `,
};

const cinematicFinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: POST_CONFIG.vignette.offset },
    softness: { value: POST_CONFIG.vignette.softness },
    darkness: { value: POST_CONFIG.vignette.darkness },
    warmth: { value: POST_CONFIG.vignette.warmth },
    contrast: { value: POST_CONFIG.vignette.contrast },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float softness;
    uniform float darkness;
    uniform float warmth;
    uniform float contrast;
    varying vec2 vUv;

    void main() {
      vec4 source = texture2D(tDiffuse, vUv);
      vec2 centeredUv = vUv - 0.5;
      float vignette = smoothstep(offset, offset + softness, dot(centeredUv, centeredUv));
      float luminance = dot(source.rgb, vec3(0.2126, 0.7152, 0.0722));
      float shadowWeight = 1.0 - smoothstep(0.04, 0.42, luminance);
      float highlightWeight = smoothstep(0.28, 1.1, luminance);
      vec3 coolShadows = vec3(0.97, 1.0, 1.035);
      vec3 warmHighlights = vec3(1.0 + warmth, 1.0, 1.0 - warmth * 0.72);
      vec3 graded = source.rgb * mix(vec3(1.0), coolShadows, shadowWeight * 0.24);
      graded *= mix(vec3(1.0), warmHighlights, highlightWeight);
      graded = (graded - 0.18) * contrast + 0.18;
      graded *= 1.0 - vignette * darkness;
      gl_FragColor = vec4(graded, source.a);
    }
  `,
};

export default class Renderer {
  constructor(experience) {
    this.experience = experience;
    this.canvas = experience.canvas;
    this.sizes = experience.sizes;
    this.scene = experience.scene;
    this.camera = experience.camera;
    this.available = false;
    this.errorMessage = null;

    try {
      this.instance = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch (error) {
      this.instance = null;
      this.errorMessage = error?.message || 'Unable to create a WebGL context.';
      this.showFallbackState();
      return;
    }

    this.available = true;
    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = RENDERER_CONFIG.exposureOff;
    this.instance.shadowMap.enabled = true;
    this.instance.shadowMap.type = THREE.PCFShadowMap;
    this.nonBloomMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.nonBloomTransparentMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.bloomMaterialCache = new Map();
    this.bloomLayer = new THREE.Layers();
    this.bloomLayer.set(COZY_BLOOM_LAYER);

    this.bloomComposer = new EffectComposer(this.instance);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(
      new RenderPass(this.scene, this.camera.instance)
    );
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.sizes.width, this.sizes.height),
      POST_CONFIG.bloom.strength,
      POST_CONFIG.bloom.radius,
      POST_CONFIG.bloom.threshold
    );
    this.bloomComposer.addPass(this.bloomPass);

    const compositePass = new ShaderPass(bloomCompositeShader, 'baseTexture');
    compositePass.material.uniforms.bloomTexture.value =
      this.bloomComposer.renderTarget2.texture;

    this.finalComposer = new EffectComposer(this.instance);
    this.finalComposer.addPass(new RenderPass(this.scene, this.camera.instance));

    if (POST_CONFIG.ambientOcclusion.enabled) {
      const ao = POST_CONFIG.ambientOcclusion;
      this.ambientOcclusionPass = new SSAOPass(
        this.scene,
        this.camera.instance,
        Math.max(1, Math.round(this.sizes.width * ao.resolutionScale)),
        Math.max(1, Math.round(this.sizes.height * ao.resolutionScale)),
        ao.kernelSize
      );
      this.ambientOcclusionPass.output = SSAOPass.OUTPUT.Default;
      this.ambientOcclusionPass.kernelRadius = ao.kernelRadius;
      this.ambientOcclusionPass.minDistance = ao.minDistance;
      this.ambientOcclusionPass.maxDistance = ao.maxDistance;
      this.excludeDecorativeMeshesFromSSAO(this.ambientOcclusionPass);
      const setAmbientOcclusionSize =
        this.ambientOcclusionPass.setSize.bind(this.ambientOcclusionPass);
      this.ambientOcclusionPass.setSize = (width, height) => {
        setAmbientOcclusionSize(
          Math.max(1, Math.round(width * ao.resolutionScale)),
          Math.max(1, Math.round(height * ao.resolutionScale))
        );
      };
      this.finalComposer.addPass(this.ambientOcclusionPass);
    }

    this.finalComposer.addPass(compositePass);
    this.cinematicFinishPass = new ShaderPass(cinematicFinishShader);
    this.finalComposer.addPass(this.cinematicFinishPass);
    this.finalComposer.addPass(new OutputPass());

    this.resize();
  }

  setPowerAmount(amount) {
    if (!this.available || !this.instance) return;

    const power = THREE.MathUtils.clamp(amount, 0, 1);
    this.instance.toneMappingExposure = THREE.MathUtils.lerp(
      RENDERER_CONFIG.exposureOff,
      RENDERER_CONFIG.exposureOn,
      power
    );
  }

  excludeDecorativeMeshesFromSSAO(pass) {
    const overrideVisibility = pass._overrideVisibility.bind(pass);
    const restoreVisibility = pass._restoreVisibility.bind(pass);
    const visibilityCache = [];

    pass._overrideVisibility = () => {
      overrideVisibility();
      visibilityCache.length = 0;

      this.scene.traverse((object) => {
        if (!object.userData?.excludeFromSSAO) return;
        visibilityCache.push({ object, visible: object.visible });
        object.visible = false;
      });
    };

    pass._restoreVisibility = () => {
      visibilityCache.forEach(({ object, visible }) => {
        object.visible = visible;
      });
      visibilityCache.length = 0;
      restoreVisibility();
    };
  }

  showFallbackState() {
    const loadingScreen = document.querySelector('#loading-screen');
    if (loadingScreen) {
      loadingScreen.innerHTML = `
        <p>WebGL is unavailable in this browser or environment.</p>
        <p>Please try a desktop browser with hardware acceleration enabled.</p>
      `;
    }

    if (this.canvas) {
      this.canvas.style.display = 'none';
    }
  }

  resize() {
    if (!this.available || !this.instance) return;

    this.instance.setSize(this.sizes.width, this.sizes.height);
    const pixelRatio = Math.min(
      this.sizes.pixelRatio,
      RENDERER_CONFIG.maxPixelRatio
    );
    this.instance.setPixelRatio(pixelRatio);
    this.bloomComposer?.setSize(this.sizes.width, this.sizes.height);
    this.bloomComposer?.setPixelRatio(pixelRatio);
    this.finalComposer?.setSize(this.sizes.width, this.sizes.height);
    this.finalComposer?.setPixelRatio(pixelRatio);
  }

  update() {
    if (!this.available || !this.instance) return;

    const background = this.scene.background;

    this.scene.background = new THREE.Color(0x000000);
    this.hideNonBloomMaterials();
    this.bloomComposer.render();
    this.restoreMaterials();

    this.scene.background = background;
    this.finalComposer.render();
  }

  hideNonBloomMaterials() {
    this.scene.traverse((object) => {
      if (!object.isMesh || !object.material) return;

      const indices = object.userData?.cozyLedMaterialIndices;
      const isBloomObject = object.layers.test(this.bloomLayer);

      if (!isBloomObject) {
        this.bloomMaterialCache.set(object, object.material);
        if (Array.isArray(object.material)) {
          object.material = object.material.map((material) =>
            material.transparent
              ? this.nonBloomTransparentMaterial
              : this.nonBloomMaterial
          );
        } else {
          object.material = object.material.transparent
            ? this.nonBloomTransparentMaterial
            : this.nonBloomMaterial;
        }
        return;
      }

      if (!Array.isArray(object.material) || !indices) return;
      if (indices.length === object.material.length) return;

      this.bloomMaterialCache.set(object, object.material);
      object.material = object.material.map((material, index) =>
        indices.includes(index) ? material : this.nonBloomMaterial
      );
    });
  }

  restoreMaterials() {
    this.bloomMaterialCache.forEach((material, object) => {
      object.material = material;
    });
    this.bloomMaterialCache.clear();
  }
}

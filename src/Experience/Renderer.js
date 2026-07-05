import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { COZY_BLOOM_LAYER } from '../utils/CozyLedMaterials.js';

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

export default class Renderer {
  constructor(experience) {
    this.experience = experience;
    this.canvas = experience.canvas;
    this.sizes = experience.sizes;
    this.scene = experience.scene;
    this.camera = experience.camera;

    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });

    this.instance.outputColorSpace = THREE.SRGBColorSpace;
    this.instance.toneMapping = THREE.ACESFilmicToneMapping;
    this.instance.toneMappingExposure = 0.9;
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
      0.3,
      0.22,
      0.9
    );
    this.bloomComposer.addPass(this.bloomPass);

    const compositePass = new ShaderPass(bloomCompositeShader, 'baseTexture');
    compositePass.material.uniforms.bloomTexture.value =
      this.bloomComposer.renderTarget2.texture;

    this.finalComposer = new EffectComposer(this.instance);
    this.finalComposer.addPass(new RenderPass(this.scene, this.camera.instance));
    this.finalComposer.addPass(compositePass);
    this.finalComposer.addPass(new OutputPass());

    this.resize();
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height);
    this.instance.setPixelRatio(this.sizes.pixelRatio);
    this.bloomComposer?.setSize(this.sizes.width, this.sizes.height);
    this.bloomComposer?.setPixelRatio(this.sizes.pixelRatio);
    this.finalComposer?.setSize(this.sizes.width, this.sizes.height);
    this.finalComposer?.setPixelRatio(this.sizes.pixelRatio);
  }

  update() {
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

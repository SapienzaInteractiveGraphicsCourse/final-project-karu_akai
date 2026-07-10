import * as THREE from 'three';
import Sizes from './Utils/Sizes.js';
import Time from './Utils/Time.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import World from './World/World.js';
import RaycasterController from './Controls/RaycasterController.js';
import InteractionStateManager from './InteractionState.js';
import DebugUtils from '../utils/DebugUtils.js';

let instance = null;

export default class Experience {
  constructor(canvas) {
    if (instance) {
      return instance;
    }

    instance = this;

    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070a);
    this.interactions = new InteractionStateManager();
    this.interactionState = this.interactions;

    this.sizes = new Sizes();
    this.time = new Time();
    this.camera = new Camera(this);
    this.renderer = new Renderer(this);

    if (!this.renderer.available) {
      this.world = null;
      this.raycasterController = null;
      this.debugUtils = null;
    } else {
      this.world = new World(this);
      this.raycasterController = new RaycasterController(this);
      this.debugUtils = new DebugUtils({
        canvas: this.canvas,
        camera: this.camera.instance,
        scene: this.scene,
      });
    }

    this.sizes.on('resize', () => {
      this.resize();
    });

    this.time.on('tick', () => {
      this.update();
    });
  }

  resize() {
    this.camera.resize();
    this.renderer.resize();
  }

  update() {
    this.camera.update();
    this.world?.update(this.time.delta);
    this.raycasterController?.update();
    this.renderer?.update();
  }
}

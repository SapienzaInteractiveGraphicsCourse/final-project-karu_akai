import * as THREE from 'three';
import Sizes from './Utils/Sizes.js';
import Time from './Utils/Time.js';
import Camera from './Camera.js';
import Renderer from './Renderer.js';
import World from './World/World.js';
import RaycasterController from './Controls/RaycasterController.js';
import InteractionStateManager, {
  InteractionState,
} from './InteractionState.js';
import GuidanceOverlay from './UI/GuidanceOverlay.js';
import DebugUtils from '../Utility/DebugUtils.js';

let instance = null;

const INITIAL_GUIDANCE_MESSAGE = 'Pull the chain to wake up the system.';
const EXPLORE_GUIDANCE_MESSAGE =
  'Click a component to explore. Drag to look around and scroll to zoom.';
const IDLE_POWERED_OFF_MESSAGE = 'Start by pulling the lamp chain.';
const IDLE_POWERED_ON_MESSAGE =
  'Not sure where to start? Click Dummy or any component inside the case.';

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
    this.guidanceOverlay = null;
    this.hasShownExploreGuidance = false;
    this.mainSceneCameraSettled = false;

    if (!this.renderer.available) {
      this.world = null;
      this.raycasterController = null;
      this.debugUtils = null;
    } else {
      const debugParameter = new URLSearchParams(window.location.search).get('debug');
      const debugEnabled = debugParameter === '1';
      this.debugUtils = new DebugUtils({
        canvas: this.canvas,
        cameraController: this.camera,
        scene: this.scene,
        interactions: this.interactions,
        enabled: debugEnabled,
      });
      this.guidanceOverlay = new GuidanceOverlay();
      this.world = new World(this);
      this.raycasterController = new RaycasterController(this);
      this.setupGuidanceEvents();
    }

    this.sizes.on('resize', () => {
      this.resize();
    });

    this.time.on('tick', () => {
      this.update();
    });
  }

  setupGuidanceEvents() {
    this.guidanceOverlay?.startIdleTimer(() => this.getGuidanceIdleContext());

    this.camera.on('mainSceneCameraSettled', () => {
      this.mainSceneCameraSettled = true;
      this.tryShowExploreGuidance();
      this.guidanceOverlay?.startIdleTimer();
    });
  }

  onPortfolioModelLoaded() {
    const powerExperience = this.world?.portfolioModel?.powerExperience;
    powerExperience?.on('transitionComplete', ({ poweredOn }) => {
      if (poweredOn) this.tryShowExploreGuidance();
      this.guidanceOverlay?.startIdleTimer();
    });

    const loadingScreen = document.querySelector('#loading-screen');
    this.guidanceOverlay
      ?.showAfterTransition(loadingScreen, INITIAL_GUIDANCE_MESSAGE, {
        duration: 5500,
      })
      .then((wasShown) => {
        if (wasShown) this.guidanceOverlay?.startIdleTimer();
      });
  }

  tryShowExploreGuidance() {
    const powerExperience = this.world?.portfolioModel?.powerExperience;
    if (
      this.hasShownExploreGuidance ||
      !this.mainSceneCameraSettled ||
      !powerExperience?.poweredOn ||
      powerExperience.isTransitioning ||
      !this.isGuidanceAvailable()
    ) {
      return;
    }

    this.hasShownExploreGuidance = true;
    this.guidanceOverlay?.show(EXPLORE_GUIDANCE_MESSAGE, {
      duration: 6500,
    });
  }

  isGuidanceAvailable() {
    const loadingScreen = document.querySelector('#loading-screen');
    return Boolean(
      this.world?.portfolioModel?.loadedModel &&
      (!loadingScreen || loadingScreen.classList.contains('hidden')) &&
      this.interactions.is(InteractionState.READY) &&
      !this.interactions.hasTransitionLocks() &&
      !this.raycasterController?.sectionPanel?.currentSection &&
      this.camera.controls.enabled
    );
  }

  getGuidanceIdleContext() {
    const portfolioModel = this.world?.portfolioModel;
    const powerExperience = portfolioModel?.powerExperience;
    const loadingScreen = document.querySelector('#loading-screen');
    const sectionIsOpen =
      this.interactions.is(InteractionState.SECTION_OPEN) ||
      Boolean(this.raycasterController?.sectionPanel?.currentSection);
    const transitionIsActive =
      this.interactions.is(InteractionState.TRANSITIONING) ||
      this.interactions.hasTransitionLocks() ||
      powerExperience?.isTransitioning ||
      !this.camera.controls.enabled;

    if (
      !portfolioModel?.loadedModel ||
      !powerExperience ||
      (loadingScreen && !loadingScreen.classList.contains('hidden')) ||
      sectionIsOpen ||
      transitionIsActive
    ) {
      return null;
    }

    return powerExperience.poweredOn
      ? {
          eligible: true,
          key: 'powered-on',
          message: IDLE_POWERED_ON_MESSAGE,
          duration: 6500,
        }
      : {
          eligible: true,
          key: 'powered-off',
          message: IDLE_POWERED_OFF_MESSAGE,
          duration: 5500,
        };
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

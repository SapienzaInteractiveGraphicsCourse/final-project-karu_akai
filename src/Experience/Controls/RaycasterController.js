import * as THREE from 'three';
import { InteractionState } from '../InteractionState.js';
import SectionPanel from '../UI/SectionPanel.js';
import { CLICK_LAYER } from '../World/PortfolioModel.js';

const CAMERA_MAIN_TRANSITION = 'camera:main';
const CAMERA_SECTION_TRANSITION = 'camera:section';

export default class RaycasterController {
  constructor(experience) {
    this.experience = experience;
    this.camera = experience.camera;
    this.interactions = experience.interactions;
    this.world = experience.world;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.layers.set(CLICK_LAYER);
    this.hoveredObject = null;

    this.sectionPanel = new SectionPanel({
      canClose: () => this.interactions.canCloseSection(),
      onClose: () => {
        this.beginMainCameraTransition();
        this.experience.camera.moveToDefault();
      },
    });
    this.resetViewButton = document.querySelector('#reset-view');

    this.camera.on('transitionComplete', (payload) => {
      this.onCameraTransitionComplete(payload);
    });

    window.addEventListener('pointermove', (event) => {
      this.onPointerMove(event);
    });

    window.addEventListener('click', (event) => {
      this.onClick(event);
    });

    this.resetViewButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!this.interactions.canOpenSection()) return;

      this.sectionPanel.close({ force: true });
      this.beginMainCameraTransition();
      this.camera.moveToView('case');
    });
  }

  update() {}

  onPointerMove(event) {
    if (this.sectionPanel.contains(event.target)) {
      this.updateHoveredObject(null);
      return;
    }

    this.updateMouseCoordinates(event);

    const hoveredObject = this.getActionableClickTarget(
      this.getClickIntersections()
    );

    this.updateHoveredObject(hoveredObject);
  }

  updateHoveredObject(object) {
    if (object === this.hoveredObject) return;

    this.hoveredObject = object;

    document.body.classList.toggle(
      'is-hovering-clickable',
      Boolean(this.hoveredObject)
    );
  }

  onClick(event) {
    if (this.sectionPanel.contains(event.target)) {
      return;
    }

    this.updateMouseCoordinates(event);

    const intersections = this.getClickIntersections();

    if (intersections.length === 0) {
      return;
    }

    const clickedObject = this.getActionableClickTarget(intersections);

    if (!clickedObject) {
      return;
    }

    const sectionId = clickedObject.userData.sectionId;
    const powerExperience = this.world.portfolioModel.powerExperience;

    if (powerExperience?.isPowerTarget(clickedObject)) {
      if (!this.interactions.canTogglePower()) return;

      const nextPoweredOn = !powerExperience.poweredOn;
      this.interactions.beginTransition('power', {
        nextState: nextPoweredOn
          ? InteractionState.READY
          : InteractionState.DARK,
      });

      if (!powerExperience.handleClick(clickedObject)) {
        this.interactions.completeTransition('power', {
          nextState: powerExperience.poweredOn
            ? InteractionState.READY
            : InteractionState.DARK,
        });
        return;
      }

      if (clickedObject.name === 'CLICK_CHAIN') {
        this.world.portfolioModel.animatorChain?.trigger();
        if (powerExperience.poweredOn) {
          this.beginMainCameraTransition();
          this.camera.moveToView('case');
        }
      }

      if (!powerExperience.isTransitioning) {
        this.interactions.completeTransition('power', {
          nextState: powerExperience.poweredOn
            ? InteractionState.READY
            : InteractionState.DARK,
        });
      }

      return;
    }

    if (
      !sectionId ||
      !powerExperience?.poweredOn ||
      !this.interactions.canOpenSection()
    ) {
      return;
    }

    this.interactions.beginTransition(CAMERA_SECTION_TRANSITION, {
      nextState: InteractionState.SECTION_OPEN,
    });
    this.sectionPanel.open(sectionId);
    this.camera.setCalibrationTarget(clickedObject);
    this.camera.moveToPreset(clickedObject.name);

    if (clickedObject.name === 'CLICK_DUMMY') {
      this.world.portfolioModel.dummyAnimator?.triggerWave();
    }
  }

  beginMainCameraTransition() {
    this.interactions.beginTransition(CAMERA_MAIN_TRANSITION, {
      nextState: this.getMainSceneState(),
    });
  }

  getMainSceneState() {
    return this.world.portfolioModel.powerExperience?.poweredOn
      ? InteractionState.READY
      : InteractionState.DARK;
  }

  onCameraTransitionComplete({ presetName } = {}) {
    if (this.interactions.hasTransition(CAMERA_SECTION_TRANSITION)) {
      this.interactions.completeTransition(CAMERA_SECTION_TRANSITION, {
        nextState: InteractionState.SECTION_OPEN,
      });
      this.camera.setControlsEnabled(false);
      return;
    }

    if (
      presetName === 'DEFAULT' &&
      this.interactions.hasTransition(CAMERA_MAIN_TRANSITION)
    ) {
      this.interactions.completeTransition(CAMERA_MAIN_TRANSITION, {
        nextState: this.getMainSceneState(),
      });
      this.camera.setControlsEnabled(true);
    }
  }

  isClickTargetActionable(object) {
    if (!object) return false;

    const powerExperience = this.world.portfolioModel.powerExperience;
    if (powerExperience?.isPowerTarget(object)) {
      return this.interactions.canTogglePower();
    }

    return Boolean(
      object.userData.sectionId &&
      powerExperience?.poweredOn &&
      this.interactions.canOpenSection()
    );
  }

  getActionableClickTarget(intersections) {
    const visitedTargets = new Set();

    for (const intersection of intersections) {
      const target = this.getClickTarget(intersection.object);

      if (!target || visitedTargets.has(target)) {
        continue;
      }

      visitedTargets.add(target);

      if (this.isClickTargetActionable(target)) {
        return target;
      }
    }

    return null;
  }

  getClickTarget(object) {
    let currentObject = object;

    while (currentObject) {
      if (currentObject.userData.isClickTarget) {
        return currentObject;
      }

      currentObject = currentObject.parent;
    }

    return null;
  }

  updateMouseCoordinates(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  getClickIntersections() {
    const clickTargets = this.world.portfolioModel.clickTargets;

    if (clickTargets.length === 0) {
      return [];
    }

    this.raycaster.setFromCamera(this.mouse, this.camera.instance);
    return this.raycaster.intersectObjects(clickTargets, true);
  }

}

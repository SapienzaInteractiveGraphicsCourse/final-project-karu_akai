import * as THREE from 'three';
import SectionPanel from '../UI/SectionPanel.js';
import { CLICK_LAYER } from '../World/PortfolioModel.js';

export default class RaycasterController {
  constructor(experience) {
    this.experience = experience;
    this.camera = experience.camera;
    this.world = experience.world;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.layers.set(CLICK_LAYER);
    this.hoveredObject = null;

    this.sectionPanel = new SectionPanel({
      onClose: () => {
        this.experience.camera.moveToDefault();
      },
    });
    this.resetViewButton = document.querySelector('#reset-view');

    window.addEventListener('pointermove', (event) => {
      this.onPointerMove(event);
    });

    window.addEventListener('click', (event) => {
      this.onClick(event);
    });

    this.resetViewButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.sectionPanel.close();
      this.camera.moveToView('case');
    });
  }

  update() {}

  onPointerMove(event) {
    this.updateMouseCoordinates(event);

    const intersections = this.getClickIntersections();
    const firstObject = intersections[0]?.object ?? null;

    if (firstObject !== this.hoveredObject) {
      this.hoveredObject = firstObject;

      document.body.classList.toggle(
        'is-hovering-clickable',
        Boolean(this.hoveredObject)
      );
    }
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

    const clickedObject = this.getClickTarget(intersections[0].object);

    if (!clickedObject) {
      return;
    }

    const sectionId = clickedObject.userData.sectionId;

    console.log(`Clicked: ${clickedObject.name}`);

    const powerExperience = this.world.portfolioModel.powerExperience;
    if (powerExperience?.handleClick(clickedObject)) {
      if (clickedObject.name === 'CLICK_CHAIN') {
        this.world.portfolioModel.animatorChain?.trigger();
        if (powerExperience.poweredOn) {
          this.camera.moveToView('case');
        }
      }
      console.log(`[Raycaster] Power ${powerExperience.poweredOn ? 'on' : 'off'}`);
      return;
    }

    this.sectionPanel.open(sectionId);
    this.camera.setCalibrationTarget(clickedObject);
    this.camera.moveToPreset(clickedObject.name);

    if (clickedObject.name === 'CLICK_DUMMY') {
      console.log('[Raycaster] CLICK_DUMMY received, triggering wave');
      this.world.portfolioModel.dummyAnimator?.triggerWave();
    }
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

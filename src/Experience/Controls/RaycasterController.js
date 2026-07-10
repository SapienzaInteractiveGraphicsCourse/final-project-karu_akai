import * as THREE from 'three';
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

    this.sectionPanel = document.querySelector('#section-panel');
    this.panelTitle = document.querySelector('#section-panel-title');
    this.panelText = document.querySelector('#section-panel-text');
    this.previousPageButton = document.querySelector('#previous-panel-page');
    this.nextPageButton = document.querySelector('#next-panel-page');
    this.closePanelButton = document.querySelector('#close-panel');
    this.resetViewButton = document.querySelector('#reset-view');
    this.currentSectionPages = [];
    this.currentPageIndex = 0;

    window.addEventListener('pointermove', (event) => {
      this.onPointerMove(event);
    });

    window.addEventListener('click', (event) => {
      this.onClick(event);
    });

    this.closePanelButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.sectionPanel?.classList.remove('visible');
      this.resetPanelPagination();
      this.experience.camera.moveToDefault();
    });

    this.resetViewButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      this.sectionPanel?.classList.remove('visible');
      this.resetPanelPagination();
      this.camera.moveToView('case');
    });

    this.previousPageButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (this.currentPageIndex > 0) {
        this.currentPageIndex -= 1;
        this.renderCurrentPanelPage();
      }
    });

    this.nextPageButton?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (this.currentPageIndex < this.currentSectionPages.length - 1) {
        this.currentPageIndex += 1;
        this.renderCurrentPanelPage();
      }
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
    if (event.target.closest?.('#section-panel')) {
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

    const section = clickedObject.userData.section;

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

    this.openSectionPanel(section);
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

  openSectionPanel(section) {
    if (!this.sectionPanel || !section) {
      return;
    }

    this.currentSectionPages = Array.isArray(section.pages)
      ? section.pages
      : [section];
    this.currentPageIndex = 0;
    this.sectionPanel.classList.add('visible');
    this.renderCurrentPanelPage();
  }

  renderCurrentPanelPage() {
    const page = this.currentSectionPages[this.currentPageIndex];

    if (!page) {
      if (this.previousPageButton) this.previousPageButton.hidden = true;
      if (this.nextPageButton) this.nextPageButton.hidden = true;
      return;
    }

    if (this.panelTitle) this.panelTitle.textContent = page.title ?? '';
    if (this.panelText) this.panelText.textContent = page.text ?? '';

    if (this.previousPageButton) {
      this.previousPageButton.hidden = this.currentPageIndex === 0;
    }
    if (this.nextPageButton) {
      this.nextPageButton.hidden =
        this.currentPageIndex >= this.currentSectionPages.length - 1;
    }
  }

  resetPanelPagination() {
    this.currentSectionPages = [];
    this.currentPageIndex = 0;

    if (this.previousPageButton) this.previousPageButton.hidden = true;
    if (this.nextPageButton) this.nextPageButton.hidden = true;
  }
}

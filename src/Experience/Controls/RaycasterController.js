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
    this.closePanelButton = document.querySelector('#close-panel');

    window.addEventListener('pointermove', (event) => {
      this.onPointerMove(event);
    });

    window.addEventListener('click', (event) => {
      this.onClick(event);
    });

    this.closePanelButton?.addEventListener('click', () => {
      this.sectionPanel?.classList.remove('visible');
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
    this.updateMouseCoordinates(event);

    const intersections = this.getClickIntersections();

    if (intersections.length === 0) {
      return;
    }

    const clickedObject = intersections[0].object;
    const section = clickedObject.userData.section;

    console.log('Clicked:', clickedObject.name, section.title);

    this.openSectionPanel(section);
    this.camera.moveToPreset(clickedObject.name);
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

    this.sectionPanel.querySelector('h2').textContent = section.title;
    this.sectionPanel.querySelector('p:not(.panel-kicker)').textContent =
      section.text;
    this.sectionPanel.classList.add('visible');
  }
}

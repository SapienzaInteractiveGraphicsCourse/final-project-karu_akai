import * as THREE from 'three';

/** Helpers that inspect the scene without changing its interactive state. */
export default class DebugUtils {
  constructor({ canvas, camera, scene, enabled = true }) {
    this.canvas = canvas;
    this.camera = camera;
    this.scene = scene;
    this.enabled = enabled;
    this.pointer = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.onClick = this.onClick.bind(this);
    this.canvas?.addEventListener('click', this.onClick, { passive: true });
  }

  onClick(event) {
    if (!this.enabled || !this.canvas || !this.camera || !this.scene) return;

    const bounds = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    this.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersection = this.raycaster
      .intersectObjects(this.scene.children, true)
      .find(({ object }) => DebugUtils.isVisibleInHierarchy(object));

    if (intersection) DebugUtils.logMeshHierarchy(intersection.object);
  }

  static logMeshHierarchy(mesh) {
    const hierarchy = [];
    let object = mesh;

    while (object) {
      hierarchy.push({
        level: hierarchy.length,
        name: object.name || '(senza nome)',
        type: object.type,
      });
      object = object.parent;
    }

    console.groupCollapsed(`[Debug] Mesh cliccata: ${mesh.name || '(senza nome)'}`);
    console.table(hierarchy);
    console.log('Mesh:', mesh);
    console.log('Parent:', mesh.parent ?? null);
    console.groupEnd();
  }

  static isVisibleInHierarchy(object) {
    let current = object;

    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }

    return true;
  }

  destroy() {
    this.canvas?.removeEventListener('click', this.onClick);
  }
}

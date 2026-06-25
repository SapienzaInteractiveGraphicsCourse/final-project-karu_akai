import * as THREE from 'three';

export default class Environment {
  constructor(experience) {
    this.scene = experience.scene;

    this.setLights();
    this.setTable();
  }

  setLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const coolLight = new THREE.PointLight(0x69d2ff, 2.8, 8);
    coolLight.position.set(-2.8, 2.2, 2.6);
    this.scene.add(coolLight);

    const warmLight = new THREE.PointLight(0xffc68a, 1.8, 7);
    warmLight.position.set(2.5, 1.6, -2.5);
    this.scene.add(warmLight);
  }

  setTable() {
    const tableGeometry = new THREE.BoxGeometry(5.6, 0.16, 3.2);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a211c,
      roughness: 0.72,
      metalness: 0.08,
    });

    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.set(0, -0.08, 0);
    table.receiveShadow = true;
    this.scene.add(table);
  }
}

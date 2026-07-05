import * as THREE from 'three';

export default class Environment {
  constructor(experience) {
    this.scene = experience.scene;

    this.setBackground();
    this.setLights();
    this.setTable();
  }

  setBackground() {
    const background = new THREE.TextureLoader().load(
      '/textures/background/library-background.png'
    );
    background.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = background;
  }

  setLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.08);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 0.22);
    this.keyLight.position.set(4, 6, 4);
    this.keyLight.castShadow = true;
    this.scene.add(this.keyLight);

    this.coolLight = new THREE.PointLight(0x69d2ff, 0.12, 8);
    this.coolLight.position.set(-2.8, 2.2, 2.6);
    this.scene.add(this.coolLight);

    this.warmLight = new THREE.PointLight(0xffc68a, 0.08, 7);
    this.warmLight.position.set(2.5, 1.6, -2.5);
    this.scene.add(this.warmLight);
  }

  setPowerAmount(amount) {
    const power = THREE.MathUtils.clamp(amount, 0, 1);
    this.ambientLight.intensity = THREE.MathUtils.lerp(0.08, 0.34, power);
    this.keyLight.intensity = THREE.MathUtils.lerp(0.22, 1.6, power);
    this.coolLight.intensity = THREE.MathUtils.lerp(0.12, 1.1, power);
    this.warmLight.intensity = THREE.MathUtils.lerp(0.08, 1.25, power);
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

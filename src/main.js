import './style.css';

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';

// -----------------------------------------------------------------------------
// Base scene
// -----------------------------------------------------------------------------

const canvas = document.querySelector('#webgl');
const loadingScreen = document.querySelector('#loading-screen');
const sectionPanel = document.querySelector('#section-panel');
const closePanelButton = document.querySelector('#close-panel');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(4, 2.4, 5.2);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.05, 0);

// -----------------------------------------------------------------------------
// Lights
// -----------------------------------------------------------------------------

const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4, 6, 4);
keyLight.castShadow = true;
scene.add(keyLight);

const coolLight = new THREE.PointLight(0x69d2ff, 2.8, 8);
coolLight.position.set(-2.8, 2.2, 2.6);
scene.add(coolLight);

const warmLight = new THREE.PointLight(0xffc68a, 1.8, 7);
warmLight.position.set(2.5, 1.6, -2.5);
scene.add(warmLight);

// -----------------------------------------------------------------------------
// Temporary floor/table placeholder
// -----------------------------------------------------------------------------

const tableGeometry = new THREE.BoxGeometry(5.6, 0.16, 3.2);
const tableMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a211c,
  roughness: 0.72,
  metalness: 0.08,
});

const table = new THREE.Mesh(tableGeometry, tableMaterial);
table.position.set(0, -0.08, 0);
table.receiveShadow = true;
scene.add(table);

// Questo placeholder serve solo finché non carichiamo il GLB.
const placeholderGroup = new THREE.Group();
scene.add(placeholderGroup);

const caseGeometry = new THREE.BoxGeometry(1.8, 1.7, 1.05);
const caseMaterial = new THREE.MeshStandardMaterial({
  color: 0xf2f2f2,
  roughness: 0.38,
  metalness: 0.12,
});

const placeholderCase = new THREE.Mesh(caseGeometry, caseMaterial);
placeholderCase.position.set(0.45, 0.85, 0);
placeholderCase.castShadow = true;
placeholderCase.receiveShadow = true;
placeholderGroup.add(placeholderCase);

const glassGeometry = new THREE.PlaneGeometry(1.55, 1.35);
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x9bdcff,
  transparent: true,
  opacity: 0.24,
  roughness: 0.05,
  metalness: 0.0,
  transmission: 0.35,
});

const placeholderGlass = new THREE.Mesh(glassGeometry, glassMaterial);
placeholderGlass.position.set(0.45, 0.86, 0.531);
placeholderGlass.castShadow = false;
placeholderGroup.add(placeholderGlass);

const dummyGeometry = new THREE.CapsuleGeometry(0.22, 0.7, 4, 12);
const dummyMaterial = new THREE.MeshStandardMaterial({
  color: 0x333333,
  roughness: 0.65,
});

const placeholderDummy = new THREE.Mesh(dummyGeometry, dummyMaterial);
placeholderDummy.position.set(-1.3, 0.62, 0.25);
placeholderDummy.castShadow = true;
placeholderGroup.add(placeholderDummy);

// -----------------------------------------------------------------------------
// Raycasting setup
// -----------------------------------------------------------------------------

const CLICK_LAYER = 1;

const raycaster = new THREE.Raycaster();
raycaster.layers.set(CLICK_LAYER);

const mouse = new THREE.Vector2();
const clickTargets = [];

let hoveredObject = null;
let loadedModel = null;
let activeCameraTween = null;

const SECTION_BY_OBJECT = {
  CLICK_DUMMY: {
    title: 'Intro',
    text: 'Dummy introduces the interactive portfolio and guides the visitor through the scene.',
  },
  CLICK_CPU: {
    title: 'About me',
    text: 'Personal profile, background, and main interests.',
  },
  CLICK_GPU: {
    title: 'Projects',
    text: 'Selected technical and creative projects.',
  },
  CLICK_RAM: {
    title: 'Academic',
    text: 'University path, relevant exams, and academic skills.',
  },
  CLICK_FANS: {
    title: 'Work experience',
    text: 'Professional experiences, tutoring, and applied activities.',
  },
  CLICK_CABLES: {
    title: 'Hobby and interests',
    text: 'Creative interests, drawing, games, cinema, and personal passions.',
  },
  CLICK_CASE: {
    title: 'Contact me',
    text: 'Contact information and external links.',
  },
};

// -----------------------------------------------------------------------------
// GLB loading
// -----------------------------------------------------------------------------

const loader = new GLTFLoader();

loader.load(
  '/models/portfolio_case.glb',

  (gltf) => {
    loadedModel = gltf.scene;
    scene.add(loadedModel);

    // Quando il modello vero arriva, togliamo il placeholder.
    placeholderGroup.visible = false;

    loadedModel.traverse((object) => {
      if (object.name?.startsWith('CLICK_')) {
        setupClickTarget(object);
      } else if (object.isMesh) {
        setupVisibleMesh(object);
      }
    });

    console.log('GLB loaded correctly.');
    console.log(
      'Click targets found:',
      clickTargets.map((target) => target.name)
    );

    hideLoadingScreen();
  },

  undefined,

  (error) => {
    console.warn(
      'GLB not found yet. The placeholder scene will remain visible.',
      error
    );

    // Non è un errore grave ora: non hai ancora esportato il modello.
    hideLoadingScreen();
  }
);

function setupVisibleMesh(object) {
  object.castShadow = true;
  object.receiveShadow = true;

  if (object.material) {
    object.material.needsUpdate = true;
  }
}

function setupClickTarget(object) {
  object.layers.set(CLICK_LAYER);
  object.userData.isClickTarget = true;

  const sectionData = SECTION_BY_OBJECT[object.name];

  object.userData.section = sectionData ?? {
    title: object.name,
    text: 'Section content not assigned yet.',
  };

  if (object.isMesh) {
    object.material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    });
  }

  clickTargets.push(object);
}

function hideLoadingScreen() {
  loadingScreen.classList.add('hidden');
}

// -----------------------------------------------------------------------------
// Interaction
// -----------------------------------------------------------------------------

window.addEventListener('pointermove', onPointerMove);
window.addEventListener('click', onClick);

closePanelButton.addEventListener('click', () => {
  sectionPanel.classList.remove('visible');
});

function onPointerMove(event) {
  updateMouseCoordinates(event);

  const intersections = getClickIntersections();
  const firstObject = intersections[0]?.object ?? null;

  if (firstObject !== hoveredObject) {
    hoveredObject = firstObject;

    document.body.classList.toggle(
      'is-hovering-clickable',
      Boolean(hoveredObject)
    );

    if (hoveredObject) {
      //console.log('Hover:', hoveredObject.name);
    }
  }
}

function onClick(event) {
  updateMouseCoordinates(event);

  const intersections = getClickIntersections();

  if (intersections.length === 0) {
    return;
  }

  const intersection = intersections[0];
  const clickedObject = intersection.object;
  const section = clickedObject.userData.section;

  console.log('Clicked:', clickedObject.name, section.title);
  console.log('Intersection point:', intersection.point);

  focusCameraOn(clickedObject, intersection.point);
  openSectionPanel(section);
}

function updateMouseCoordinates(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function getClickIntersections() {
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(clickTargets, true);
}

function openSectionPanel(section) {
  sectionPanel.querySelector('h2').textContent = section.title;
  sectionPanel.querySelector('p:not(.panel-kicker)').textContent = section.text;
  sectionPanel.classList.add('visible');
}

// -----------------------------------------------------------------------------
// Camera transition
// -----------------------------------------------------------------------------

function focusCameraOn(object, hitPoint) {
  const cameraDistanceByTarget = {
    CLICK_DUMMY: 1.7,
    CLICK_CPU: 0.9,
    CLICK_GPU: 1.0,
    CLICK_RAM: 0.85,
    CLICK_FANS: 1.05,
    CLICK_CABLES: 1.0,
    CLICK_CASE: 2.6,
  };

  const box = new THREE.Box3().setFromObject(object);
  const focusTarget = new THREE.Vector3();

  if (!box.isEmpty()) {
    box.getCenter(focusTarget);
  } else if (hitPoint) {
    focusTarget.copy(hitPoint);
  } else {
    object.getWorldPosition(focusTarget);
  }

  if (object.name === 'CLICK_DUMMY') {
    focusTarget.y += 0.35;
  } else {
    focusTarget.y += 0.08;
  }

  const distance = cameraDistanceByTarget[object.name] ?? 1.2;

  const oldCameraPosition = camera.position.clone();
  const oldControlsTarget = controls.target.clone();

  // Manteniamo l'angolo di vista attuale e accorciamo la distanza dal target.
  const cameraDirection = oldCameraPosition.clone().sub(oldControlsTarget);

  if (cameraDirection.lengthSq() === 0) {
    camera.getWorldDirection(cameraDirection).multiplyScalar(-1);
  }

  cameraDirection.normalize();

  const newCameraPosition = focusTarget
    .clone()
    .add(cameraDirection.multiplyScalar(distance));

  console.log('Camera focus target clicked:', object.name);
  console.log('Old camera position:', oldCameraPosition);
  console.log('New camera position:', newCameraPosition);
  console.log('Focus target:', focusTarget);

  if (activeCameraTween) {
    activeCameraTween.stop();
  }

  controls.enabled = false;

  const cameraState = {
    cameraX: camera.position.x,
    cameraY: camera.position.y,
    cameraZ: camera.position.z,
    targetX: controls.target.x,
    targetY: controls.target.y,
    targetZ: controls.target.z,
  };

  activeCameraTween = new TWEEN.Tween(cameraState)
    .to(
      {
        cameraX: newCameraPosition.x,
        cameraY: newCameraPosition.y,
        cameraZ: newCameraPosition.z,
        targetX: focusTarget.x,
        targetY: focusTarget.y,
        targetZ: focusTarget.z,
      },
      950
    )
    .easing(TWEEN.Easing.Cubic.InOut)
    .onUpdate(() => {
      camera.position.set(
        cameraState.cameraX,
        cameraState.cameraY,
        cameraState.cameraZ
      );
      controls.target.set(
        cameraState.targetX,
        cameraState.targetY,
        cameraState.targetZ
      );
      camera.lookAt(controls.target);
    })
    .onComplete(() => {
      controls.enabled = true;
      controls.update();
      activeCameraTween = null;
    })
    .start();
}

// -----------------------------------------------------------------------------
// Resize
// -----------------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// -----------------------------------------------------------------------------
// Animation loop
// -----------------------------------------------------------------------------

function animate(time) {
  requestAnimationFrame(animate);

  TWEEN.update(time);

  if (controls.enabled) {
    controls.update();
  }

  // Piccola animazione provvisoria del placeholder Dummy.
  placeholderDummy.rotation.y += 0.01;

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

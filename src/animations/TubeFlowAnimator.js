import * as THREE from 'three';

const DEBUG_TUBE_FLOW = false;
const LOG_TUBE_FLOW_DIAGNOSTICS = false;
// Small paths stay separate until the two large front tubes are visually confirmed.
const ENABLE_SMALL_TUBE_FLOW = false;
const FLOW_COLOR = 0xc8fff0;
const FLOW_EMISSIVE = 0x72f5d2;
const FLOW_COLOR_VALUE = new THREE.Color(FLOW_COLOR);
const FLOW_EMISSIVE_VALUE = new THREE.Color(FLOW_EMISSIVE);
const BALL_SEGMENTS = 12;

const LARGE_TUBE_PATHS = [
  {
    name: 'large_tube_front_upper',
    type: 'large',
    radius: 0.11,
    speed: 0.10,
    balls: 4,
    points: [
      // Model-local centerline sampled from the GLB mesh named "Tube".
      new THREE.Vector3(0.992, 3.888, 6.090),
      new THREE.Vector3(0.361, 1.520, 6.493),
      new THREE.Vector3(-0.857, 0.496, 6.809),
      new THREE.Vector3(-2.592, -1.006, 6.603),
      new THREE.Vector3(-4.543, -2.523, 6.646),
      new THREE.Vector3(-5.949, -3.008, 6.443),
      new THREE.Vector3(-7.815, -3.879, 5.675),
      new THREE.Vector3(-9.360, -4.228, 4.980),
      new THREE.Vector3(-10.065, -3.967, 3.918),
    ],
  },
  {
    name: 'large_tube_front_lower',
    type: 'large',
    radius: 0.10,
    speed: 0.10,
    balls: 4,
    points: [
      // Model-local centerline sampled from the GLB mesh named "Tube.001".
      new THREE.Vector3(1.031, 3.776, 4.225),
      new THREE.Vector3(0.502, 1.230, 4.899),
      new THREE.Vector3(-0.622, 0.141, 5.350),
      new THREE.Vector3(-2.220, -1.435, 5.367),
      new THREE.Vector3(-4.022, -2.899, 5.822),
      new THREE.Vector3(-5.357, -3.343, 5.888),
      new THREE.Vector3(-7.144, -4.134, 5.536),
      new THREE.Vector3(-8.623, -4.324, 5.051),
      new THREE.Vector3(-9.269, -3.994, 4.012),
    ],
  },
];

const SMALL_TUBE_PATHS = [
  {
    name: 'small_memory_flow_a',
    type: 'small',
    radius: 0.020,
    speed: 0.22,
    balls: 5,
    points: [
      new THREE.Vector3(0.18, 0.76, -0.02),
      new THREE.Vector3(0.28, 0.78, -0.08),
      new THREE.Vector3(0.36, 0.80, -0.12),
      new THREE.Vector3(0.42, 0.78, -0.08),
    ],
  },
  {
    name: 'small_memory_flow_b',
    type: 'small',
    radius: 0.016,
    speed: 0.24,
    balls: 5,
    points: [
      new THREE.Vector3(0.14, 0.70, 0.04),
      new THREE.Vector3(0.22, 0.74, -0.02),
      new THREE.Vector3(0.30, 0.76, -0.06),
      new THREE.Vector3(0.38, 0.74, -0.04),
    ],
  },
  {
    name: 'small_gpu_flow_a',
    type: 'small',
    radius: 0.018,
    speed: 0.20,
    balls: 4,
    points: [
      new THREE.Vector3(0.10, 0.82, -0.06),
      new THREE.Vector3(0.18, 0.86, -0.10),
      new THREE.Vector3(0.26, 0.84, -0.14),
      new THREE.Vector3(0.32, 0.80, -0.12),
    ],
  },
];

export class TubeFlowAnimator {
  constructor({ parent, scene = null, enabled = false, debug = DEBUG_TUBE_FLOW } = {}) {
    this.parent = parent;
    this.scene = scene;
    this.enabled = Boolean(enabled);
    this.powerAmount = this.enabled ? 1 : 0;
    this.debug = Boolean(debug);
    this.elapsedTime = 0;
    this.hasLoggedFirstUpdate = false;
    this.largeCurves = [];
    this.smallCurves = [];
    this.spheres = [];
    this.group = new THREE.Group();
    this.group.name = 'TubeFlowAnimator_Group';
    this.group.visible = true;
    this.group.renderOrder = 999;
    this.group.frustumCulled = false;
    if (this.parent) {
      this.parent.add(this.group);
    } else {
      this.scene?.add(this.group);
    }
    // Curves and GLB tube meshes now share model-local coordinates.
    this.group.position.set(0, 0, 0);

    this.largeGroup = new THREE.Group();
    this.largeGroup.name = 'LargeTubeFlow_Group';
    this.group.add(this.largeGroup);

    this.smallGroup = new THREE.Group();
    this.smallGroup.name = 'SmallTubeFlow_Group';
    this.smallGroup.visible = ENABLE_SMALL_TUBE_FLOW;
    this.group.add(this.smallGroup);

    this.createCurves();
    this.createBalls();
    this.createDebugMarkers();
    this.setPoweredOn(this.enabled);
    this.logDiagnostics();

    if (typeof window !== 'undefined') {
      window.debugTubeFlow = () => {
        console.log('[TubeFlow] animator', this);
        console.log(
          '[TubeFlow] scene matches',
          this.scene?.getObjectsByProperty?.('name', 'TubeFlowAnimator_Group') ?? []
        );
        return this;
      };
      window.debugTubeMesh = (meshName) => {
        const root = this.parent ?? this.scene;
        const normalizedName = String(meshName ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
        let mesh = root?.getObjectByName(meshName) ?? null;

        if (!mesh && normalizedName) {
          root?.traverse((object) => {
            const candidate = (object.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!mesh && candidate === normalizedName) mesh = object;
          });
        }

        if (!mesh) {
          console.warn('[TubeFlow] mesh not found', meshName);
          return null;
        }

        root?.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const localCenter = this.group.worldToLocal(center.clone());
        const result = {
          name: mesh.name,
          worldPosition: mesh.getWorldPosition(new THREE.Vector3()).toArray(),
          boxMin: box.min.toArray(),
          boxMax: box.max.toArray(),
          center: center.toArray(),
          centerInTubeFlowGroup: localCenter.toArray(),
          size: size.toArray(),
          parent: mesh.parent?.name ?? null,
        };
        console.log('[TubeFlow] mesh debug', result);
        return result;
      };
    }
  }

  createCurves() {
    this.largeCurves = this.createCurveSet(LARGE_TUBE_PATHS, this.largeGroup);
    this.smallCurves = this.createCurveSet(SMALL_TUBE_PATHS, this.smallGroup);
  }

  createCurveSet(definitions, group) {
    return definitions.map((definition) => {
      // Centripetal interpolation reduces corner overshoot while preserving the sampled path.
      const curve = new THREE.CatmullRomCurve3(definition.points, false, 'centripetal');
      curve.name = definition.name;
      curve.userData = {
        type: definition.type,
        radius: definition.radius,
        speed: definition.speed,
        balls: definition.balls,
      };

      if (this.debug) {
        const line = this.createDebugLine(curve, definition.name, definition.radius);
        group.add(line);
      }

      return curve;
    });
  }

  createBalls() {
    this.ballGeometry = new THREE.SphereGeometry(1, BALL_SEGMENTS, BALL_SEGMENTS);
    const material = new THREE.MeshStandardMaterial({
      name: 'TubeFlowBallMaterial',
      color: FLOW_COLOR,
      emissive: FLOW_EMISSIVE,
      emissiveIntensity: 0.34,
      roughness: 0.2,
      metalness: 0,
      transparent: false,
      opacity: 1,
      toneMapped: true,
      depthWrite: true,
    });

    this.createBallsForCurves(this.largeCurves, material, 'LargeTubeFlow', this.largeGroup);
    if (ENABLE_SMALL_TUBE_FLOW) {
      this.createBallsForCurves(this.smallCurves, material, 'SmallTubeFlow', this.smallGroup);
    }
  }

  createBallsForCurves(curves, material, prefix, group) {
    curves.forEach((curve, curveIndex) => {
      const { balls, radius } = curve.userData;
      for (let ballIndex = 0; ballIndex < balls; ballIndex += 1) {
        const index = this.spheres.length + 1;
        const sphere = new THREE.Mesh(this.ballGeometry, material.clone());
        sphere.name = `${prefix}_Ball_${String(index).padStart(2, '0')}`;
        sphere.scale.setScalar(radius);
        sphere.userData.curve = curve;
        sphere.userData.speed = curve.userData.speed;
        sphere.userData.offset = (ballIndex / balls + curveIndex * 0.08) % 1;
        sphere.position.copy(curve.getPointAt(sphere.userData.offset));
        sphere.castShadow = false;
        sphere.receiveShadow = false;
        sphere.renderOrder = 999;
        sphere.frustumCulled = false;
        sphere.material.depthTest = false;

        group.add(sphere);
        this.spheres.push(sphere);
      }
    });
  }

  createDebugLine(curve, name, radius) {
    const points = curve.getPoints(60);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: FLOW_COLOR,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.name = `${name}_DebugLine`;
    return line;
  }

  createDebugMarkers() {
    if (!this.debug) return;

    const firstCurve = this.largeCurves[0] ?? this.smallCurves[0];
    const firstBall = this.spheres[0];
    if (!firstCurve || !firstBall) return;

    const markerGeometry = new THREE.SphereGeometry(0.09, 16, 16);
    const createMarker = (name, color, position) => {
      const marker = new THREE.Mesh(
        markerGeometry,
        new THREE.MeshBasicMaterial({ color, depthTest: false })
      );
      marker.name = name;
      marker.position.copy(position);
      marker.renderOrder = 1000;
      marker.frustumCulled = false;
      this.group.add(marker);
    };

    createMarker('TubeFlow_Debug_FirstCurvePoint', 0xff0000, firstCurve.getPointAt(0));
    createMarker('TubeFlow_Debug_FirstBallPosition', 0x00ff00, firstBall.position);
  }

  logDiagnostics() {
    if (!LOG_TUBE_FLOW_DIAGNOSTICS) return;

    const firstBall = this.spheres[0];
    const firstBallWorldPosition = new THREE.Vector3();
    firstBall?.getWorldPosition(firstBallWorldPosition);
    console.log('[TubeFlow] created', {
      largePaths: LARGE_TUBE_PATHS.length,
      smallPaths: SMALL_TUBE_PATHS.length,
      largeCurves: this.largeCurves.length,
      smallCurves: this.smallCurves.length,
      smallPathsEnabled: ENABLE_SMALL_TUBE_FLOW,
      balls: this.spheres.length,
      poweredOn: this.enabled,
      groupVisible: this.group.visible,
      groupParent: this.group.parent?.name ?? null,
      groupPosition: this.group.position.toArray(),
      firstBallLocalPosition: firstBall?.position.toArray() ?? null,
      firstBallWorldPosition: firstBall ? firstBallWorldPosition.toArray() : null,
      firstBallVisible: firstBall?.visible ?? null,
      firstBallRadius: firstBall?.scale.x ?? null,
      firstBallMaterial: firstBall
        ? {
            color: `#${firstBall.material.color.getHexString()}`,
            opacity: firstBall.material.opacity,
            transparent: firstBall.material.transparent,
          }
        : null,
    });
  }

  setPoweredOn(isOn) {
    this.enabled = Boolean(isOn);
    this.setPowerAmount(this.powerAmount);
  }

  setPowerAmount(amount) {
    this.powerAmount = THREE.MathUtils.clamp(amount ?? 0, 0, 1);
    this.group.visible = true;
    this.spheres.forEach((sphere) => {
      sphere.visible = true;
      const material = sphere.material;
      material.color
        .set(0x06120f)
        .lerp(FLOW_COLOR_VALUE, this.powerAmount);
      material.emissive
        .set(0x000000)
        .lerp(FLOW_EMISSIVE_VALUE, this.powerAmount);
      material.emissiveIntensity = 0.34 * this.powerAmount;
      material.opacity = 1;
    });
    if (LOG_TUBE_FLOW_DIAGNOSTICS) {
      console.log('[TubeFlow] powered state', {
        poweredOn: this.enabled,
        groupVisible: this.group.visible,
        visibleBalls: this.spheres.filter((sphere) => sphere.visible).length,
      });
    }
  }

  update(delta) {
    const deltaTime = Math.min(delta > 1 ? delta / 1000 : delta, 0.1);
    if (!this.hasLoggedFirstUpdate && LOG_TUBE_FLOW_DIAGNOSTICS) {
      this.hasLoggedFirstUpdate = true;
      console.log('[TubeFlow] first update', {
        delta,
        deltaTime,
        poweredOn: this.enabled,
        firstBallPosition: this.spheres[0]?.position.toArray() ?? null,
      });
    }
    if (!this.enabled) return;

    this.elapsedTime += deltaTime;
    this.spheres.forEach((sphere) => {
      const { curve, speed, offset } = sphere.userData;
      const t = (this.elapsedTime * speed + offset) % 1;
      sphere.position.copy(curve.getPointAt(t));
    });
  }
}

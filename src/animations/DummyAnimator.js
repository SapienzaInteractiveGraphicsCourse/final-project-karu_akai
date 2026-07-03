import * as THREE from 'three';

export class DummyAnimator {
  constructor({ dummyRoot, renderer, debug = false }) {
    this.renderer = renderer;
    this.debug = debug;
    this.dummyRoot = dummyRoot;

    this.objectsByName = new Map();
    this.dummyRoot?.traverse((child) => {
      if (child.name) {
        this.objectsByName.set(child.name, child);
      }
    });

    this.pointer = new THREE.Vector2(0, 0);

    this.body = this.getPart('Dummy_body');
    this.neck = this.getPart('Dummy_neck');
    this.head = this.getPart('Dummy_head');
    this.rightShoulderAnchor = this.getPart('Dummy_shoulder_right');
    this.rightElbowAnchor = this.getPart('Dummy_elbow_right');
    this.rightWristAnchor = this.getPart('Dummy_wrist_right');
    this.rightUpperArm =
      this.getPart('Dummy_arm_right') ?? this.getPart('Dummy_arm_rigth');
    this.rightForearm =
      this.getPart('Dummy_arm_right001') ??
      this.getPart('Dummy_arm_rigth001') ??
      this.getPart('Dummy_arm_right.001') ??
      this.getPart('Dummy_arm_rigth.001');
    this.rightHand =
      this.getPart('Dummy_right_hand') ?? this.getPart('Dummy_rigth_hand');

    this.rightShoulderPivot = null;
    this.rightElbowPivot = null;
    this.rightWristPivot = null;
    this.rightShoulderNeutralRotation = null;
    this.rightElbowNeutralRotation = null;
    this.rightWristNeutralRotation = null;
    this.isWaving = false;
    this.waveTime = 0;

    this.neutralPose = {
      body: this.body?.rotation.clone(),
      neck: this.neck?.rotation.clone(),
      head: this.head?.rotation.clone(),
    };

    console.log('[DummyAnimator] parts:', {
      body: this.body?.name,
      neck: this.neck?.name,
      head: this.head?.name,
      rightShoulderAnchor: this.rightShoulderAnchor?.name,
      rightElbowAnchor: this.rightElbowAnchor?.name,
      rightWristAnchor: this.rightWristAnchor?.name,
      rightUpperArm: this.rightUpperArm?.name,
      rightForearm: this.rightForearm?.name,
      rightHand: this.rightHand?.name,
    });

    this.setupRightShoulderPivot();
    this.setupRightElbowPivot();
    this.setupRightWristPivot();

    this.enabled = Boolean(
      this.renderer?.domElement && this.body && this.neck && this.head
    );

    this.onPointerMove = this.onPointerMove.bind(this);
    window.addEventListener('pointermove', this.onPointerMove);
  }

  getPart(name) {
    return this.objectsByName?.get(name) ?? null;
  }

  setupRightShoulderPivot() {
    if (this.rightShoulderPivot) return;

    if (!this.rightShoulderAnchor) {
      console.warn('[DummyAnimator] Missing Dummy_shoulder_right');
      return;
    }

    if (!this.rightUpperArm) {
      console.warn('[DummyAnimator] Missing Dummy_arm_right');
      return;
    }

    this.dummyRoot.updateWorldMatrix(true, true);

    const shoulderWorldPosition = new THREE.Vector3();
    this.rightShoulderAnchor.getWorldPosition(shoulderWorldPosition);
    const pivotParent =
      this.body || this.rightShoulderAnchor.parent || this.dummyRoot;

    const pivot = new THREE.Group();
    pivot.name = 'rightShoulderPivot';
    const shoulderLocalPosition = pivotParent.worldToLocal(
      shoulderWorldPosition.clone()
    );
    pivot.position.copy(shoulderLocalPosition);
    pivotParent.add(pivot);

    pivot.attach(this.rightUpperArm);

    this.rightShoulderPivot = pivot;
    this.rightShoulderNeutralRotation = pivot.rotation.clone();

    console.log(
      '[DummyAnimator] rightShoulderPivot created at Dummy_shoulder_right'
    );
  }

  setupRightElbowPivot() {
    if (this.rightElbowPivot) return;

    if (!this.rightShoulderPivot || !this.rightElbowAnchor) {
      console.warn('[DummyAnimator] Missing right elbow anchor or shoulder pivot');
      return;
    }

    if (!this.rightForearm) {
      console.warn('[DummyAnimator] Missing right forearm');
      return;
    }

    this.dummyRoot.updateWorldMatrix(true, true);

    const elbowWorldPosition = new THREE.Vector3();
    this.rightElbowAnchor.getWorldPosition(elbowWorldPosition);

    const pivot = new THREE.Group();
    pivot.name = 'rightElbowPivot';
    pivot.position.copy(
      this.rightShoulderPivot.worldToLocal(elbowWorldPosition.clone())
    );
    this.rightShoulderPivot.add(pivot);
    pivot.attach(this.rightForearm);
    pivot.attach(this.rightElbowAnchor);

    this.rightElbowPivot = pivot;
    this.rightElbowNeutralRotation = pivot.rotation.clone();
  }

  setupRightWristPivot() {
    if (this.rightWristPivot) return;

    if (!this.rightElbowPivot || !this.rightWristAnchor || !this.rightHand) {
      console.warn('[DummyAnimator] Missing right wrist, hand, or elbow pivot');
      return;
    }

    this.dummyRoot.updateWorldMatrix(true, true);

    const wristWorldPosition = new THREE.Vector3();
    this.rightWristAnchor.getWorldPosition(wristWorldPosition);

    const pivot = new THREE.Group();
    pivot.name = 'rightWristPivot';
    pivot.position.copy(
      this.rightElbowPivot.worldToLocal(wristWorldPosition.clone())
    );
    this.rightElbowPivot.add(pivot);
    pivot.attach(this.rightHand);
    pivot.attach(this.rightWristAnchor);

    this.rightWristPivot = pivot;
    this.rightWristNeutralRotation = pivot.rotation.clone();
  }

  triggerWave() {
    console.log('[DummyAnimator] triggerWave called');

    if (!this.rightShoulderPivot) {
      this.setupRightShoulderPivot();
    }

    if (!this.rightElbowPivot) {
      this.setupRightElbowPivot();
    }

    if (!this.rightWristPivot) {
      this.setupRightWristPivot();
    }

    if (!this.rightShoulderPivot) {
      console.warn(
        '[DummyAnimator] triggerWave aborted: rightShoulderPivot missing'
      );
      return;
    }

    if (this.isWaving) return;

    this.isWaving = true;
    this.waveTime = 0;
    console.log('[DummyAnimator] wave started');
  }

  onPointerMove(event) {
    const rect = this.renderer?.domElement?.getBoundingClientRect();

    if (!rect || rect.width === 0 || rect.height === 0) return;

    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

    this.pointer.x = THREE.MathUtils.clamp(this.pointer.x, -1, 1);
    this.pointer.y = THREE.MathUtils.clamp(this.pointer.y, -1, 1);
  }

  update(delta) {
    if (!this.enabled) return;

    if (this.isWaving) {
      this.updateWave(delta);
      return;
    }

    const headTargetY = THREE.MathUtils.clamp(
      this.pointer.x * 0.8,
      -0.8,
      0.8
    );
    const headTargetX = THREE.MathUtils.clamp(
      this.pointer.y * 0.35,
      -0.35,
      0.35
    );
    const neckTargetY = THREE.MathUtils.clamp(
      this.pointer.x * 0.35,
      -0.35,
      0.35
    );
    const neckTargetX = THREE.MathUtils.clamp(
      this.pointer.y * 0.16,
      -0.16,
      0.16
    );
    const bodyTargetY = THREE.MathUtils.clamp(
      this.pointer.x * 0.16,
      -0.16,
      0.16
    );
    const bodyTargetX = THREE.MathUtils.clamp(
      this.pointer.y * 0.06,
      -0.06,
      0.06
    );

    this.head.rotation.y = THREE.MathUtils.lerp(
      this.head.rotation.y,
      this.neutralPose.head.y + headTargetY,
      0.1
    );
    this.head.rotation.x = THREE.MathUtils.lerp(
      this.head.rotation.x,
      this.neutralPose.head.x + headTargetX,
      0.1
    );

    this.neck.rotation.y = THREE.MathUtils.lerp(
      this.neck.rotation.y,
      this.neutralPose.neck.y + neckTargetY,
      0.08
    );
    this.neck.rotation.x = THREE.MathUtils.lerp(
      this.neck.rotation.x,
      this.neutralPose.neck.x + neckTargetX,
      0.08
    );

    this.body.rotation.y = THREE.MathUtils.lerp(
      this.body.rotation.y,
      this.neutralPose.body.y + bodyTargetY,
      0.05
    );
    this.body.rotation.x = THREE.MathUtils.lerp(
      this.body.rotation.x,
      this.neutralPose.body.x + bodyTargetX,
      0.05
    );
  }

  updateWave(delta) {
    const dt = delta > 1 ? delta / 1000 : delta;
    this.waveTime += dt;

    const duration = 2.6;
    const progress = THREE.MathUtils.clamp(
      this.waveTime / duration,
      0,
      1
    );

    const smoothstep = (value) => value * value * (3 - 2 * value);
    const raise =
      progress < 0.25
        ? smoothstep(progress / 0.25)
        : progress > 0.82
          ? 1 - smoothstep((progress - 0.82) / 0.18)
          : 1;
    const wavePhase = THREE.MathUtils.clamp(
      (progress - 0.25) / 0.57,
      0,
      1
    );

    //Defining the waving motion using a sine wave for smooth oscillation and an envelope to control the amplitude over time.
    const waveEnvelope = Math.sin(wavePhase * Math.PI); // Envelope for the waving motion
    const wave = Math.sin(wavePhase * Math.PI * 4) * waveEnvelope;

    this.rightShoulderPivot.rotation.copy(
      this.rightShoulderNeutralRotation
    );

    if (this.rightElbowPivot && this.rightElbowNeutralRotation) {
      this.rightElbowPivot.rotation.copy(this.rightElbowNeutralRotation);
    }

    if (this.rightWristPivot && this.rightWristNeutralRotation) {
      this.rightWristPivot.rotation.copy(this.rightWristNeutralRotation);
    }

    // 1. Position of the shoulder: raise the arm.
    this.rightShoulderPivot.rotation.z += raise * 1.45;
    this.rightShoulderPivot.rotation.x += raise * -0.15;
    this.rightShoulderPivot.rotation.y += raise * -0.55;

    // 2. Position of the elbow: forearm bent.
    if (this.rightElbowPivot) {
      this.rightElbowPivot.rotation.z += raise * 1.50;

      // 3. The actual greeting: oscillation of the forearm to the right and left.
      this.rightElbowPivot.rotation.z += wave * 0.25 * raise;
    }

    if (this.rightWristPivot) {

      this.rightWristPivot.rotation.y += raise * 0.75; //fixed position of the hand, so it doesn't rotate on its own.
      this.rightWristPivot.rotation.z += wave * 0.04 * raise; // slight oscillation of the hand to make it more natural.

  }

    if (progress >= 1) {

      this.rightShoulderPivot.rotation.copy(
        this.rightShoulderNeutralRotation
        
      );

      if (this.rightElbowPivot && this.rightElbowNeutralRotation) {
        this.rightElbowPivot.rotation.copy(this.rightElbowNeutralRotation);
      }

      if (this.rightWristPivot && this.rightWristNeutralRotation) {
        this.rightWristPivot.rotation.copy(this.rightWristNeutralRotation);
      }

      this.isWaving = false;
      this.waveTime = 0;
    }
  }

  dispose() {
    window.removeEventListener('pointermove', this.onPointerMove);
    this.enabled = false;
  }
}

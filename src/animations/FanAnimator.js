const DEFAULT_TARGET_SPEED = 13;
const DEFAULT_ACCELERATION = 6;
const DEBUG_FANS = false;
const DEBUG_FAN_SAMPLE_INTERVAL = 500;

let fanAnimatorInstanceCount = 0;

export class FanAnimator {
  constructor({
    fanRotors = [],
    enabled = false,
    targetSpeed = DEFAULT_TARGET_SPEED,
    acceleration = DEFAULT_ACCELERATION,
  } = {}) {
    this.fanRotors = fanRotors;
    this.enabled = Boolean(enabled);
    this.targetSpeed = targetSpeed;
    this.acceleration = acceleration;
    this.currentSpeed = 0;

    if (DEBUG_FANS) {
      this.instanceId = ++fanAnimatorInstanceCount;
      this.updateCount = 0;
      this.debugElapsed = 0;
      this.lastDebugRotations = new Map();
      this.lastDebugParents = new Map();
      this.logInitializationDiagnostics();
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  update(delta) {
    const deltaTime = Math.min(delta > 1 ? delta / 1000 : delta, 0.1);
    const targetSpeed = this.enabled ? this.targetSpeed : 0;
    const speedStep = this.acceleration * deltaTime;

    if (this.currentSpeed < targetSpeed) {
      this.currentSpeed = Math.min(this.currentSpeed + speedStep, targetSpeed);
    } else if (this.currentSpeed > targetSpeed) {
      this.currentSpeed = Math.max(this.currentSpeed - speedStep, targetSpeed);
    }

    this.fanRotors.forEach(({ object, axis, speedMultiplier = 1 }) => {
      object.rotation[axis] += this.currentSpeed * speedMultiplier * deltaTime;
    });

    if (DEBUG_FANS) {
      this.updateCount += 1;
      this.logFrameDiagnostics(delta, deltaTime);
    }
  }

  logInitializationDiagnostics() {
    const objectIds = new Set();

    console.group(`[FanAnimator #${this.instanceId}] initialization`);
    console.log({
      enabled: this.enabled,
      currentSpeed: this.currentSpeed,
      targetSpeed: this.targetSpeed,
      rotorCount: this.fanRotors.length,
    });

    this.fanRotors.forEach(({ object, axis }, index) => {
      if (objectIds.has(object.id)) {
        console.warn('[FanAnimator] Duplicate rotor object detected:', object.name);
      }

      objectIds.add(object.id);
      this.lastDebugParents.set(object.id, object.parent ?? null);
      this.lastDebugRotations.set(object.id, object.rotation[axis]);
      console.log({
        index,
        name: object.name,
        objectId: object.id,
        axis,
        parent: object.parent?.name ?? null,
        rotation: object.rotation[axis],
      });
    });

    console.groupEnd();
  }

  logFrameDiagnostics(delta, deltaTime) {
    this.debugElapsed += deltaTime;

    if (this.debugElapsed * 1000 < DEBUG_FAN_SAMPLE_INTERVAL) {
      return;
    }

    const fps = this.debugElapsed > 0
      ? Math.round(this.updateCount / this.debugElapsed)
      : 0;

    this.debugElapsed = 0;
    this.updateCount = 0;

    console.group(`[FanAnimator #${this.instanceId}] update`);
    console.log({
      enabled: this.enabled,
      currentSpeed: this.currentSpeed,
      delta,
      deltaTime,
      fps,
    });

    this.fanRotors.forEach(({ object, axis }) => {
      const parent = object.parent ?? null;
      const previousParent = this.lastDebugParents.get(object.id);
      const rotation = object.rotation[axis];
      const previousRotation = this.lastDebugRotations.get(object.id);

      if (previousParent && previousParent !== parent) {
        console.warn('[FanAnimator] Rotor parent changed:', {
          name: object.name,
          previousParent: previousParent.name ?? null,
          parent: parent?.name ?? null,
        });
      }

      console.log({
        name: object.name,
        axis,
        parent: parent?.name ?? null,
        rotation,
        rotationDelta: rotation - (previousRotation ?? rotation),
      });

      this.lastDebugParents.set(object.id, parent);
      this.lastDebugRotations.set(object.id, rotation);
    });

    console.groupEnd();
  }
}

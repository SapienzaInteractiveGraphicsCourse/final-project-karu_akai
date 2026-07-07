const DEFAULT_TARGET_SPEED = 18;
const DEFAULT_ACCELERATION = 6;

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

    this.fanRotors.forEach(({ object, axis }) => {
      object.rotation[axis] += this.currentSpeed * deltaTime;
    });
  }
}

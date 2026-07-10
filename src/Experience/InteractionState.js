export const InteractionState = Object.freeze({
  DARK: 'dark',
  READY: 'ready',
  TRANSITIONING: 'transitioning',
  SECTION_OPEN: 'section-open',
});

const VALID_STATES = new Set(Object.values(InteractionState));

export default class InteractionStateManager {
  constructor(initialState = InteractionState.DARK) {
    this.state = initialState;
    this.transitionLocks = new Set();
    this.nextStateAfterTransitions = null;
  }

  setState(nextState) {
    if (!VALID_STATES.has(nextState)) {
      console.warn(`[InteractionState] Invalid state: ${nextState}`);
      return false;
    }

    if (this.state === nextState) {
      return true;
    }

    this.state = nextState;
    return true;
  }

  getState() {
    return this.state;
  }

  is(state) {
    return this.state === state;
  }

  canOpenSection() {
    return this.is(InteractionState.READY) && !this.isInteractionLocked();
  }

  canTogglePower() {
    return (
      (this.is(InteractionState.DARK) || this.is(InteractionState.READY)) &&
      !this.isInteractionLocked()
    );
  }

  canCloseSection() {
    return this.is(InteractionState.SECTION_OPEN) && !this.hasTransitionLocks();
  }

  isInteractionLocked() {
    return (
      this.is(InteractionState.TRANSITIONING) ||
      this.is(InteractionState.SECTION_OPEN) ||
      this.hasTransitionLocks()
    );
  }

  hasTransitionLocks() {
    return this.transitionLocks.size > 0;
  }

  hasTransition(reason) {
    return this.transitionLocks.has(reason);
  }

  beginTransition(reason, { nextState = null } = {}) {
    if (!reason) {
      console.warn('[InteractionState] Missing transition reason.');
      return false;
    }

    if (nextState && !VALID_STATES.has(nextState)) {
      console.warn(`[InteractionState] Invalid transition target: ${nextState}`);
      return false;
    }

    this.transitionLocks.add(reason);
    if (nextState) this.nextStateAfterTransitions = nextState;
    this.setState(InteractionState.TRANSITIONING);
    return true;
  }

  completeTransition(reason, { nextState = null } = {}) {
    if (!this.transitionLocks.has(reason)) {
      console.warn(`[InteractionState] Completing unknown transition: ${reason}`);
      return false;
    }

    if (nextState && !VALID_STATES.has(nextState)) {
      console.warn(`[InteractionState] Invalid transition target: ${nextState}`);
      return false;
    }

    this.transitionLocks.delete(reason);
    if (nextState) this.nextStateAfterTransitions = nextState;

    if (this.hasTransitionLocks()) {
      return true;
    }

    const resolvedState =
      this.nextStateAfterTransitions ?? InteractionState.READY;
    this.nextStateAfterTransitions = null;
    return this.setState(resolvedState);
  }
}

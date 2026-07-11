const DEFAULT_MESSAGE_DURATION = 6000;
const DEFAULT_IDLE_DELAY = 30000;

export default class GuidanceOverlay {
  constructor({ container = document.body, idleDelay = DEFAULT_IDLE_DELAY } = {}) {
    this.container = container;
    this.idleDelay = idleDelay;
    this.hideTimer = null;
    this.idleTimer = null;
    this.idleContext = null;
    this.shownIdleContexts = new Set();
    this.pendingShowId = 0;
    this.destroyed = false;
    this.element = this.createElement();
    this.handleActivity = () => this.registerActivity();
    this.activityListeners = [
      ['pointerdown', { capture: true, passive: true }],
      ['touchstart', { capture: true, passive: true }],
      ['wheel', { capture: true, passive: true }],
      ['keydown', { capture: true }],
      ['click', { capture: true, passive: true }],
    ];

    this.activityListeners.forEach(([eventName, options]) => {
      window.addEventListener(eventName, this.handleActivity, options);
    });
  }

  createElement() {
    const element = document.createElement('div');
    element.id = 'guidance-overlay';
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.setAttribute('aria-atomic', 'true');
    this.container?.append(element);
    return element;
  }

  show(message, { duration = DEFAULT_MESSAGE_DURATION } = {}) {
    if (this.destroyed || !this.element || !message) return false;

    this.pendingShowId += 1;
    this.clearHideTimer();
    this.element.textContent = message;
    this.element.classList.add('visible');

    if (duration > 0) {
      this.hideTimer = window.setTimeout(() => {
        if (this.destroyed) return;
        this.hideTimer = null;
        this.hide();
      }, duration);
    }

    return true;
  }

  async showAfterTransition(element, message, options = {}) {
    if (this.destroyed || !element) return this.show(message, options);

    this.pendingShowId += 1;
    const showId = this.pendingShowId;
    const animations = element.getAnimations?.() ?? [];

    if (animations.length > 0) {
      await Promise.allSettled(
        animations.map((animation) => animation.finished)
      );
    }

    if (this.destroyed || showId !== this.pendingShowId) return false;
    return this.show(message, options);
  }

  hide() {
    this.pendingShowId += 1;
    this.clearHideTimer();
    this.element?.classList.remove('visible');
  }

  registerActivity() {
    if (this.destroyed) return;

    this.hide();
    this.startIdleTimer();
  }

  startIdleTimer(context = this.idleContext) {
    if (this.destroyed) return;

    this.clearIdleTimer();
    if (context) this.idleContext = context;
    if (!this.idleContext) return;

    const currentContext = this.resolveIdleContext();
    if (
      !currentContext?.eligible ||
      !currentContext.key ||
      !currentContext.message ||
      this.shownIdleContexts.has(currentContext.key)
    ) {
      return;
    }

    this.idleTimer = window.setTimeout(() => {
      if (this.destroyed) return;

      this.idleTimer = null;
      const resolvedContext = this.resolveIdleContext();
      if (
        !resolvedContext?.eligible ||
        !resolvedContext.key ||
        !resolvedContext.message ||
        this.shownIdleContexts.has(resolvedContext.key)
      ) {
        return;
      }

      this.shownIdleContexts.add(resolvedContext.key);
      this.show(resolvedContext.message, {
        duration: resolvedContext.duration ?? DEFAULT_MESSAGE_DURATION,
      });
    }, this.idleDelay);
  }

  stopIdleTimer() {
    this.clearIdleTimer();
  }

  resolveIdleContext() {
    return typeof this.idleContext === 'function'
      ? this.idleContext()
      : this.idleContext;
  }

  clearHideTimer() {
    if (this.hideTimer === null) return;
    window.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  clearIdleTimer() {
    if (this.idleTimer === null) return;
    window.clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  destroy() {
    if (this.destroyed) return;

    this.destroyed = true;
    this.clearHideTimer();
    this.clearIdleTimer();
    this.activityListeners.forEach(([eventName, options]) => {
      window.removeEventListener(eventName, this.handleActivity, options);
    });
    this.element?.remove();
    this.element = null;
    this.idleContext = null;
    this.pendingShowId += 1;
  }
}

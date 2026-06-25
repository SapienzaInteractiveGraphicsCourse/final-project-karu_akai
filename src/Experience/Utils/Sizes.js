export default class Sizes {
  constructor() {
    this.callbacks = {
      resize: [],
    };

    this.setSizes();

    window.addEventListener('resize', () => {
      this.setSizes();
      this.trigger('resize');
    });
  }

  setSizes() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
  }

  on(eventName, callback) {
    this.callbacks[eventName]?.push(callback);
  }

  trigger(eventName) {
    this.callbacks[eventName]?.forEach((callback) => callback());
  }
}

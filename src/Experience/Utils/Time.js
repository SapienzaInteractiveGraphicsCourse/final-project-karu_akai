export default class Time {
  constructor() {
    this.callbacks = {
      tick: [],
    };

    this.start = performance.now();
    this.current = this.start;
    this.elapsed = 0;
    this.delta = 16;

    window.requestAnimationFrame((time) => {
      this.tick(time);
    });
  }

  on(eventName, callback) {
    this.callbacks[eventName]?.push(callback);
  }

  trigger(eventName) {
    this.callbacks[eventName]?.forEach((callback) => callback());
  }

  tick(time) {
    this.delta = time - this.current;
    this.current = time;
    this.elapsed = this.current - this.start;

    this.trigger('tick');

    window.requestAnimationFrame((nextTime) => {
      this.tick(nextTime);
    });
  }
}

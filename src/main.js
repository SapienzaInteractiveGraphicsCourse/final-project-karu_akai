import './style.css';
import Experience from './Experience/Experience.js';

const experience = new Experience(document.querySelector('#webgl'));

// Development-only hook used by visual smoke tests and camera calibration.
if (import.meta.env.DEV) {
  window.__INTERACTIVE_CV__ = experience;
}

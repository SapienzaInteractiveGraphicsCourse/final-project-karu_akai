/**
 * Desktop-first visual tuning. Keeping the expensive rendering knobs here makes
 * the look easy to profile without scattering magic values through the scene.
 */
export const DESKTOP_VISUAL_CONFIG = Object.freeze({
  renderer: {
    exposureOff: 0.34,
    exposureOn: 0.82,
    maxPixelRatio: 1.5,
  },
  intro: {
    enabled: true,
    delay: 0.65,
    transitionDuration: 1.9,
    stabilizationDuration: 0.5,
  },
  caseLighting: {
    intensityOff: 0,
    intensityOn: 0.32,
  },
  postProcessing: {
    ambientOcclusion: {
      enabled: true,
      resolutionScale: 0.5,
      kernelSize: 16,
      kernelRadius: 10,
      minDistance: 0.003,
      maxDistance: 0.085,
    },
    bloom: {
      strength: 0.14,
      radius: 0.24,
      threshold: 1.05,
    },
    vignette: {
      offset: 0.24,
      softness: 0.68,
      darkness: 0.22,
      warmth: 0.04,
      contrast: 1.055,
    },
  },
  environment: {
    environmentIntensityOff: 0.025,
    environmentIntensityOn: 0.27,
    backgroundIntensityOff: 0.07,
    backgroundIntensityOn: 0.34,
  },
  lamp: {
    color: 0xffc783,
    shadeEmissiveColor: 0xffc98c,
    shadeEmissiveIntensity: 0.36,
    shadeOverlayOpacity: 0.09,
    coneColor: 0xffc477,
    coneOpacity: 0.068,
    pointIntensity: 7,
    pointDistance: 8,
    fillIntensity: 2.4,
    fillDistance: 11,
    leftShadeIntensity: 3.6,
    leftShadeDistance: 4,
    spotIntensity: 74,
    spotAngle: 0.48,
    spotPenumbra: 0.84,
    areaIntensity: 13,
    areaWidth: 1.35,
    areaHeight: 0.95,
    decay: 2,
    poolSize: 5.8,
    poolOpacity: 0.24,
    poolColor: 0xffb86b,
    shadowMapSize: 1024,
    shadowBias: -0.00018,
    shadowNormalBias: 0.035,
    transitionDuration: 1.9,
    flickerAmount: 0.045,
  },
});

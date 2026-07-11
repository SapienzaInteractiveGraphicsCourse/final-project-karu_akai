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
    enabled: false, //take it false for avoid the flicker on the first load, but it can be enabled for a cinematic intro
    delay: 0.65,
    transitionDuration: 1.9,
    stabilizationDuration: 0.5,
  },
  caseLighting: {
    intensityOff: 0,
    intensityOn: 3.5,
    ledSpill: {
      color: 0xd9b77a,
      fill: {
        maximumIntensity: 8.2,
        distance: 8,
        decay: 2,
        frontOffset: 0.35,
        verticalFactor: -0.08,
      },
      spot: {
        maximumIntensity: 60,
        angle: 0.72,
        penumbra: 0.55,
        decay: 2,
        sideOffset: 0.35,
        frontOffset: 0.75,
        heightFactor: 0.12,
        distancePadding: 3,
        shadow: {
          mapSize: 1024,
          bias: -0.00005,
          normalBias: 0.008,
          radius: 2,
          near: 0.2,
        },
      },
      fallback: {
        fillPosition: [-10.2, -7.2, 10.7],
        spotPosition: [-15.2, -5.8, 11.2],
        target: [-20.9, -12.2, 10.3],
        distance: 18,
      },
    },
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
    // Screen-space warmth aligned with the practical lamps painted into the
    // background image. Dark-pixel masking keeps it off the foreground models.
    backgroundPracticalGlow: {
      amountOff: 0,
      amountOn: 0,
      left: {
        position: [0.19, 0.47],
        color: 0xff9148,
        radius: 0.15,
        intensity: 0.24,
      },
      center: {
        position: [0.47, 0.72],
        color: 0xffb15f,
        radius: 0.11,
        intensity: 0.17,
      },
    },
  },
  // Keep image-based lighting subordinate to the authored lamp and case LEDs.
  environment: {
    environmentIntensityOff: 0.05,
    environmentIntensityOn: 0.12,
    backgroundIntensityOff: 0.9,
    backgroundIntensityOn: 1.05,
    // Motivated by the warm practical lamps visible in the background image.
    practicalLights: [
      {
        name: 'LibraryLeftPracticalLight',
        color: 0xffa45c,
        intensityOff: 0.08,
        intensityOn: 4.5,
        distance: 20,
        decay: 2,
        position: [-27, -3.5, 3],
      },
      {
        name: 'LibraryCenterPracticalLight',
        color: 0xffbd79,
        intensityOff: 0.04,
        intensityOn: 1.8,
        distance: 16,
        decay: 2,
        position: [-10.5, -1.2, 2],
      },
    ],
    // A restrained local reflection of the champagne LED rings on the fans.
    fanAccent: {
      color: 0xd9b77a,
      intensityOff: 0,
      intensityOn: 4.0,
      distance: 8,
      decay: 2,
      position: [-3.2, -7.2, 11.3],
    },
  },
  lamp: {
    color: 0xffc783,
    shadeEmissiveColor: 0xffc98c,
    shadeEmissiveIntensity: 0.56,
    shadeOverlayOpacity: 0.09,
    coneColor: 0xffc477,
    coneOpacity: 0.03,
    pointIntensity: 10,
    pointDistance: 8,
    fillIntensity: 5.4,
    fillDistance: 18,
    leftShadeIntensity: 3.6,
    leftShadeDistance: 8,
    spotIntensity: 60,
    spotAngle: 0.6,
    spotPenumbra: 0.84,

    // Broad, shadowless warmth aimed from the real shade toward Dummy and the
    // nearest face of the case. ExtraLight derives its range from scene bounds.
    sceneSpill: {
      enabled: true,
      color: 0xffc98f,
      intensity: 80,
      angle: 0.72,
      penumbra: 0.96,
      decay: 2,
      distancePadding: 3,
      targetCaseBlend: 0.46,
      targetHeightAboveTable: 3.1,
    },

    areaIntensity: 18,
    areaWidth: 1.35,
    areaHeight: 1.95,
    decay: 2,
    poolSize: 5.8,
    poolOpacity: 0.14,
    poolColor: 0xffb86b,
    shadowMapSize: 1024,
    shadowBias: -0.00018,
    shadowNormalBias: 0.035,
    transitionDuration: 1.9,
    flickerAmount: 0.045,
  },
});

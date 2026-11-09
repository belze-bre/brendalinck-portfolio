/*
 * EDIT THE RÉSUMÉ PATH HERE, then refresh resume.html.
 *
 * Each bend is { turn: degrees, radius: size }; { straight: size } adds a line.
 * Positive turns bend clockwise; negative turns bend counterclockwise.
 * The heading carries over between bends and years, so the route can travel
 * up, down and sideways. Every bend is a circular arc with equal X/Y scale.
 * Radius 1 is one scene unit; larger radii make broader, rounder turns.
 * The key '2025' describes the journey from 2025 to 2024.
 */
window.resumePathConfig = {
  timing: {
    anticipation: 300,  // Pause before setting off (milliseconds).
    travel: 2400,     // Base travel time; longer routes receive extra time.
    settle: 600,      // Let the camera come to rest before another wheel gesture.
    reading: 1000,    // Minimum pause after arriving.
    mouseRelease: 600
  },
  scale: 0.42,        // Scene unit, relative to the shorter side of the stage.
  cameraFollow: 0.10, // Lower = a softer, more delayed camera.
  deformation: {
    maxStretch: 0.14,    // At most 14% longer; the ellipse stays compact.
    fullStretchSpeed: 2.6, // Stage diagonals per second, measured along the path.
    speedSmoothing: 100, // Smooth speed measurements (milliseconds).
    stretchResponse: 180, // Ease into the ellipse as speed builds.
    roundResponse: 220,   // Ease back to a circle as speed drops.
    rotationResponse: 90  // Follow curved tangents without snapping.
  },
  // Flowing bends with just two compact loops.
  route: {
    startAngle: 0,
    intro: [
      { turn: -20, radius: 2.90 },
      { turn: 40, radius: 3.20 },
      { turn: -20, radius: 2.90 }
    ],
    segments: {
      '2025': [
        { turn: -24, radius: 2.80 },
        { turn: 48, radius: 3.00 },
        { turn: -24, radius: 2.80 }
      ],
      '2024': [
        { turn: 20, radius: 2.60 },
        { turn: 360, radius: 0.65 },
        { turn: -40, radius: 2.80 },
        { turn: 20, radius: 2.60 }
      ],
      '2023': [
        { turn: -28, radius: 2.80 },
        { turn: 56, radius: 2.60 },
        { turn: -28, radius: 2.80 }
      ],
      '2022': [
        { turn: -20, radius: 2.60 },
        { turn: -360, radius: 0.65 },
        { turn: 40, radius: 2.80 },
        { turn: -20, radius: 2.60 }
      ],
      '2021': [
        { turn: 24, radius: 2.80 },
        { turn: -48, radius: 3.00 },
        { turn: 24, radius: 2.80 }
      ]
    },
    outro: [
      { turn: -18, radius: 3.30 },
      { turn: 36, radius: 3.30 },
      { turn: -18, radius: 3.30 }
    ]
  }
};

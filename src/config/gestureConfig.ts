/**
 * Gesture vocabulary:
 *
 * thumbsUp   — play
 * twoFingers — pause
 * head tilt  — left previous / right next
 * right palm twist — volume
 */
export const GESTURE_CONFIG = {
  pointerSmoothing: 0.42,
  openPalmFrames: 3,
  pinchFrames: 2,
  poseFrames: 3,
  fingerExtendRatio: 1.12,
  pinchRatio: 0.5,

  headTiltRad: 0.16,
  tiltHoldFrames: 4,
  tiltCooldownMs: 720,

  rotateDeadzone: 0.03,
  rotateSensitivity: 0.22,
  rotateMaxTranslation: 0.038,

  poseCooldownMs: 650,

  absorbRadius: 0.2,
  grabRadius: 110,

  playlistEdge: 0.78,
  blobHitRadius: 0.17,
  tapMaxDistance: 0.045,
  trailLength: 14,
} as const;

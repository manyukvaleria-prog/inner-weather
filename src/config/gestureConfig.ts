/**
 * Gesture vocabulary:
 *
 * thumbsUp   — play
 * twoFingers — pause
 * head tilt  — left previous / right next
 * right palm twist — volume
 */
export const GESTURE_CONFIG = {
  pointerSmoothing: 0.62,
  pinchSmoothing: 0.82,
  openPalmFrames: 5,
  pinchFrames: 4,
  poseFrames: 5,
  poseReleaseFrames: 2,
  handLostFrames: 5,
  fingerExtendRatio: 1.14,
  pinchRatio: 0.4,

  headTiltRad: 0.22,
  tiltHoldFrames: 6,
  tiltCooldownMs: 880,
  tiltMaxYaw: 0.42,

  rotateDeadzone: 0.05,
  rotateSensitivity: 0.16,
  rotateMaxTranslation: 0.026,

  poseCooldownMs: 900,

  absorbRadius: 0.2,
  grabRadius: 110,

  playlistEdge: 0.78,
  blobHitRadius: 0.17,
  tapMaxDistance: 0.045,
  trailLength: 7,
} as const;

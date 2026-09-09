import { GESTURE_CONFIG } from "../config/gestureConfig";
import type { Landmark } from "./handPose";

const NOSE = 1;
const LEFT_EYE = 33;
const RIGHT_EYE = 263;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;

export type FacePose = {
  /** Roll in radians. Positive = left ear down. */
  roll: number;
  /** Yaw estimate. ~0 when facing the camera. */
  yaw: number;
};

export type TiltState = {
  roll: number;
  rest: number;
  dir: -1 | 0 | 1;
  frames: number;
  lastAt: number;
  armed: boolean;
  samples: number[];
};

export function createTiltState(): TiltState {
  return {
    roll: 0,
    rest: 0,
    dir: 0,
    frames: 0,
    lastAt: 0,
    armed: false,
    samples: [],
  };
}

function pairRoll(a: Landmark, b: Landmark): number {
  return Math.atan2(a.y - b.y, a.x - b.x);
}

export function facePose(landmarks: Landmark[]): FacePose {
  if (landmarks.length <= RIGHT_CHEEK) return { roll: 0, yaw: 0 };
  const eyeRoll = pairRoll(landmarks[LEFT_EYE], landmarks[RIGHT_EYE]);
  const cheekRoll = pairRoll(landmarks[LEFT_CHEEK], landmarks[RIGHT_CHEEK]);
  const roll = (eyeRoll + cheekRoll) * 0.5;
  const midX = (landmarks[LEFT_EYE].x + landmarks[RIGHT_EYE].x) * 0.5;
  const yaw = (landmarks[NOSE].x - midX) * 4;
  return { roll, yaw };
}

/**
 * Left ear down → previous, right ear down → next.
 * Uses the raw camera frame, not the mirrored preview.
 */
export function stepTilt(
  state: TiltState,
  landmarks: Landmark[],
  now: number,
): "next" | "previous" | null {
  const { roll, yaw } = facePose(landmarks);
  state.roll += (roll - state.roll) * 0.22;

  if (state.samples.length < 18) {
    state.samples.push(state.roll);
    if (state.samples.length >= 12) {
      const sorted = [...state.samples].sort((a, b) => a - b);
      state.rest = sorted[Math.floor(sorted.length / 2)];
      state.armed = true;
    }
    return null;
  }

  if (Math.abs(yaw) > GESTURE_CONFIG.tiltMaxYaw) {
    state.dir = 0;
    state.frames = 0;
    return null;
  }

  const offset = state.roll - state.rest;
  const threshold = GESTURE_CONFIG.headTiltRad;
  if (Math.abs(offset) < threshold * 0.4) {
    state.rest += (state.roll - state.rest) * 0.018;
    state.dir = 0;
    state.frames = 0;
    state.armed = true;
    return null;
  }

  if (now < state.lastAt + GESTURE_CONFIG.tiltCooldownMs) return null;
  if (Math.abs(offset) < threshold) {
    state.dir = 0;
    state.frames = 0;
    return null;
  }

  const nextDir: -1 | 1 = offset > 0 ? -1 : 1;
  if (state.dir !== nextDir) {
    state.dir = nextDir;
    state.frames = 1;
    return null;
  }
  state.frames += 1;
  if (!state.armed || state.frames < GESTURE_CONFIG.tiltHoldFrames) return null;

  state.armed = false;
  state.lastAt = now;
  state.frames = 0;
  return nextDir < 0 ? "previous" : "next";
}

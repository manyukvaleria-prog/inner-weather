import { GESTURE_CONFIG } from "../config/gestureConfig";

export type Landmark = { x: number; y: number; z?: number };
export type HandPose = "idle" | "openPalm" | "pinch" | "twoFingers" | "thumbsUp";
export type HandSide = "Left" | "Right" | "unknown";

function landmarkDist(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function palmSize(hand: Landmark[]): number {
  return Math.max(landmarkDist(hand[0], hand[9]), 0.08);
}

function fingerExtended(hand: Landmark[], tip: number, pip: number): boolean {
  const wrist = hand[0];
  return (
    landmarkDist(hand[tip], wrist) >
    landmarkDist(hand[pip], wrist) * GESTURE_CONFIG.fingerExtendRatio
  );
}

function fingerFolded(hand: Landmark[], tip: number, pip: number): boolean {
  const wrist = hand[0];
  return landmarkDist(hand[tip], wrist) < landmarkDist(hand[pip], wrist) * 1.06;
}

export function isPinch(hand: Landmark[]): boolean {
  if (hand.length < 21) return false;
  return landmarkDist(hand[4], hand[8]) < palmSize(hand) * GESTURE_CONFIG.pinchRatio;
}

export function isThumbsUp(hand: Landmark[]): boolean {
  if (hand.length < 21) return false;
  const thumbUp =
    landmarkDist(hand[4], hand[0]) > landmarkDist(hand[3], hand[0]) * 1.08 &&
    hand[4].y < hand[0].y - 0.02;
  const others =
    fingerFolded(hand, 8, 6) &&
    fingerFolded(hand, 12, 10) &&
    fingerFolded(hand, 16, 14) &&
    fingerFolded(hand, 20, 18);
  return thumbUp && others && !isPinch(hand);
}

export function isTwoFingers(hand: Landmark[]): boolean {
  if (hand.length < 21) return false;
  if (isPinch(hand)) return false;
  const pair = fingerExtended(hand, 8, 6) && fingerExtended(hand, 12, 10);
  const rest = fingerFolded(hand, 16, 14) && fingerFolded(hand, 20, 18);
  return pair && rest && !isPinch(hand);
}

export function isOpenPalm(hand: Landmark[]): boolean {
  if (hand.length < 21) return false;
  if (isPinch(hand) || isThumbsUp(hand) || isTwoFingers(hand)) return false;
  return (
    fingerExtended(hand, 8, 6) &&
    fingerExtended(hand, 12, 10) &&
    fingerExtended(hand, 16, 14) &&
    fingerExtended(hand, 20, 18)
  );
}

export function classifyHandPose(hand: Landmark[]): HandPose {
  if (isPinch(hand)) return "pinch";
  if (isThumbsUp(hand)) return "thumbsUp";
  if (isTwoFingers(hand)) return "twoFingers";
  if (isOpenPalm(hand)) return "openPalm";
  return "idle";
}

export function palmCenter(hand: Landmark[]): { x: number; y: number } {
  const ids = [0, 5, 9, 13, 17];
  let x = 0;
  let y = 0;
  for (const id of ids) {
    x += hand[id].x;
    y += hand[id].y;
  }
  return { x: x / ids.length, y: y / ids.length };
}

/** Palm twist in mirrored screen space. Positive = clockwise. */
export function palmAngle(hand: Landmark[]): number {
  const ax = 1 - hand[5].x;
  const ay = hand[5].y;
  const bx = 1 - hand[17].x;
  const by = hand[17].y;
  return Math.atan2(by - ay, bx - ax);
}

export function wrapAngle(delta: number): number {
  let value = delta;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

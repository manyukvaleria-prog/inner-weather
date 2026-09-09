import type { FaceLandmarker, HandLandmarker } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";
import { GESTURE_CONFIG } from "../config/gestureConfig";
import { lerp } from "../lib/math";
import { useInteraction } from "../interaction/InteractionProvider";
import { usePlayer } from "../player/PlayerProvider";
import { classifyHandPose, palmAngle, palmCenter, wrapAngle } from "./handPose";
import type { HandPose, HandSide } from "./handPose";
import { createTiltState, stepTilt } from "./headPose";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type Status = "idle" | "loading" | "live" | "error";

export function useHandTracking() {
  const { updateHands, setHandUnavailable } = useInteraction();
  const { unlock, next, previous } = usePlayer();
  const nextRef = useRef(next);
  const previousRef = useRef(previous);
  nextRef.current = next;
  previousRef.current = previous;

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const faceRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const lastVideoTime = useRef(-1);
  const smooth = useRef({ x: 0.5, y: 0.5, ready: false });
  const poseFrames = useRef<
    Record<
      string,
      {
        pinch: number;
        open: number;
        two: number;
        thumb: number;
        pose: HandPose;
        angle: number;
      }
    >
  >({});
  const seenHandRef = useRef(false);
  const lostFramesRef = useRef(0);
  const tiltRef = useRef(createTiltState());
  const sessionRef = useRef(0);

  const fireSkip = useCallback((skip: "next" | "previous" | null) => {
    if (skip === "next") nextRef.current();
    else if (skip === "previous") previousRef.current();
  }, []);

  const stopLoop = useCallback(() => {
    sessionRef.current += 1;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    faceRef.current?.close();
    faceRef.current = null;
    lastVideoTime.current = -1;
    poseFrames.current = {};
    lostFramesRef.current = 0;
    tiltRef.current = createTiltState();
    setHandUnavailable();
  }, [setHandUnavailable]);

  const loop = useCallback(() => {
    rafRef.current = requestAnimationFrame(loop);
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) return;
    if (video.currentTime === lastVideoTime.current) return;
    lastVideoTime.current = video.currentTime;
    const timestamp = performance.now();
    const face = faceRef.current;
    if (face) {
      try {
        const faces = face.detectForVideo(video, timestamp);
        const mesh = faces.faceLandmarks[0];
        if (mesh) fireSkip(stepTilt(tiltRef.current, mesh, timestamp));
        else {
          const tilt = tiltRef.current;
          tilt.dir = 0;
          tilt.frames = 0;
        }
      } catch {
        /* frame dropped */
      }
    }

    let result: ReturnType<HandLandmarker["detectForVideo"]>;
    try {
      result = landmarker.detectForVideo(video, timestamp);
    } catch {
      return;
    }
    const landmarks = result.landmarks;
    if (!landmarks.length) {
      lostFramesRef.current += 1;
      if (lostFramesRef.current < GESTURE_CONFIG.handLostFrames) return;
      poseFrames.current = {};
      if (seenHandRef.current) {
        seenHandRef.current = false;
        smooth.current.ready = false;
        setHandUnavailable();
      }
      return;
    }
    lostFramesRef.current = 0;
    seenHandRef.current = true;

    const hold = GESTURE_CONFIG.poseFrames;
    const release = GESTURE_CONFIG.poseReleaseFrames;
    const hands = landmarks.map((hand, index) => {
      const label = result.handedness[index]?.[0]?.categoryName;
      const handedness: HandSide =
        label === "Left" || label === "Right" ? label : "unknown";
      const key = `${handedness}-${index}`;
      const rawPose = classifyHandPose(hand);
      const frames = poseFrames.current[key] ?? {
        pinch: 0,
        open: 0,
        two: 0,
        thumb: 0,
        pose: "idle" as HandPose,
        angle: palmAngle(hand),
      };
      frames.pinch =
        rawPose === "pinch" ? Math.min(6, frames.pinch + 1) : Math.max(0, frames.pinch - 1);
      frames.open =
        rawPose === "openPalm" ? Math.min(6, frames.open + 1) : Math.max(0, frames.open - 1);
      frames.two =
        rawPose === "twoFingers" ? Math.min(6, frames.two + 1) : Math.max(0, frames.two - 1);
      frames.thumb =
        rawPose === "thumbsUp" ? Math.min(6, frames.thumb + 1) : Math.max(0, frames.thumb - 1);

      const pose: HandPose =
        frames.pinch >= (frames.pose === "pinch" ? release : GESTURE_CONFIG.pinchFrames)
          ? "pinch"
          : frames.thumb >= (frames.pose === "thumbsUp" ? release : hold)
            ? "thumbsUp"
            : frames.two >= (frames.pose === "twoFingers" ? release : hold)
              ? "twoFingers"
              : frames.open >=
                  (frames.pose === "openPalm" ? release : GESTURE_CONFIG.openPalmFrames)
                ? "openPalm"
                : "idle";
      frames.pose = pose;

      const rawAngle = palmAngle(hand);
      frames.angle += wrapAngle(rawAngle - frames.angle) * 0.28;
      poseFrames.current[key] = frames;

      const point =
        pose === "pinch"
          ? { x: (hand[4].x + hand[8].x) / 2, y: (hand[4].y + hand[8].y) / 2 }
          : palmCenter(hand);
      return {
        x: 1 - point.x,
        y: point.y,
        visible: true,
        pose,
        angle: frames.angle,
        handedness,
      };
    });

    const primary = hands[0];
    if (primary) {
      const s = smooth.current;
      const p =
        primary.pose === "pinch"
          ? GESTURE_CONFIG.pinchSmoothing
          : GESTURE_CONFIG.pointerSmoothing;
      if (!s.ready) {
        s.x = primary.x;
        s.y = primary.y;
        s.ready = true;
      } else {
        s.x = lerp(s.x, primary.x, p);
        s.y = lerp(s.y, primary.y, p);
      }
    }

    updateHands(
      hands.map((hand, index) =>
        index === 0 ? { ...hand, x: smooth.current.x, y: smooth.current.y } : hand,
      ),
    );
  }, [fireSkip, setHandUnavailable, updateHands]);

  const enable = useCallback(async () => {
    if (status === "loading" || status === "live") return;
    setStatus("loading");
    setError(null);

    try {
      const session = ++sessionRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      });
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Video element missing");
      video.srcObject = stream;
      await video.play();
      await unlock();

      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
      const handOptions = {
        runningMode: "VIDEO" as const,
        numHands: 2,
        minHandDetectionConfidence: 0.72,
        minHandPresenceConfidence: 0.7,
        minTrackingConfidence: 0.62,
      };
      let landmarker: HandLandmarker;
      try {
        landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
          ...handOptions,
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "GPU" },
        });
      } catch {
        landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
          ...handOptions,
          baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "CPU" },
        });
      }
      if (session !== sessionRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;

      smooth.current.ready = false;
      poseFrames.current = {};
      tiltRef.current = createTiltState();
      setStatus("live");
      rafRef.current = requestAnimationFrame(loop);

      const faceOptions = {
        runningMode: "VIDEO" as const,
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      };
      void (async () => {
        let face: FaceLandmarker | null = null;
        try {
          face = await vision.FaceLandmarker.createFromOptions(fileset, {
            ...faceOptions,
            baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "CPU" },
          });
        } catch {
          try {
            face = await vision.FaceLandmarker.createFromOptions(fileset, {
              ...faceOptions,
              baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "GPU" },
            });
          } catch {
            face = null;
          }
        }
        if (session !== sessionRef.current) {
          face?.close();
          return;
        }
        faceRef.current = face;
      })();
    } catch (err) {
      stopLoop();
      const message =
        err instanceof Error ? err.message : "Camera is unavailable";
      setError(message);
      setStatus("error");
    }
  }, [loop, status, stopLoop, unlock]);

  const disable = useCallback(() => {
    stopLoop();
    setError(null);
    setStatus("idle");
  }, [stopLoop]);

  useEffect(() => () => stopLoop(), [stopLoop]);

  return { status, error, enable, disable, videoRef };
}

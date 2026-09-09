import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "three";

const BLOB_RADIUS = 1.24;

export function FitWindowBlob() {
  const { camera, size } = useThree();

  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const fovRad = (cam.fov * Math.PI) / 180;
    const distance = BLOB_RADIUS / (Math.tan(fovRad / 2) * 0.86);
    cam.position.set(0, 0, Math.max(distance, BLOB_RADIUS + 1.2));
    cam.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

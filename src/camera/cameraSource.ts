export type Facing = 'user' | 'environment'

/**
 * Binds a camera stream to a (hidden) video element.
 * `environment` matches the Android default back camera;
 * `user` = front camera (will be mirrored at the sampling stage,
 * like `mirrorHorizontally` in CameraPixelAnalyzer).
 */
export async function startCamera(
  video: HTMLVideoElement,
  facing: Facing = 'environment',
): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing },
    audio: false,
  })
  video.srcObject = stream
  video.muted = true
  video.playsInline = true
  await video.play()
  return stream
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

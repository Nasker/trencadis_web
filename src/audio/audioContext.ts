let ctx: AudioContext | null = null

const ctxStateListeners = new Set<(state: AudioContextState) => void>()

/**
 * Creates (or returns) the shared context. MUST be called synchronously
 * from a user gesture, before any awaits (camera permission etc.) consume
 * the transient activation browsers require for audio to run.
 */
export function unlockAudio(): AudioContext {
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
    ctx.addEventListener('statechange', () => {
      ctxStateListeners.forEach((cb) => cb(ctx!.state))
    })
  }
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  return ctx
}

export function getAudioContext(): AudioContext | null {
  return ctx
}

export function onAudioContextState(cb: (state: AudioContextState) => void): () => void {
  ctxStateListeners.add(cb)
  if (ctx) cb(ctx.state)
  return () => ctxStateListeners.delete(cb)
}

/**
 * Safety net: any later interaction re-resumes the context if the initial
 * unlock raced a permission prompt.
 */
export function armResumeAudioOnInteraction(): void {
  const resume = () => {
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }
  window.addEventListener('pointerdown', resume)
  window.addEventListener('keydown', resume)
}

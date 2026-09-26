import type { AppStatus } from '../state/store'

interface Props {
  status: AppStatus
  errorMessage: string | null
  onStart: () => void
}

/**
 * Tap-to-start gate: acquires camera permission and unlocks the
 * AudioContext inside a single user gesture (autoplay policy).
 */
export function StartOverlay({ status, errorMessage, onStart }: Props) {
  return (
    <div className="start-overlay" onPointerDown={status === 'error' || status === 'idle' ? onStart : undefined}>
      <div className="start-card">
        <h1 className="start-title">Trencadís</h1>
        {status === 'idle' && <p className="start-hint">tap to start</p>}
        {status === 'starting' && <p className="start-hint">starting camera…</p>}
        {status === 'error' && (
          <>
            <p className="start-hint error">camera/audio failed to start</p>
            <p className="start-hint error detail">{errorMessage}</p>
            <p className="start-hint">tap to retry</p>
          </>
        )}
      </div>
    </div>
  )
}

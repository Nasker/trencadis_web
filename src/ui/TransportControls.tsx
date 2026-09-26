import type { PixelData, PixelSelectionMode } from '../camera/pixelGrid'

interface Props {
  mode: PixelSelectionMode
  playing: boolean
  bpm: number
  columns: number
  selected: PixelData | null
  onMode: (mode: PixelSelectionMode) => void
  onPlaying: (playing: boolean) => void
  onBpm: (bpm: number) => void
  onColumns: (columns: number) => void
}

const MODES: Array<[PixelSelectionMode, string]> = [
  ['sequence', 'SEQ'],
  ['brightest', 'BRI'],
  ['center', 'CNT'],
  ['pointer', 'PTR'],
]

export function TransportControls({
  mode,
  playing,
  bpm,
  columns,
  selected,
  onMode,
  onPlaying,
  onBpm,
  onColumns,
}: Props) {
  return (
    <div className="transport-controls">
      <div className="mode-row">
        {MODES.map(([value, label]) => (
          <button
            key={value}
            className={mode === value ? 'active' : ''}
            onClick={() => onMode(value)}
          >
            {label}
          </button>
        ))}
        <button className={playing ? 'active play' : 'play'} onClick={() => onPlaying(!playing)}>
          {playing ? '■' : '▶'}
        </button>
      </div>
      <label>
        <span>{bpm} BPM</span>
        <input
          type="range"
          min="40"
          max="240"
          value={bpm}
          onChange={(event) => onBpm(Number(event.target.value))}
        />
      </label>
      <label>
        <span>{columns} COL</span>
        <input
          type="range"
          min="8"
          max="36"
          value={columns}
          onChange={(event) => onColumns(Number(event.target.value))}
        />
      </label>
      <div className="pixel-readout">
        {selected
          ? `H ${Math.round(selected.hue)}° · B ${Math.round(selected.brightness * 100)}%`
          : mode === 'pointer' ? 'TOUCH A TILE' : 'NO PIXEL'}
      </div>
    </div>
  )
}

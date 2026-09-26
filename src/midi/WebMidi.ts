export interface MidiSnapshot {
  supported: boolean
  enabled: boolean
  deviceName: string
  outputNames: string[]
  externalClockAvailable: boolean
  externalBpm: number
}

type MidiPortLike = {
  id: string
  name?: string | null
  state?: string
  send?: (data: number[], timestamp?: number) => void
  onmidimessage?: ((event: { data: Uint8Array; timeStamp: number }) => void) | null
}

type MidiAccessLike = {
  inputs: Map<string, MidiPortLike>
  outputs: Map<string, MidiPortLike>
  onstatechange: (() => void) | null
}

export class WebMidi {
  private access: MidiAccessLike | null = null
  private output: MidiPortLike | null = null
  private activeNote = -1
  private offTimer = 0
  private tickTimes: number[] = []
  private clockTimer = 0
  private listeners = new Set<(snapshot: MidiSnapshot) => void>()
  private snapshot: MidiSnapshot = {
    supported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    enabled: false,
    deviceName: '',
    outputNames: [],
    externalClockAvailable: false,
    externalBpm: 0,
  }

  subscribe(listener: (snapshot: MidiSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.snapshot)
    return () => this.listeners.delete(listener)
  }

  async enable(): Promise<boolean> {
    if (!this.snapshot.supported) return false
    try {
      const request = (navigator as Navigator & { requestMIDIAccess: () => Promise<MidiAccessLike> }).requestMIDIAccess
      this.access = await request.call(navigator)
      this.access.onstatechange = () => this.connectPorts()
      this.connectPorts()
      this.publish({ enabled: true })
      return true
    } catch {
      this.disable()
      return false
    }
  }

  disable(): void {
    this.allNotesOff()
    if (this.access) {
      for (const input of this.access.inputs.values()) input.onmidimessage = null
      this.access.onstatechange = null
    }
    this.access = null
    this.output = null
    this.tickTimes = []
    this.publish({ enabled: false, deviceName: '', outputNames: [], externalClockAvailable: false, externalBpm: 0 })
  }

  selectOutput(name: string): void {
    if (!this.access) return
    this.allNotesOff()
    this.output = [...this.access.outputs.values()].find((port) => port.name === name) ?? null
    this.publish({ deviceName: this.output?.name ?? '' })
  }

  noteOn(note: number, velocity: number, channel: number, durationMs: number): void {
    if (!this.output?.send) return
    this.allNotesOff()
    const midiNote = Math.max(0, Math.min(127, Math.round(note)))
    const midiVelocity = Math.max(1, Math.min(127, Math.round(velocity)))
    const midiChannel = Math.max(0, Math.min(15, channel - 1))
    this.output.send([0x90 | midiChannel, midiNote, midiVelocity])
    this.activeNote = midiNote
    window.clearTimeout(this.offTimer)
    this.offTimer = window.setTimeout(() => this.noteOff(midiChannel), Math.max(1, durationMs))
  }

  allNotesOff(channel = 1): void {
    window.clearTimeout(this.offTimer)
    this.noteOff(Math.max(0, Math.min(15, channel - 1)))
  }

  private noteOff(channel: number): void {
    if (this.activeNote >= 0) this.output?.send?.([0x80 | channel, this.activeNote, 0])
    this.activeNote = -1
  }

  private connectPorts(): void {
    if (!this.access) return
    const outputs = [...this.access.outputs.values()].filter((port) => port.state !== 'disconnected')
    if (!this.output || !outputs.some((port) => port.id === this.output?.id)) this.output = outputs[0] ?? null
    for (const input of this.access.inputs.values()) input.onmidimessage = (event) => this.handleInput(event.data, event.timeStamp)
    this.publish({ outputNames: outputs.map((port) => port.name ?? 'MIDI output'), deviceName: this.output?.name ?? '' })
  }

  private handleInput(data: Uint8Array, timestamp: number): void {
    for (const byte of data) {
      if (byte === 0xf8) {
        this.tickTimes.push(timestamp || performance.now())
        if (this.tickTimes.length > 25) this.tickTimes.shift()
        if (this.tickTimes.length > 1) {
          const span = this.tickTimes[this.tickTimes.length - 1] - this.tickTimes[0]
          const bpm = Math.max(20, Math.min(300, 60000 / (span / (this.tickTimes.length - 1) * 24)))
          this.publish({ externalClockAvailable: true, externalBpm: Math.round(bpm * 10) / 10 })
          window.clearTimeout(this.clockTimer)
          this.clockTimer = window.setTimeout(() => this.publish({ externalClockAvailable: false }), 1500)
        }
      } else if (byte === 0xfc) {
        this.publish({ externalClockAvailable: false })
      }
    }
  }

  private publish(update: Partial<MidiSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...update }
    for (const listener of this.listeners) listener(this.snapshot)
  }
}

export const webMidi = new WebMidi()

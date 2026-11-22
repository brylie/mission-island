// A minimal stand-in for Web Audio, enough to check what the mix starts, when, and at what level.
class Param {
  value = 0
  setTargetAtTime(value) { this.value = value }
  cancelScheduledValues() {}
}
class Node {
  connect() {}
  disconnect() {}
}
class Gain extends Node { gain = new Param() }
class Panner extends Node {
  positionX = new Param()
  positionY = new Param()
  positionZ = new Param()
}

export class FakeContext {
  state = 'suspended'
  currentTime = 0
  destination = new Node()
  listener = Object.fromEntries(['positionX', 'positionY', 'positionZ', 'forwardX', 'forwardY', 'forwardZ'].map((key) => [key, new Param()]))
  started = []
  createGain() { return new Gain() }
  createPanner() { return new Panner() }
  createBuffer(_channels, length, rate) { return { duration: length / rate, copyToChannel() {} } }
  createBufferSource() {
    const context = this
    const ended = []
    return Object.assign(new Node(), {
      buffer: null,
      loop: false,
      playbackRate: new Param(),
      addEventListener: (_type, listener) => ended.push(listener),
      start(at, offset = 0) { context.started.push({ at, offset, duration: this.buffer.duration, loop: this.loop, source: this }) },
      stop() { ended.forEach((listener) => void listener()) },
    })
  }

  setState(state) {
    this.state = state
    this.onstatechange?.()
    return Promise.resolve()
  }

  resume() { return this.setState('running') }
  suspend() { return this.setState('suspended') }
  close() { return this.setState('closed') }
}

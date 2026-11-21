import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import type { createCrew } from '../assets/crew'
import { fitCrewGait } from '../assets/crew-gait-pose'
import { crewGaitPreview } from '../crew-gait'

// Sample one complete stride ahead of drawing the current pose so seeking,
// stepping and playback rate all show the same curve.
function measure(crew: ReturnType<typeof createCrew>, speed: number, scale: number, leg: number) {
  const start = crewGaitPreview(0, speed, scale)
  const period = start.distance / speed, count = 120, step = period / count
  const { skeleton } = crew.knees[leg]
  const inverseRoot = crew.root.computeWorldMatrix(true).clone().invert()
  const samples = Array.from({ length: count + 3 }, (_, index) => {
    const time = (index - 1) * step
    const frame = crewGaitPreview(time, speed, scale)
    fitCrewGait(crew, frame)
    skeleton.computeAbsoluteMatrices(true)
    const world = Vector3.TransformCoordinates(skeleton.bones[2].getAbsoluteMatrix().getTranslation(),
      crew.legs[leg].computeWorldMatrix(true))
    return { z: Vector3.TransformCoordinates(world, inverseRoot).z + speed * time,
      knee: skeleton.bones[1].getRotation().x * 180 / Math.PI }
  })
  return { period, duty: start.contact / start.distance, points: samples.slice(1, -1).map((s, i) => ({
    velocity: (samples[i + 2].z - samples[i].z) / (2 * step), knee: s.knee,
  })) }
}

export function createGaitTrace(crew: ReturnType<typeof createCrew>) {
  const panel = document.querySelector<HTMLDetailsElement>('#gait-trace')
  const canvas = panel?.querySelector('canvas')
  const ctx = canvas?.getContext('2d')
  const output = panel?.querySelector('output'), select = panel?.querySelector('select')
  let key = '', trace: ReturnType<typeof measure> | undefined
  return (time: number, speed: number, scale: number) => {
    if (!panel?.open || !ctx || !canvas || !output || !select) return
    const leg = Number(select.value), next = [speed, scale, leg].join('/')
    if (key !== next || !trace) {
      trace = measure(crew, speed, scale, leg)
      key = next
    }
    const { points, period, duty } = trace
    const phase = (time / period) % 1, index = Math.round(phase * (points.length - 1))
    const left = 16, width = 488, offset = leg / 2
    ctx.fillStyle = '#142422'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#354c43'
    ctx.fillRect(left + width * offset, 0, width * duty, 211)
    ctx.font = '25px system-ui'
    function plot(field: 'velocity' | 'knee', title: string, top: number, color: string) {
      if (!ctx) return
      const values = points.map(p => p[field])
      const low = Math.min(0, Math.floor(Math.min(...values))), high = Math.max(1, Math.ceil(Math.max(...values)))
      ctx.fillStyle = color
      ctx.fillText(title + '   ' + low + '–' + high, left, top + 25)
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.beginPath()
      values.forEach((v, i) => {
        const x = left + width * i / (points.length - 1), y = top + 92 - 64 * (v - low) / (high - low)
        if (i) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      })
      ctx.stroke()
    }
    plot('velocity', 'Forward ankle velocity (m/s)', 2, '#85dec9')
    plot('knee', 'Knee bend (°)', 107, '#f1bb79')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(left + phase * width, 0, 2, 211)
    ctx.fillText('0', left, 234)
    ctx.textAlign = 'right'
    ctx.fillText(period.toFixed(2) + ' s', left + width, 234)
    ctx.textAlign = 'left'
    const contact = (phase + offset) % 1 < duty
    output.textContent = (contact ? 'Stance' : 'Swing') + ' · ' + points[index].velocity.toFixed(1) +
      ' m/s · ' + Math.round(points[index].knee) + '° knee bend'
  }
}

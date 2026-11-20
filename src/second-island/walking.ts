import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh'
import { jumpGravity, jumpSpeed } from '../world.ts'
import { wadeDepth, waterBounds } from './sites.ts'
import type { MapPoint } from './sites.ts'
import { groundHeight, surfaceHeight, waterHeight } from './terrain.ts'

interface Block extends MapPoint {
  bottom: number; top: number; width: number; depth: number; heading: number
}

// Index the unmerged, metre-scale model parts. This keeps the spaces between
// shelter posts, beneath rotors and through gates open after graphics batching.
export class ScenerySolids {
  private cells = new Map<string, Block[]>()

  add(block: Block) {
    const c = Math.abs(Math.cos(block.heading)), s = Math.abs(Math.sin(block.heading))
    const reachX = (c * block.width + s * block.depth) / 2 + .4
    const reachZ = (s * block.width + c * block.depth) / 2 + .4
    for (let x = Math.floor((block.x - reachX) / 8); x <= Math.floor((block.x + reachX) / 8); x++) {
      for (let z = Math.floor((block.z - reachZ) / 8); z <= Math.floor((block.z + reachZ) / 8); z++) {
        const key = x + ',' + z
        const cell = this.cells.get(key)
        if (cell) cell.push(block)
        else this.cells.set(key, [block])
      }
    }
  }

  capture(meshes: readonly AbstractMesh[]) {
    for (const mesh of meshes) {
      const m = mesh.computeWorldMatrix(true).m
      const box = mesh.getBoundingInfo().boundingBox
      if (box.maximumWorld.y - box.minimumWorld.y < .055) continue
      const heading = Math.atan2(-m[2], m[0])
      const c = Math.cos(heading), s = Math.sin(heading)
      const { x, z } = box.centerWorld
      let halfWidth = 0, halfDepth = 0
      for (const p of box.vectorsWorld) {
        halfWidth = Math.max(halfWidth, Math.abs((p.x - x) * c - (p.z - z) * s))
        halfDepth = Math.max(halfDepth, Math.abs((p.x - x) * s + (p.z - z) * c))
      }
      this.add({ x, z, heading, width: 2 * halfWidth, depth: 2 * halfDepth,
        bottom: box.minimumWorld.y, top: box.maximumWorld.y })
    }
  }

  at(x: number, z: number, radius: number) {
    const cell = this.cells.get(Math.floor(x / 8) + ',' + Math.floor(z / 8))
    return cell?.filter((b) => {
      const dx = x - b.x, dz = z - b.z, c = Math.cos(b.heading), s = Math.sin(b.heading)
      const ex = Math.max(0, Math.abs(dx * c - dz * s) - b.width / 2)
      const ez = Math.max(0, Math.abs(dx * s + dz * c) - b.depth / 2)
      return ex * ex + ez * ez <= radius * radius
    }) ?? []
  }
}

interface Walker extends MapPoint { y: number; velocity: number; swimming: boolean; grounded: boolean }
export function placeWalker(p: MapPoint): Walker {
  const floor = surfaceHeight(p.x, p.z), water = waterHeight(p.x, p.z)
  const swimming = water - floor > wadeDepth
  return { x: p.x, z: p.z, y: swimming ? water - 1.01 : floor, velocity: 0, grounded: !swimming, swimming }
}

export function walkSaltwind(p: Walker, solids: ScenerySolids, vx: number, vz: number, jump: boolean, dt: number) {
  if (jump && p.grounded) { p.velocity = jumpSpeed; p.grounded = false }
  const beforeX = p.x, beforeZ = p.z
  const steps = Math.max(1, Math.ceil(dt * 90)), step = dt / steps
  for (let i = 0; i < steps; i++) {
    const feet = p.y
    const allowance = p.grounded || p.swimming ? .31 : .055
    const move = (x: number, z: number) => {
      if (x < waterBounds.minX || x > waterBounds.maxX || z < waterBounds.minZ || z > waterBounds.maxZ) return
      const surface = surfaceHeight(x, z, feet + allowance)
      if (surface > feet + allowance || solids.at(x, z, .28).some((b) =>
        b.top > feet + allowance && b.bottom < feet + 1.78)) return
      p.x = x; p.z = z
    }
    if (vx) move(p.x + vx * step, p.z)
    if (vz) move(p.x, p.z + vz * step)
    let floor = surfaceHeight(p.x, p.z, feet + allowance)
    let ceiling = Infinity
    for (const b of solids.at(p.x, p.z, .21)) {
      if (b.top <= feet + allowance) floor = Math.max(floor, b.top)
      if (b.bottom >= feet + 1.78) ceiling = Math.min(ceiling, b.bottom)
    }
    const water = waterHeight(p.x, p.z)
    if (water - floor > wadeDepth && feet <= water + .05 && p.velocity <= 0) {
      p.swimming = true; p.grounded = false; p.velocity = 0; p.y = water - 1.01
    } else {
      p.swimming = false
      p.velocity -= jumpGravity * step
      if (feet + p.velocity * step + 1.78 >= ceiling) p.velocity = Math.min(p.velocity, 0)
      p.y = Math.max(floor, feet + p.velocity * step)
      p.grounded = p.y === floor
      if (p.grounded) p.velocity = 0
    }
  }
  return dt > 0 ? Math.hypot(beforeX - p.x, beforeZ - p.z) / dt : 0
}

export function clearCameraDistance(p: Walker, solids: ScenerySolids, dx: number, dy: number, dz: number) {
  const length = Math.hypot(dx, dy, dz)
  const samples = Math.ceil(length / .24)
  for (let i = 1; i <= samples; i++) {
    const t = i / samples, x = p.x + dx * t, z = p.z + dz * t, y = p.y + 1.6 + dy * t
    if (groundHeight(x, z) > y - .15 || solids.at(x, z, .17).some((b) => b.bottom - .12 < y && b.top + .12 > y)) {
      return Math.max(.02, (i - 1) / samples)
    }
  }
  return 1
}

const defaultRecentImpactLimit = 64

// Shared impact cues arrive as host notices. Play each once, and never a backlog: cues that arrive
// while playback is suspended, or in the moment after a reconnect, return or checkpoint reset, are dropped.
// Times come from a monotonic clock because the island clock jumps when the crew sleeps.

const settleMilliseconds = 300

export function createImpactInbox(now: () => number, capacity = defaultRecentImpactLimit) {
  const seen = new Set<string>()
  const order: string[] = []
  let quietUntil = -Infinity
  return {
    accept(id: string, playing: boolean) {
      if (seen.has(id)) return false
      seen.add(id)
      order.push(id)
      if (order.length > capacity) seen.delete(order.shift()!)
      return playing && now() >= quietUntil
    },
    // A new connection, a returning tab, or a checkpoint restart starts a new listening run.
    reset(settle = settleMilliseconds) {
      quietUntil = now() + settle
    },
  }
}

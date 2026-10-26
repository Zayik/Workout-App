import {
  ADDON_GROUPS,
  LOWER_GROUPS,
  exById,
  exercises,
  groupById,
  groups,
  primaryGroups,
  type Exercise,
} from './catalog'
import { dayKey, type Plan, type PlanItem, type SetLog } from './db'

// Builds today's workout from plans/rotation-rules.md:
// - each group has a weekly target of credited sets (1 for the target muscle, ½ for helpers)
// - no group on back-to-back days (per-group rest hours), max 3 sets per group per session
// - compounds that clear the most owed groups first, then isolation for what's still short
// - main compound per movement type stays put for ~4 weeks; isolation rotates
// - pairs of moves that share no credited group; cuff, serratus and shins as 1-set add-ons
// No time budget: the plan lists every owed group, most owed first, and the user stops whenever.
// What's skipped stays owed and moves up next time.

const DAY = 86_400_000
const MAX_PER_SESSION = 3
// Recommended groups per session: 12 main groups, about twice a week each, over ~3 sessions.
export const AIM_GROUPS = 8

export interface WeekStatus {
  done: Record<string, number> // credited sets in the last 7 days
  today: Record<string, number> // credited sets so far today
  resting: Set<string>
}

const creditOf = (s: SetLog) => (s.exId ? (exById.get(s.exId)?.credit ?? {}) : {})

export function weekStatus(logs: SetLog[], now = Date.now()): WeekStatus {
  const done: Record<string, number> = {}
  const today: Record<string, number> = {}
  const perDay: Record<string, Record<string, number>> = {}
  const todayKey = dayKey(now)
  for (const s of logs) {
    if (now - s.at >= 7 * DAY) continue
    const k = dayKey(s.at)
    for (const [g, c] of Object.entries(creditOf(s))) {
      done[g] = (done[g] ?? 0) + c
      if (k === todayKey) today[g] = (today[g] ?? 0) + c
      perDay[k] ??= {}
      perDay[k][g] = (perDay[k][g] ?? 0) + c
    }
  }
  // A group rests on the days after a session where it got 2+ credited sets,
  // for its rest hours (48 h = skip tomorrow, 24 h = fine the next day).
  const resting = new Set<string>()
  const midnight = new Date(now).setHours(0, 0, 0, 0)
  for (const g of groups) {
    const restDays = Math.round(g.restHours / 24) - 1
    for (let d = 1; d <= restDays; d++) {
      if ((perDay[dayKey(midnight - d * DAY + DAY / 2)]?.[g.id] ?? 0) >= 2) resting.add(g.id)
    }
  }
  return { done, today, resting }
}

// Small deterministic jitter so "New plan" can reshuffle ties.
function jitter(seed: number, id: string) {
  let h = seed
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 2654435761)
  return ((h >>> 0) % 1000) / 1000
}

export function buildPlan(opts: {
  logs: SetLog[]
  avoid: Set<string>
  seed: number
  now?: number
}): Plan {
  const now = opts.now ?? Date.now()
  const { done, today, resting } = weekStatus(opts.logs, now)
  const need: Record<string, number> = {}
  for (const g of groups) need[g.id] = Math.max(0, g.target - (done[g.id] ?? 0))
  const session: Record<string, number> = { ...today }

  // History the rotation looks at: last use of each exercise, the main lift per pattern,
  // and which patterns / stretched moves each group already had this week.
  const lastUsed: Record<string, number> = {}
  const mainLift: Record<string, string> = {}
  const weekPatterns: Record<string, Set<string>> = {}
  const weekStretch = new Set<string>()
  for (const s of [...opts.logs].sort((a, b) => a.at - b.at)) {
    const e = s.exId ? exById.get(s.exId) : undefined
    if (!e) continue
    lastUsed[e.id] = s.at
    if (e.type === 'C' && now - s.at < 28 * DAY) mainLift[e.pattern] = e.id
    if (now - s.at < 7 * DAY) {
      for (const g of primaryGroups(e)) {
        ;(weekPatterns[g] ??= new Set()).add(e.pattern)
        if (e.stretch === 'yes') weekStretch.add(g)
      }
    }
  }

  const fits = (e: Exercise) =>
    !opts.avoid.has(e.id) &&
    e.level <= 2 &&
    primaryGroups(e).every((g) => !resting.has(g)) &&
    Object.keys(e.credit).every((g) => (session[g] ?? 0) + e.credit[g] <= MAX_PER_SESSION)

  const score = (e: Exercise) => {
    let s = 0
    for (const [g, c] of Object.entries(e.credit)) {
      // Weighted by how far behind the group is, so the most owed groups come first.
      if (!resting.has(g)) s += c * Math.min(1, need[g] / groupById.get(g)!.target)
    }
    if (s <= 0) return 0
    if (e.type === 'C') s += mainLift[e.pattern] === e.id ? 0.15 : mainLift[e.pattern] ? -0.4 : 0.1
    else if (lastUsed[e.id] && now - lastUsed[e.id] < 7 * DAY) s -= 0.3
    for (const g of primaryGroups(e)) {
      if (!weekPatterns[g]?.has(e.pattern)) s += 0.25
      if (e.stretch === 'yes' && !weekStretch.has(g)) s += 0.2
    }
    return s + jitter(opts.seed, e.id) * 0.3
  }

  const add = (e: Exercise, sets: number, list: PlanItem[]) => {
    list.push({ exId: e.id, sets })
    for (const [g, c] of Object.entries(e.credit)) {
      session[g] = (session[g] ?? 0) + c * sets
      need[g] = Math.max(0, need[g] - c * sets)
    }
    weekPatterns[primaryGroups(e)[0]]?.add(e.pattern)
  }

  // Main work.
  const main: PlanItem[] = []
  const pool = exercises.filter((e) => !primaryGroups(e).some((g) => ADDON_GROUPS.includes(g)))
  for (;;) {
    let best: Exercise | undefined
    let bestScore = 0.1
    for (const e of pool) {
      if (main.some((i) => i.exId === e.id) || !fits(e)) continue
      const s = score(e)
      if (s > bestScore) [best, bestScore] = [e, s]
    }
    if (!best) break
    const room = Math.min(
      ...Object.keys(best.credit).map((g) => (MAX_PER_SESSION - (session[g] ?? 0)) / best.credit[g]),
    )
    const want = Math.ceil(Math.max(...primaryGroups(best).map((g) => need[g])))
    const sets = Math.max(1, Math.min(3, Math.floor(room), Math.max(2, want)))
    add(best, sets, main)
  }

  // One-set add-ons for cuff, serratus and shins, least recently used first.
  const addons: PlanItem[] = []
  for (const g of ADDON_GROUPS) {
    if (need[g] <= 0 || resting.has(g)) continue
    const pick = exercises
      .filter((e) => e.credit[g] === 1 && fits(e))
      .sort((a, b) => (lastUsed[a.id] ?? 0) - (lastUsed[b.id] ?? 0) || jitter(opts.seed, a.id) - jitter(opts.seed, b.id))[0]
    if (pick) add(pick, 1, addons)
  }

  return { date: dayKey(now), pairs: pairUp(main), addons, seed: opts.seed }
}

// Pairs moves that share no credited group, best when upper + lower, then same equipment.
// Pairs keep pick order (most owed first) so stopping early skips the least needed work;
// order barely matters for growth (research/muscle-grouping-and-order.md).
export function pairUp(items: PlanItem[]): PlanItem[][] {
  const ex = (i: PlanItem) => exById.get(i.exId)!
  const left = [...items]
  const pairs: PlanItem[][] = []
  while (left.length) {
    const a = left.shift()!
    const ea = ex(a)
    const lowerA = primaryGroups(ea).some((g) => LOWER_GROUPS.includes(g))
    let bestIdx = -1
    let bestScore = -1
    left.forEach((b, i) => {
      const eb = ex(b)
      if (Object.keys(eb.credit).some((g) => g in ea.credit)) return
      const lowerB = primaryGroups(eb).some((g) => LOWER_GROUPS.includes(g))
      const s = (lowerA !== lowerB ? 2 : 0) + (ea.equip === eb.equip ? 1 : 0) - i * 0.01
      if (s > bestScore) [bestIdx, bestScore] = [i, s]
    })
    pairs.push(bestIdx >= 0 ? [a, left.splice(bestIdx, 1)[0]] : [a])
  }
  return pairs
}

// Light (higher reps) for the first 4 weeks, then alternate heavy and light per exercise.
export function zone(exId: string, logs: SetLog[], now = Date.now()): 'heavy' | 'light' {
  const first = logs.reduce((m, s) => Math.min(m, s.at), now)
  if (now - first < 28 * DAY) return 'light'
  const days = new Set(logs.filter((s) => s.exId === exId && dayKey(s.at) !== dayKey(now)).map((s) => dayKey(s.at)))
  return days.size % 2 ? 'heavy' : 'light'
}

// Exercises that could replace one in today's plan: listed alternatives first, then same target group.
export function swapOptions(exId: string, avoid: Set<string>): Exercise[] {
  const e = exById.get(exId)!
  const main = primaryGroups(e)[0]
  const listed = (e.alternatives ?? []).map((id) => exById.get(id)!).filter(Boolean)
  const same = exercises.filter((x) => x.credit[main] === 1 && x.id !== exId && !listed.includes(x))
  return [...listed, ...same].filter((x) => !avoid.has(x.id) && x.level <= 2)
}

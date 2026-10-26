import Dexie, { type EntityTable } from 'dexie'

// Everything lives in the browser's IndexedDB so the app works offline.
// Cloud sync (so desktop and phone share data) is a later step.
export interface SetLog {
  id?: number
  exId?: string // catalog id; missing on sets logged before the catalog existed
  exercise: string // display name at the time of logging
  reps: number // seconds for timed holds
  weight: number // lb, 0 = bodyweight
  at: number // ms epoch
}

export interface PlanItem {
  exId: string
  sets: number
}

// One generated workout per day, kept so it doesn't reshuffle as sets are logged.
export interface Plan {
  date: string // local YYYY-MM-DD
  pairs: PlanItem[][]
  addons: PlanItem[]
  seed: number
}

export interface Pref {
  exId: string
  avoid: boolean
}

export const db = new Dexie('workout-app') as Dexie & {
  sets: EntityTable<SetLog, 'id'>
  plans: EntityTable<Plan, 'date'>
  prefs: EntityTable<Pref, 'exId'>
}

db.version(1).stores({
  sets: '++id, exercise, at',
})
db.version(2).stores({
  sets: '++id, exercise, exId, at',
  plans: 'date',
  prefs: 'exId',
})

export const dayKey = (t: number | Date = Date.now()) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

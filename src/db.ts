import Dexie, { type EntityTable } from 'dexie'

// Logged sets live in the browser's IndexedDB so the app works offline.
// Cloud sync (so desktop and phone share data) is a later step.
export interface SetLog {
  id?: number
  exercise: string
  reps: number
  weight: number // lb, 0 = bodyweight
  at: number // ms epoch
}

export const db = new Dexie('workout-app') as Dexie & {
  sets: EntityTable<SetLog, 'id'>
}

db.version(1).stores({
  sets: '++id, exercise, at',
})

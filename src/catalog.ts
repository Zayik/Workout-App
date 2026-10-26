import data from './data/catalog.json'

// Exercise catalog and tracked groups, generated from the project's planning files
// by scripts/import_catalog.py. Edit the planning files and re-run the script rather than this JSON.
export interface Rx {
  heavy: { reps: string; how: string; rest?: string }
  light: { reps: string; how: string; rest?: string }
  rest?: string // when heavy and light share one rest time
  sets: string
  tempo: string
}

export interface Exercise {
  id: string
  name: string
  type: 'C' | 'I' // compound or isolation
  equip: string
  unit: 'reps' | 'sec'
  level: number // 1 beginner-friendly, 2 moderate, 3 advanced
  stress: string[]
  steps: string[]
  cues: string[]
  muscles: string[]
  rx: Rx
  pattern: string
  stretch: 'yes' | 'some' | 'no'
  credit: Record<string, number> // group id -> 1 (target) or 0.5 (helper)
  img: string[] // start and end photos, relative to the site base
  alternatives?: string[]
}

export interface Group {
  id: string
  name: string
  desc: string
  target: number // credited sets per week
  restHours: number
}

export const exercises = data.exercises as unknown as Exercise[]
export const groups = data.groups as Group[]
export const patterns = data.patterns as Record<string, string>

export const exById = new Map(exercises.map((e) => [e.id, e]))
export const groupById = new Map(groups.map((g) => [g.id, g]))

// Small groups that ride along as 1-set add-ons outside the pairs.
export const ADDON_GROUPS = ['rotator-cuff', 'serratus', 'shins']
export const LOWER_GROUPS = ['quads', 'hamstrings', 'glutes', 'calves', 'shins']

export const primaryGroups = (e: Exercise) => Object.keys(e.credit).filter((g) => e.credit[g] === 1)

export const imgUrl = (path: string) => import.meta.env.BASE_URL + path

// "12-20 reps", or "45-60 s" for holds (the catalog already writes the s on those).
export const repsLabel = (e: Exercise, reps: string) =>
  e.unit === 'sec' ? (/s$/.test(reps) ? reps : `${reps} s`) : `${reps} reps`

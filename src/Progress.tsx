import { useLiveQuery } from 'dexie-react-hooks'
import { db, dayKey } from './db'

// Placeholder: logged sets by day. Trends per lift and per group come later.
export function Progress() {
  const sets = useLiveQuery(() => db.sets.orderBy('at').reverse().limit(200).toArray(), [])
  const days = new Map<string, typeof sets>()
  for (const s of sets ?? []) {
    const k = dayKey(s.at)
    days.set(k, [...(days.get(k) ?? []), s])
  }

  return (
    <>
      <header className="page-head">
        <h1>Progress</h1>
      </header>
      {sets?.length === 0 && <p className="muted">No sets logged yet. Today's workout is on the Today tab.</p>}
      {[...days].map(([day, list]) => (
        <section key={day} className="card">
          <h2 className="pair-title">
            {new Date(list![0].at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} ·{' '}
            {list!.length} sets
          </h2>
          <ul className="history">
            {list!.map((s) => (
              <li key={s.id}>
                <span>{s.exercise}</span>
                <span className="muted">
                  {s.reps} × {s.weight ? `${s.weight} lb` : 'bodyweight'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

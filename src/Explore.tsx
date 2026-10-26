import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { exercises, groups, imgUrl } from './catalog'
import { ExerciseSheet } from './ExerciseSheet'
import { db } from './db'

// Placeholder until the Muscle Map is ported: muscle groups and the exercises that train them.
export function Explore() {
  const [open, setOpen] = useState<string>()
  const [sheet, setSheet] = useState<string>()
  const prefs = useLiveQuery(() => db.prefs.toArray(), [])
  const avoid = useMemo(() => new Set((prefs ?? []).filter((p) => p.avoid).map((p) => p.exId)), [prefs])

  return (
    <>
      <header className="page-head">
        <h1>Explore</h1>
      </header>
      <p className="muted small">The interactive body map comes next. For now, pick a muscle group.</p>
      {groups.map((g) => (
        <section key={g.id} className="card">
          <button className="row-btn" onClick={() => setOpen(open === g.id ? undefined : g.id)} aria-expanded={open === g.id}>
            <span className="ex-name">{g.name}</span>
            <span className="muted small">{g.target} sets/week</span>
          </button>
          {open === g.id && (
            <>
              <p className="small">{g.desc}</p>
              {exercises
                .filter((e) => e.credit[g.id] === 1)
                .map((e) => (
                  <button key={e.id} className="ex-row row-btn" onClick={() => setSheet(e.id)}>
                    <span className="thumb">
                      {e.img[0] ? <img src={imgUrl(e.img[0])} alt="" loading="lazy" /> : <span>?</span>}
                    </span>
                    <span className="ex-main">
                      <span className="ex-name">{e.name}</span>
                      <span className="muted small">
                        {e.equip} · level {e.level}
                      </span>
                    </span>
                  </button>
                ))}
            </>
          )}
        </section>
      ))}
      {sheet && <ExerciseSheet exId={sheet} avoid={avoid} onClose={() => setSheet(undefined)} />}
    </>
  )
}

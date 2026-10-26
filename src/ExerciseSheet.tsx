import { useEffect } from 'react'
import { exById, groupById, imgUrl, patterns, repsLabel } from './catalog'
import { swapOptions } from './planner'

// Full-screen page for one exercise: photos, steps, cues, what it works.
// From a plan, it also offers swaps.
export function ExerciseSheet(props: {
  exId: string
  avoid: Set<string>
  onClose: () => void
  onSwap?: (toId: string) => void
  onToggleAvoid?: () => void
}) {
  const e = exById.get(props.exId)!
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])
  const credited = Object.entries(e.credit).sort((a, b) => b[1] - a[1])

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={e.name}>
      <header className="sheet-head">
        <button className="ghost" onClick={props.onClose} aria-label="Back">
          ‹ Back
        </button>
        <h2>{e.name}</h2>
      </header>

      <div className="sheet-body">
        {e.img.length ? (
          <div className="photos">
            {e.img.map((src, i) => (
              <figure key={src}>
                <img src={imgUrl(src)} alt={`${e.name}, ${i ? 'end' : 'start'} position`} loading="lazy" />
                <figcaption>{i ? 'End' : 'Start'}</figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="no-photo">Photo coming soon</div>
        )}

        <div className="chips">
          {credited.map(([g, c]) => (
            <span key={g} className={c === 1 ? 'chip full' : 'chip half'}>
              {groupById.get(g)?.name ?? g}
              {c < 1 && ' ½'}
            </span>
          ))}
        </div>
        <p className="muted small">
          {patterns[e.pattern]} · {e.equip} · level {e.level}
          {e.stretch === 'yes' && ' · loads the muscle stretched'}
        </p>

        <h3>How to do it</h3>
        <ol>
          {e.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {e.cues.length > 0 && (
          <>
            <h3>Tips</h3>
            <ul className="bullets">
              {e.cues.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </>
        )}

        <h3>Sets and reps</h3>
        <p>
          {e.rx.sets} sets. Light: {repsLabel(e, e.rx.light.reps)}, rest {e.rx.light.rest ?? e.rx.rest}. Heavy:{' '}
          {repsLabel(e, e.rx.heavy.reps)}, rest {e.rx.heavy.rest ?? e.rx.rest}.
        </p>
        <p className="muted small">Tempo: {e.rx.tempo}</p>

        {props.onSwap && (
          <>
            <h3>Swap for</h3>
            <ul className="swap-list">
              {swapOptions(e.id, props.avoid)
                .slice(0, 6)
                .map((x) => (
                  <li key={x.id}>
                    <button className="row-btn" onClick={() => props.onSwap!(x.id)}>
                      <span>{x.name}</span>
                      <span className="muted small">{x.equip}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </>
        )}
        {props.onToggleAvoid && (
          <button className="ghost danger" onClick={props.onToggleAvoid}>
            {props.avoid.has(e.id) ? 'Allow this exercise again' : 'Not for me: leave it out of future workouts'}
          </button>
        )}
        {e.img.length > 0 && (
          <p className="muted small credit">
            Photos: <a href="https://github.com/yuhonas/free-exercise-db">Free Exercise DB</a> (public domain).
          </p>
        )}
      </div>
    </div>
  )
}

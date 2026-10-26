import { useLiveQuery } from 'dexie-react-hooks'
import { Fragment, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { ADDON_GROUPS, exById, groups, imgUrl, primaryGroups, repsLabel } from './catalog'
import { ExerciseSheet } from './ExerciseSheet'
import { db, dayKey, type Plan, type PlanItem, type SetLog } from './db'
import { AIM_GROUPS, buildPlan, weekStatus, zone } from './planner'

const DAY = 86_400_000
const ADDON = new Set(ADDON_GROUPS)

export function Today() {
  const today = dayKey()
  const logs = useLiveQuery(() => db.sets.where('at').above(Date.now() - 35 * DAY).toArray(), [])
  const plan = useLiveQuery(() => db.plans.get(today), [today])
  const prefs = useLiveQuery(() => db.prefs.toArray(), [])
  const avoid = useMemo(() => new Set((prefs ?? []).filter((p) => p.avoid).map((p) => p.exId)), [prefs])
  const [active, setActive] = useState<string>()
  const [sheet, setSheet] = useState<string>()
  const [rest, setRest] = useState<{ until: number; next?: string }>()

  async function newPlan(seed = Date.now()) {
    const all = await db.sets.where('at').above(Date.now() - 35 * DAY).toArray()
    const ps = await db.prefs.toArray()
    const p = buildPlan({ logs: all, avoid: new Set(ps.filter((x) => x.avoid).map((x) => x.exId)), seed })
    await db.plans.put(p)
    setActive(p.pairs[0]?.[0]?.exId)
  }

  useEffect(() => {
    // plan is undefined while loading and when there's none yet; check the table directly.
    db.plans.get(today).then((p) => {
      if (!p) newPlan(1)
    })
  }, [today])

  if (!logs || !plan) return <p className="muted">Building today's workout…</p>

  const status = weekStatus(logs)
  const doneToday = (exId: string) => logs.filter((s) => s.exId === exId && dayKey(s.at) === today)
  const order = [...plan.pairs.flat(), ...plan.addons]
  // Groups that got a full-credit set today, out of the recommended number per session.
  const hitToday = groups.filter((g) => !ADDON.has(g.id) && (status.today[g.id] ?? 0) >= 1).length
  // The plan lists everything owed; mark where a full session ends.
  let fullAt = -1
  for (let i = 0, seen = new Set<string>(); i < plan.pairs.length && fullAt < 0; i++) {
    for (const it of plan.pairs[i]) primaryGroups(exById.get(it.exId)!).forEach((g) => seen.add(g))
    if (seen.size >= AIM_GROUPS) fullAt = i
  }

  function nextAfter(item: PlanItem, pair: PlanItem[]) {
    const left = (i: PlanItem) => i.sets - doneToday(i.exId).length - (i === item ? 1 : 0)
    const partner = pair.find((i) => i !== item && left(i) > 0)
    if (partner) return partner.exId
    if (left(item) > 0) return item.exId
    return order.find((i) => left(i) > 0)?.exId
  }

  async function updatePlan(fn: (p: Plan) => void) {
    const p = structuredClone(plan!)
    fn(p)
    await db.plans.put(p)
  }

  async function swap(from: string, to: string) {
    await updatePlan((p) => {
      for (const i of [...p.pairs.flat(), ...p.addons]) if (i.exId === from) i.exId = to
    })
    if (active === from) setActive(to)
    setSheet(undefined)
  }

  async function toggleAvoid(exId: string) {
    await db.prefs.put({ exId, avoid: !avoid.has(exId) })
  }

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Today</h1>
          <p className="muted small">
            {new Date(`${today}T12:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })} ·{' '}
            {hitToday} of {AIM_GROUPS} groups
          </p>
        </div>
      </header>

      <section className="week" aria-label="This week">
        {groups.map((g) => {
          const d = status.done[g.id] ?? 0
          const pct = Math.min(1, d / g.target)
          const r = status.resting.has(g.id)
          return (
            <div key={g.id} className={r ? 'wk resting' : pct >= 1 ? 'wk met' : 'wk'} title={g.desc}>
              <span className="wk-name">{g.name}</span>
              <span className="wk-num">{r ? 'rest' : `${fmt(d)}/${g.target}`}</span>
              <span className="bar" style={{ '--p': pct } as CSSProperties} />
            </div>
          )
        })}
      </section>
      <p className="muted small">Credited sets in the last 7 days. Resting groups are left out today.</p>

      {order.length === 0 && (
        <div className="card empty-day">
          <h2>Rest day</h2>
          <p className="muted">Everything is either on target this week or still recovering. A walk counts.</p>
        </div>
      )}

      {order.length > 0 && (
        <p className="small aim">
          Aim for about {AIM_GROUPS} muscle groups today. Stop whenever you need to: anything you skip moves to the
          top next time.
        </p>
      )}

      {plan.pairs.map((pair, pi) => (
        <Fragment key={pi}>
          {pi === fullAt + 1 && fullAt >= 0 && (
            <p className="full-line small">That's a full session. The rest is a bonus if you have energy.</p>
          )}
          <section className="card">
            <h2 className="pair-title">{pair.length > 1 ? `Pair ${pi + 1}` : `Exercise ${pi + 1}`}</h2>
            {pair.length > 1 && <p className="muted small">Alternate: one set of each, rest about 60-90 s between.</p>}
            {pair.map((item) => (
              <ExerciseRow
                key={item.exId}
                item={item}
                logs={logs}
                done={doneToday(item.exId)}
                open={active === item.exId}
                onOpen={() => setActive(active === item.exId ? undefined : item.exId)}
                onInfo={() => setSheet(item.exId)}
                onLogged={() => {
                  const next = nextAfter(item, pair)
                  setRest({ until: Date.now() + (next && next !== item.exId ? 75 : 90) * 1000, next })
                  setActive(next)
                }}
              />
            ))}
          </section>
        </Fragment>
      ))}

      {plan.addons.length > 0 && (
        <section className="card">
          <h2 className="pair-title">Add-ons</h2>
          <p className="muted small">One light set each. Do them in the warm-up or while resting.</p>
          {plan.addons.map((item) => (
            <ExerciseRow
              key={item.exId}
              item={item}
              logs={logs}
              done={doneToday(item.exId)}
              open={active === item.exId}
              onOpen={() => setActive(active === item.exId ? undefined : item.exId)}
              onInfo={() => setSheet(item.exId)}
              onLogged={() => setActive(nextAfter(item, [item]))}
            />
          ))}
        </section>
      )}

      <button className="ghost wide" onClick={() => newPlan()}>
        Shuffle today's workout
      </button>

      {rest && <RestTimer rest={rest} onDone={() => setRest(undefined)} />}

      {sheet && (
        <ExerciseSheet
          exId={sheet}
          avoid={avoid}
          onClose={() => setSheet(undefined)}
          onSwap={(to) => swap(sheet, to)}
          onToggleAvoid={() => toggleAvoid(sheet)}
        />
      )}
    </>
  )
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

function ExerciseRow(props: {
  item: PlanItem
  logs: SetLog[]
  done: SetLog[]
  open: boolean
  onOpen: () => void
  onInfo: () => void
  onLogged: () => void
}) {
  const e = exById.get(props.item.exId)!
  const z = zone(e.id, props.logs)
  const last = useLiveQuery(() => db.sets.where('exId').equals(e.id).last(), [e.id])
  // Blank until edited, then pre-filled from the last set of this exercise.
  const [repsIn, setReps] = useState<string>()
  const [weightIn, setWeight] = useState<string>()
  const reps = repsIn ?? (last ? String(last.reps) : '')
  const weight = weightIn ?? (last?.weight ? String(last.weight) : '')
  const complete = props.done.length >= props.item.sets
  const unit = e.unit === 'sec' ? 's' : 'reps'

  async function log(ev: FormEvent) {
    ev.preventDefault()
    if (!reps) return
    await db.sets.add({ exId: e.id, exercise: e.name, reps: Number(reps), weight: Number(weight) || 0, at: Date.now() })
    props.onLogged()
  }

  return (
    <div className={`ex${props.open ? ' open' : ''}${complete ? ' complete' : ''}`}>
      <div className="ex-row">
        <button className="thumb" onClick={props.onInfo} aria-label={`How to do ${e.name}`}>
          {e.img[0] ? <img src={imgUrl(e.img[0])} alt="" loading="lazy" /> : <span>?</span>}
        </button>
        <button className="ex-main" onClick={props.onOpen} aria-expanded={props.open}>
          <span className="ex-name">{e.name}</span>
          <span className="muted small">
            {props.item.sets} × {repsLabel(e, e.rx[z].reps)} · {z}
          </span>
        </button>
        <span className="ex-count" aria-label={`${props.done.length} of ${props.item.sets} sets done`}>
          {complete ? '✓' : `${props.done.length}/${props.item.sets}`}
        </span>
      </div>
      {props.open && (
        <div className="ex-log">
          {props.done.length > 0 && (
            <ol className="done-sets">
              {props.done.map((s) => (
                <li key={s.id}>
                  {s.reps} {unit} · {s.weight ? `${s.weight} lb` : 'bodyweight'}
                </li>
              ))}
            </ol>
          )}
          <form onSubmit={log}>
            <input
              placeholder={unit}
              inputMode="numeric"
              value={reps}
              onChange={(ev) => setReps(ev.target.value)}
              aria-label={e.unit === 'sec' ? 'Seconds' : 'Reps'}
            />
            <input
              placeholder="lb"
              inputMode="decimal"
              value={weight}
              onChange={(ev) => setWeight(ev.target.value)}
              aria-label="Weight in pounds, blank for bodyweight"
            />
            <button type="submit">{complete ? 'Log extra set' : `Log set ${props.done.length + 1}`}</button>
          </form>
          <p className="muted small">
            {e.rx[z].how[0].toUpperCase() + e.rx[z].how.slice(1)}. Stop 2-3 reps before you can't do another.
          </p>
        </div>
      )}
    </div>
  )
}

function RestTimer(props: { rest: { until: number; next?: string }; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])
  const left = Math.max(0, Math.ceil((props.rest.until - now) / 1000))
  const next = props.rest.next && exById.get(props.rest.next)?.name
  return (
    <div className={`rest${left === 0 ? ' go' : ''}`} role="status">
      <span className="rest-time">
        {left ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Go'}
      </span>
      <span className="rest-next">{next ? `Next: ${next}` : 'Workout done'}</span>
      <button className="ghost" onClick={props.onDone}>
        {left ? 'Skip' : 'OK'}
      </button>
    </div>
  )
}

import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { db } from './db'

function App() {
  const sets = useLiveQuery(() => db.sets.orderBy('at').reverse().limit(50).toArray(), [])
  const [exercise, setExercise] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')

  async function addSet(e: FormEvent) {
    e.preventDefault()
    if (!exercise.trim() || !reps) return
    await db.sets.add({
      exercise: exercise.trim(),
      reps: Number(reps),
      weight: Number(weight) || 0,
      at: Date.now(),
    })
    setReps('')
  }

  return (
    <main>
      <h1>Workout</h1>

      <form onSubmit={addSet}>
        <input
          placeholder="Exercise"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          aria-label="Exercise"
        />
        <input
          placeholder="Reps"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          aria-label="Reps"
        />
        <input
          placeholder="lb"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          aria-label="Weight in pounds"
        />
        <button type="submit">Log set</button>
      </form>

      <ul>
        {sets?.map((s) => (
          <li key={s.id}>
            <span>{s.exercise}</span>
            <span>
              {s.reps} × {s.weight ? `${s.weight} lb` : 'bodyweight'}
            </span>
            <time>{new Date(s.at).toLocaleString()}</time>
          </li>
        ))}
      </ul>
      {sets?.length === 0 && <p className="empty">No sets logged yet.</p>}
    </main>
  )
}

export default App

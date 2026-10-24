import { useState } from 'react'
import { Explore } from './Explore'
import { Progress } from './Progress'
import { Today } from './Today'

const TABS = [
  { id: 'today', label: 'Today', icon: '◉' },
  { id: 'explore', label: 'Explore', icon: '◎' },
  { id: 'progress', label: 'Progress', icon: '▤' },
] as const
type Tab = (typeof TABS)[number]['id']

function App() {
  const [tab, setTab] = useState<Tab>('today')

  return (
    <>
      <main>
        {tab === 'today' && <Today />}
        {tab === 'explore' && <Explore />}
        {tab === 'progress' && <Progress />}
      </main>
      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  )
}

export default App

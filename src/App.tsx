import { useState } from 'react'
import { AcordesPage } from './features/acordes/AcordesPage'
import { AfinadorPage } from './features/afinador/AfinadorPage'
import { EscalasPage } from './features/escalas/EscalasPage'
import { ImprovisoPage } from './features/improviso/ImprovisoPage'

type Area = 'improviso' | 'acordes' | 'escalas' | 'afinador'
const AREAS: { id: Area; label: string }[] = [
  { id: 'improviso', label: 'Improviso' },
  { id: 'acordes', label: 'Acordes' },
  { id: 'escalas', label: 'Escalas' },
  { id: 'afinador', label: 'Afinador' },
]

export function App() {
  const [area, setArea] = useState<Area>(() => {
    // #acordes no endereço abre direto na área (link direto)
    const fromHash = location.hash.slice(1) as Area
    if (AREAS.some((a) => a.id === fromHash)) return fromHash
    try {
      return (localStorage.getItem('area') as Area) || 'improviso'
    } catch {
      return 'improviso'
    }
  })
  const go = (a: Area) => {
    setArea(a)
    try {
      localStorage.setItem('area', a)
    } catch {
      /* sem armazenamento: só não lembra a aba */
    }
  }

  return (
    <div className="wrap">
      <header>
        <h1>Treinador de Improviso</h1>
        <nav className="tabs">
          {AREAS.map((a) => (
            <button key={a.id} type="button" aria-current={area === a.id ? 'page' : undefined} onClick={() => go(a.id)}>
              {a.label}
            </button>
          ))}
        </nav>
      </header>
      {/* o Improviso fica montado: a base continua tocando enquanto você treina acordes */}
      <div hidden={area !== 'improviso'}>
        <ImprovisoPage />
      </div>
      {area === 'acordes' && <AcordesPage />}
      {area === 'escalas' && <EscalasPage />}
      {area === 'afinador' && <AfinadorPage />}
    </div>
  )
}

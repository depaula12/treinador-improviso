import { useState, type ReactNode } from 'react'
import { AcordesPage } from './features/acordes/AcordesPage'
import { AfinadorPage } from './features/afinador/AfinadorPage'
import { EscalasPage } from './features/escalas/EscalasPage'
import { ImprovisoPage } from './features/improviso/ImprovisoPage'
import { JamPage } from './features/jam/JamPage'
import { MusicasPage } from './features/musicas/MusicasPage'
import { Player } from './ui/Player'

type Area = 'improviso' | 'musicas' | 'acordes' | 'escalas' | 'jam' | 'afinador'

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
)
const AREAS: { id: Area; label: string; icon: ReactNode }[] = [
  { id: 'improviso', label: 'Improviso', icon: icon(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>) },
  { id: 'musicas', label: 'Músicas', icon: icon(<path d="M4 6h16M4 12h16M4 18h10" />) },
  { id: 'acordes', label: 'Acordes', icon: icon(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v18M14 3v18M5 9h14M5 14h14" /></>) },
  { id: 'escalas', label: 'Escalas', icon: icon(<path d="M3 18l5-5 4 3 9-10" />) },
  { id: 'jam', label: 'Jam livre', icon: icon(<path d="M12 3v18M7 8v8M17 6v12M3 11v2M21 10v4" />) },
  { id: 'afinador', label: 'Afinador', icon: icon(<><path d="M4 16a8 8 0 0 1 16 0" /><path d="M12 16l4-6" /></>) },
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
    document.querySelector('.main')?.scrollTo({ top: 0 })
    try {
      localStorage.setItem('area', a)
    } catch {
      /* sem armazenamento: só não lembra a aba */
    }
  }

  return (
    <div className="app">
      <nav className="side" aria-label="Áreas">
        <div className="brand">solonely<span>.</span></div>
        {AREAS.map((a) => (
          <button key={a.id} type="button" className="nav-btn" aria-current={area === a.id ? 'page' : undefined} onClick={() => go(a.id)}>
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
        {/* atribuição exigida pelas licenças CC BY dos samples (ver public/samples/LICENSES.md) */}
        <footer className="side-foot credits">
          Samples: Salamander Grand Piano (Alexander Holm, CC BY 3.0) · FluidR3_GM (Frank Wen, CC BY 3.0) ·
          MuldjordKit (Lars Muldjord / FreePats, CC BY 4.0).{' '}
          <a href="/samples/LICENSES.md" target="_blank" rel="noreferrer">Licenças</a>
        </footer>
      </nav>

      <main className="main">
        {/* o Improviso fica montado: a base continua tocando enquanto você treina em outra área */}
        <div hidden={area !== 'improviso'}>
          <ImprovisoPage />
        </div>
        {area === 'musicas' && <MusicasPage go={go} />}
        {area === 'acordes' && <AcordesPage />}
        {area === 'escalas' && <EscalasPage />}
        {area === 'jam' && <JamPage />}
        {area === 'afinador' && <AfinadorPage />}
      </main>

      <Player />
    </div>
  )
}

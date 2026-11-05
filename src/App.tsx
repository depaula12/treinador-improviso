import { useState, type ReactNode } from 'react'
import { AcordesPage } from './features/acordes/AcordesPage'
import { AfinadorPage } from './features/afinador/AfinadorPage'
import { ComporPage } from './features/compor/ComporPage'
import { EscalasPage } from './features/escalas/EscalasPage'
import { HojePage } from './features/hoje/HojePage'
import { TrainBanner } from './features/hoje/TrainBanner'
import { useTimerWatch } from './features/hoje/timer'
import { ImprovisoPage } from './features/improviso/ImprovisoPage'
import { JamPage } from './features/jam/JamPage'
import { MusicasPage } from './features/musicas/MusicasPage'
import { OuvidoPage } from './features/ouvido/OuvidoPage'
import { TeoriaPage } from './features/teoria/TeoriaPage'
import { useNav, type Area } from './ui/nav'
import { Player } from './ui/Player'

const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
)
const ICONS: Record<Area, ReactNode> = {
  hoje: icon(<><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4" /></>),
  improviso: icon(<><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>),
  escalas: icon(<path d="M3 18l5-5 4 3 9-10" />),
  acordes: icon(<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v18M14 3v18M5 9h14M5 14h14" /></>),
  ouvido: icon(<><path d="M6 10a6 6 0 1 1 11 3.3c-.9 1.3-2 2-2 3.7a3 3 0 0 1-5.6 1.5" /><path d="M9 10a3 3 0 0 1 6 0" /></>),
  teoria: icon(<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5M8 7h7M8 11h5" /></>),
  musicas: icon(<path d="M4 6h16M4 12h16M4 18h10" />),
  compor: icon(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>),
  jam: icon(<path d="M12 3v18M7 8v8M17 6v12M3 11v2M21 10v4" />),
  afinador: icon(<><path d="M4 16a8 8 0 0 1 16 0" /><path d="M12 16l4-6" /></>),
}
const LABEL: Record<Area, string> = {
  hoje: 'Hoje', improviso: 'Improviso', escalas: 'Escalas', acordes: 'Acordes', ouvido: 'Ouvido', teoria: 'Teoria',
  musicas: 'Músicas', compor: 'Compor', jam: 'Jam livre', afinador: 'Afinador',
}
/** menu lateral em grupos */
const GROUPS: { name: string | null; areas: Area[] }[] = [
  { name: null, areas: ['hoje'] },
  { name: 'Praticar', areas: ['improviso', 'escalas', 'acordes', 'ouvido', 'teoria'] },
  { name: 'Repertório', areas: ['musicas', 'compor'] },
  { name: 'Ferramentas', areas: ['jam', 'afinador'] },
]
/** barra do celular: estas quatro + "Mais" */
const PHONE: Area[] = ['hoje', 'improviso', 'escalas', 'musicas']

export function App() {
  const area = useNav((s) => s.area)
  const go = useNav((s) => s.go)
  const [more, setMore] = useState(false)
  useTimerWatch()
  const pick = (a: Area) => {
    setMore(false)
    go(a)
  }
  const navBtn = (a: Area, cls = '') => (
    <button key={a} type="button" className={`nav-btn ${cls}`} aria-current={area === a ? 'page' : undefined} onClick={() => pick(a)}>
      {ICONS[a]}
      <span>{LABEL[a]}</span>
    </button>
  )

  return (
    <div className="app">
      <nav className="side" aria-label="Áreas">
        <div className="brand">solonely<span>.</span></div>
        {GROUPS.map((g, i) => (
          <div key={i} className="nav-group">
            {g.name && <div className="nav-head">{g.name}</div>}
            {g.areas.map((a) => navBtn(a, PHONE.includes(a) ? '' : 'desk-only'))}
          </div>
        ))}
        <button type="button" className={`nav-btn phone-only`} aria-expanded={more} aria-current={!PHONE.includes(area) ? 'page' : undefined} onClick={() => setMore(!more)}>
          {icon(<><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>)}
          <span>{PHONE.includes(area) ? 'Mais' : LABEL[area]}</span>
        </button>
        {/* atribuição exigida pelas licenças CC BY dos samples (ver public/samples/LICENSES.md) */}
        <footer className="side-foot credits">
          Samples: Salamander Grand Piano (Alexander Holm, CC BY 3.0) · FluidR3_GM (Frank Wen, CC BY 3.0) ·
          MuldjordKit (Lars Muldjord / FreePats, CC BY 4.0).{' '}
          <a href="/samples/LICENSES.md" target="_blank" rel="noreferrer">Licenças</a>
        </footer>
      </nav>

      {more && (
        <div className="more-sheet" role="dialog" aria-label="Mais áreas" onClick={() => setMore(false)}>
          <div className="more-card" onClick={(e) => e.stopPropagation()}>
            {GROUPS.filter((g) => g.areas.some((a) => !PHONE.includes(a))).map((g) => (
              <div key={g.name} className="more-group">
                <div className="nav-head">{g.name}</div>
                <div className="more-grid">{g.areas.filter((a) => !PHONE.includes(a)).map((a) => navBtn(a))}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="main">
        <TrainBanner />
        {area === 'hoje' && <HojePage />}
        {/* o Improviso fica montado: a base continua tocando enquanto você treina em outra área */}
        <div hidden={area !== 'improviso'}>
          <ImprovisoPage />
        </div>
        {area === 'musicas' && <MusicasPage go={go} />}
        {area === 'compor' && <ComporPage go={go} />}
        {area === 'acordes' && <AcordesPage />}
        {area === 'escalas' && <EscalasPage />}
        {area === 'ouvido' && <OuvidoPage />}
        {area === 'teoria' && <TeoriaPage />}
        {area === 'jam' && <JamPage />}
        {area === 'afinador' && <AfinadorPage />}
      </main>

      <Player />
    </div>
  )
}

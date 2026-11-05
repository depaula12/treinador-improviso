import { create } from 'zustand'
import type { AreaId } from '../core/plano'

/**
 * Área aberta. Fica num store para o Treino do dia poder levar a uma área ("Abrir").
 * Cada área tem endereço (#escalas) e entra no histórico do navegador: o Voltar do celular volta
 * para a área anterior em vez de fechar o app.
 */
export type Area = AreaId

const AREA_IDS: Area[] = ['hoje', 'improviso', 'musicas', 'compor', 'acordes', 'escalas', 'ouvido', 'teoria', 'jam', 'afinador']

export const areaFromHash = (hash: string): Area | null => {
  const id = hash.replace(/^#/, '').split(/[/?]/)[0] as Area
  return AREA_IDS.includes(id) ? id : null
}

function initial(): Area {
  // #acordes no endereço abre direto na área (link direto)
  const fromHash = areaFromHash(location.hash)
  if (fromHash) return fromHash
  try {
    const saved = localStorage.getItem('area') as Area | null
    return saved && AREA_IDS.includes(saved) ? saved : 'hoje'
  } catch {
    return 'hoje'
  }
}

function remember(a: Area) {
  try {
    localStorage.setItem('area', a)
  } catch {
    /* sem armazenamento: só não lembra a aba */
  }
}

interface NavState {
  area: Area
  go: (a: Area) => void
}

export const useNav = create<NavState>((set, get) => ({
  area: initial(),
  go: (a) => {
    if (a !== get().area) {
      // pushState não rola a página como mudar o hash direto
      history.pushState({ area: a }, '', `#${a}`)
      set({ area: a })
    }
    document.querySelector('.main')?.scrollTo({ top: 0 })
    remember(a)
  },
}))

export const go = (a: Area) => useNav.getState().go(a)

/** liga o endereço à área: chamado uma vez na abertura */
export function installNavHistory() {
  const a = useNav.getState().area
  // a entrada atual do histórico passa a ser a da área aberta (sem criar outra)
  if (areaFromHash(location.hash) !== a) history.replaceState({ area: a }, '', `#${a}`)
  const sync = () => {
    const to = areaFromHash(location.hash) ?? 'hoje'
    if (to !== useNav.getState().area) {
      useNav.setState({ area: to })
      remember(to)
    }
  }
  window.addEventListener('popstate', sync)
  window.addEventListener('hashchange', sync)
}

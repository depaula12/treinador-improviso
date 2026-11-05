import { create } from 'zustand'
import type { AreaId } from '../core/plano'

/** Área aberta. Fica num store para o Treino do dia poder levar a uma área ("Abrir"). */
export type Area = AreaId

const AREA_IDS: Area[] = ['hoje', 'improviso', 'musicas', 'compor', 'acordes', 'escalas', 'ouvido', 'jam', 'afinador']

function initial(): Area {
  // #acordes no endereço abre direto na área (link direto)
  const fromHash = location.hash.slice(1) as Area
  if (AREA_IDS.includes(fromHash)) return fromHash
  try {
    const saved = localStorage.getItem('area') as Area | null
    return saved && AREA_IDS.includes(saved) ? saved : 'hoje'
  } catch {
    return 'hoje'
  }
}

interface NavState {
  area: Area
  go: (a: Area) => void
}

export const useNav = create<NavState>((set) => ({
  area: initial(),
  go: (a) => {
    set({ area: a })
    document.querySelector('.main')?.scrollTo({ top: 0 })
    try {
      localStorage.setItem('area', a)
    } catch {
      /* sem armazenamento: só não lembra a aba */
    }
  },
}))

export const go = (a: Area) => useNav.getState().go(a)

import { create } from 'zustand'
import { soundingKey, timedChords, toPlayBars, type Song } from '../../core/song'
import { KEYS } from '../../core/theory'
import { useImproviso } from '../improviso/store'
import { db } from './db'

interface SongsState {
  songs: Song[]
  loaded: boolean
  /** música aberta no editor */
  openId: string | null
  load: () => Promise<void>
  save: (song: Song) => Promise<void>
  remove: (id: string) => Promise<void>
  open: (id: string | null) => void
}

export const useSongs = create<SongsState>((set, get) => ({
  songs: [],
  loaded: false,
  openId: null,
  load: async () => {
    if (get().loaded) return
    try {
      const songs = await db.songs.orderBy('updatedAt').reverse().toArray()
      set({ songs, loaded: true })
    } catch {
      // navegador sem IndexedDB (aba anônima antiga): funciona, só não guarda
      set({ loaded: true })
    }
  },
  save: async (song) => {
    set((s) => ({ songs: [song, ...s.songs.filter((x) => x.id !== song.id)] }))
    syncImproviso(song)
    try {
      await db.songs.put(song)
    } catch {
      /* sem armazenamento: fica só nesta sessão */
    }
  },
  remove: async (id) => {
    set((s) => ({ songs: s.songs.filter((x) => x.id !== id), openId: s.openId === id ? null : s.openId }))
    const imp = useImproviso.getState()
    if (imp.song?.id === id) imp.set({ song: null, ...(imp.progId === 'song' ? { progId: 'blues12' } : {}) })
    try {
      await db.songs.delete(id)
    } catch {
      /* idem */
    }
  },
  open: (id) => set({ openId: id }),
}))

/** Carrega a música como base do Improviso (tom, escala, andamento e estilo dela). */
export function loadIntoImproviso(song: Song) {
  const key = soundingKey(song)
  const minor = key.endsWith('m')
  useImproviso.getState().set({
    progId: 'song',
    song: { id: song.id, title: song.title, bars: toPlayBars(timedChords(song)) },
    key: KEYS[keyPc(key)],
    keyMinor: minor,
    scaleId: minor ? 'pentMin' : 'pentMaj',
    bpm: song.bpm,
    styleId: song.styleId,
  })
}

/** Editou a música que está carregada no Improviso: atualiza a base sem trocar o resto. */
function syncImproviso(song: Song) {
  const imp = useImproviso.getState()
  if (imp.song?.id !== song.id) return
  imp.set({ song: { id: song.id, title: song.title, bars: toPlayBars(timedChords(song)) }, bpm: song.bpm, styleId: song.styleId })
}

const PCS: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
const keyPc = (key: string) => PCS[key.replace(/m$/, '')] ?? 0

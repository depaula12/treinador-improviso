import { create } from 'zustand'
import { backupFileName, buildBackup, mergeSongs, parseBackup, STORE_KEYS, type Backup } from '../../core/backup'
import { db } from '../musicas/db'
import { useSongs } from '../musicas/store'

const META = 'backup-v1'

/** quando foi o último backup (ms) ou null */
export function lastBackupAt(): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(META) ?? 'null') as { at?: number } | null
    return typeof v?.at === 'number' ? v.at : null
  } catch {
    return null
  }
}

async function allSongs() {
  try {
    return await db.songs.toArray()
  } catch {
    return useSongs.getState().songs
  }
}

function readStores(): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const k of STORE_KEYS) {
    try {
      out[k] = localStorage.getItem(k)
    } catch {
      out[k] = null
    }
  }
  return out
}

/** monta o backup e baixa o arquivo */
export async function exportAll(): Promise<{ songs: number }> {
  const songs = await allSongs()
  const b = buildBackup(songs, readStores())
  const blob = new Blob([JSON.stringify(b)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFileName()
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2000)
  try {
    localStorage.setItem(META, JSON.stringify({ at: Date.now() }))
  } catch {
    /* sem armazenamento */
  }
  useDados.getState().touch()
  return { songs: songs.length }
}

export function readBackupFile(file: File): Promise<ReturnType<typeof parseBackup>> {
  return file.text().then(parseBackup, () => ({ ok: false as const, error: 'Não consegui ler o arquivo.' }))
}

/** resumo do que o import vai fazer, para confirmar antes */
export async function previewImport(b: Backup) {
  const current = await allSongs()
  const m = mergeSongs(current, b.songs)
  return { added: m.added, updated: m.updated, stores: Object.keys(b.stores).length, exportedAt: b.exportedAt }
}

/**
 * Aplica o backup: músicas juntadas por id (fica a mais nova); com `replaceProgress`, as outras áreas
 * passam a ser as do arquivo. Recarrega a página no fim para todas as telas lerem os dados novos.
 */
export async function applyImport(b: Backup, replaceProgress: boolean) {
  const current = await allSongs()
  const m = mergeSongs(current, b.songs)
  try {
    await db.songs.bulkPut(m.songs)
  } catch {
    throw new Error('Não consegui gravar o repertório neste navegador (armazenamento cheio ou bloqueado).')
  }
  if (replaceProgress) {
    for (const [k, v] of Object.entries(b.stores)) localStorage.setItem(k, v)
  }
  location.reload()
}

/** painel "Seus dados" aberto + contador para re-renderizar depois de exportar */
export const useDados = create<{ open: boolean; tick: number; set: (open: boolean) => void; touch: () => void }>((set) => ({
  open: false,
  tick: 0,
  set: (open) => set({ open }),
  touch: () => set((s) => ({ tick: s.tick + 1 })),
}))

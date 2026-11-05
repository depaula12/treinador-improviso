/**
 * Backup de tudo o que o app guarda neste navegador: repertório (IndexedDB) e as áreas que ficam no
 * localStorage (plano do dia, teoria, quizzes, escalas, compor, entrada de áudio, improviso…).
 * Puro: quem lê e grava o armazenamento é features/dados.
 */
import type { Song } from './song'

export const BACKUP_SCHEMA = 1

/** chaves do localStorage que entram no backup (todas as áreas que guardam algo) */
export const STORE_KEYS = [
  'hoje-v1', 'teoria-v1', 'acordes-v1', 'escalas-v1', 'compor-v1', 'entrada-v1',
  'improviso-v1', 'ouvido-v1', 'paineis-v1',
] as const

export interface Backup {
  schema: number
  app: 'solonely'
  exportedAt: string
  songs: Song[]
  /** conteúdo bruto (string JSON) de cada chave do localStorage */
  stores: Record<string, string>
}

export function buildBackup(songs: Song[], stores: Record<string, string | null>, now = new Date()): Backup {
  const kept: Record<string, string> = {}
  for (const k of STORE_KEYS) if (typeof stores[k] === 'string') kept[k] = stores[k] as string
  return { schema: BACKUP_SCHEMA, app: 'solonely', exportedAt: now.toISOString(), songs, stores: kept }
}

const isSong = (x: unknown): x is Song => {
  const s = x as Song
  return !!s && typeof s.id === 'string' && typeof s.title === 'string' && Array.isArray(s.sections) &&
    s.sections.every((sec) => sec && Array.isArray(sec.bars)) && typeof s.updatedAt === 'number'
}

/** Lê e valida o arquivo. Erros em português, para mostrar ao usuário. */
export function parseBackup(text: string): { ok: true; backup: Backup } | { ok: false; error: string } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'O arquivo não é um backup do solonely (não é JSON).' }
  }
  const b = data as Partial<Backup>
  if (!b || b.app !== 'solonely') return { ok: false, error: 'O arquivo não é um backup do solonely.' }
  if (typeof b.schema !== 'number' || b.schema > BACKUP_SCHEMA) return { ok: false, error: 'Backup de uma versão mais nova do app. Atualize a página e tente de novo.' }
  if (!Array.isArray(b.songs) || !b.songs.every(isSong)) return { ok: false, error: 'O repertório do arquivo está corrompido.' }
  const stores: Record<string, string> = {}
  for (const [k, v] of Object.entries(b.stores ?? {})) {
    if (!(STORE_KEYS as readonly string[]).includes(k) || typeof v !== 'string') continue
    try {
      JSON.parse(v)
      stores[k] = v
    } catch {
      /* chave estragada: fica de fora */
    }
  }
  return { ok: true, backup: { schema: b.schema, app: 'solonely', exportedAt: String(b.exportedAt ?? ''), songs: b.songs, stores } }
}

/** Junta o repertório: por id, fica a versão editada mais recentemente. Nada é apagado. */
export function mergeSongs(current: Song[], incoming: Song[]) {
  const byId = new Map(current.map((s) => [s.id, s]))
  let added = 0
  let updated = 0
  for (const s of incoming) {
    const cur = byId.get(s.id)
    if (!cur) {
      byId.set(s.id, s)
      added++
    } else if (s.updatedAt > cur.updatedAt) {
      byId.set(s.id, s)
      updated++
    }
  }
  return { songs: [...byId.values()], added, updated }
}

/** nome do arquivo: solonely-2026-11-05.json */
export const backupFileName = (d = new Date()) =>
  `solonely-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`

/** Hora de lembrar do backup? Nunca fez ou faz mais de 14 dias, e já há o que perder. */
export function backupDue(lastAt: number | null, hasData: boolean, now = Date.now()): boolean {
  if (!hasData) return false
  return lastAt === null || now - lastAt > 14 * 86_400_000
}

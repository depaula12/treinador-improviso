import { describe, expect, it } from 'vitest'
import { backupDue, backupFileName, buildBackup, mergeSongs, parseBackup, STORE_KEYS } from './backup'
import type { Song } from './song'

const song = (id: string, updatedAt: number, title = id): Song => ({
  id, title, artist: '', key: 'C', transpose: 0, bpm: 90, styleId: 'rock',
  sections: [{ name: 'Verso', bars: [['C'], ['G']] }], createdAt: 1, updatedAt,
})

describe('backup', () => {
  it('ida e volta: exporta e lê o mesmo conteúdo', () => {
    const stores = { 'hoje-v1': '{"state":{"days":{}}}', 'teoria-v1': '{"state":{}}', 'outra-coisa': 'x' }
    const b = buildBackup([song('a', 5)], stores, new Date('2026-11-05T12:00:00Z'))
    expect(Object.keys(b.stores)).toEqual(['hoje-v1', 'teoria-v1'])
    const r = parseBackup(JSON.stringify(b))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.backup.songs[0].id).toBe('a')
      expect(r.backup.stores['hoje-v1']).toBe(stores['hoje-v1'])
    }
  })
  it('recusa arquivos que não são backup, com mensagem em português', () => {
    expect(parseBackup('não é json')).toEqual({ ok: false, error: expect.stringMatching(/não é JSON/) })
    expect(parseBackup('{"app":"outro"}').ok).toBe(false)
    expect(parseBackup(JSON.stringify({ app: 'solonely', schema: 99, songs: [], stores: {} }))).toEqual({ ok: false, error: expect.stringMatching(/versão mais nova/) })
    expect(parseBackup(JSON.stringify({ app: 'solonely', schema: 1, songs: [{ id: 1 }], stores: {} })).ok).toBe(false)
  })
  it('ignora chaves desconhecidas e conteúdo estragado', () => {
    const r = parseBackup(JSON.stringify({ app: 'solonely', schema: 1, songs: [], stores: { 'hoje-v1': '{', 'x-v1': '{}', 'teoria-v1': '{"a":1}' } }))
    expect(r.ok && Object.keys(r.backup.stores)).toEqual(['teoria-v1'])
  })
  it('todas as áreas que guardam algo estão na lista', () => {
    for (const k of ['hoje-v1', 'teoria-v1', 'acordes-v1', 'escalas-v1', 'compor-v1', 'entrada-v1', 'improviso-v1', 'ouvido-v1']) expect(STORE_KEYS).toContain(k)
  })
})

describe('juntar repertório', () => {
  it('por id, fica a versão mais nova; nada é apagado', () => {
    const r = mergeSongs([song('a', 10, 'A velha'), song('b', 5)], [song('a', 20, 'A nova'), song('c', 1), song('b', 1)])
    expect(r.added).toBe(1)
    expect(r.updated).toBe(1)
    expect(r.songs.map((s) => s.title).sort()).toEqual(['A nova', 'b', 'c'])
  })
})

it('nome do arquivo e lembrete', () => {
  expect(backupFileName(new Date(2026, 10, 5))).toBe('solonely-2026-11-05.json')
  const now = Date.UTC(2026, 10, 30)
  expect(backupDue(null, true, now)).toBe(true)
  expect(backupDue(null, false, now)).toBe(false)
  expect(backupDue(now - 3 * 86_400_000, true, now)).toBe(false)
  expect(backupDue(now - 20 * 86_400_000, true, now)).toBe(true)
})

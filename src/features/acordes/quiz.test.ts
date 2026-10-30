import { describe, expect, it } from 'vitest'
import { TUNING } from '../../core/fretboard-model'
import { parseChord } from '../../core/theory'
import { QUALITIES, qualityById } from '../../core/voicings'
import { drawWeighted, grade } from './leitner'
import { buildItems, degLabel, drawItem, LEVELS, makeQuestion, songTargets, spell, type QuestionType } from './quiz-model'

const LOW = [...TUNING].reverse()
const all = QUALITIES.map((q) => q.id)
const KINDS = ['aberta', 'pestana', 'movel', 'triade'] as const
const ALL_TYPES: QuestionType[] = ['cifra-desenho', 'desenho-cifra', 'grau-no-desenho', 'nota-do-grau', 'comparar', 'cifra-notas', 'cronometrado']
const pcsOf = (frets: (number | null)[]) => frets.flatMap((f, i) => (f === null ? [] : [(LOW[i] + f) % 12]))

describe('itens do quiz', () => {
  it('muito mais perguntas que antes: centenas de itens no nível 4', () => {
    const items = buildItems({ types: ALL_TYPES, qualities: all, kinds: [...KINDS] })
    expect(items.length).toBeGreaterThan(500)
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length)
  })

  it('os níveis crescem em quantidade e complexidade', () => {
    const n = (l: 1 | 2 | 3 | 4) => buildItems({ types: ['cifra-desenho'], qualities: LEVELS[l].qualities, kinds: LEVELS[l].kinds }).length
    expect(n(1)).toBeGreaterThan(5)
    expect(n(1)).toBeLessThan(n(2))
    expect(n(2)).toBeLessThan(n(3))
    expect(n(3)).toBeLessThan(n(4))
  })

  it('filtros: só os tipos e formas escolhidos', () => {
    const items = buildItems({ types: ['cifra-desenho'], qualities: ['m7'], kinds: ['pestana'] })
    expect(items.every((i) => i.quality === 'm7' && i.card!.kind === 'pestana')).toBe(true)
    expect(items).toHaveLength(2)
  })

  it('acordes de uma música: fundamental fixa e fora do banco à parte', () => {
    const { targets, skipped } = songTargets(['Bm', 'G', 'D/F#', 'Em', 'E13'])
    expect(skipped).toEqual(['E13'])
    expect(targets).toContainEqual({ quality: 'maj', root: 2 })
    const items = buildItems({ types: ['cifra-desenho', 'nota-do-grau'], qualities: all, kinds: [...KINDS], songChords: ['Bm', 'G'] })
    for (const it of items) expect([11, 7]).toContain(makeQuestion(it).root)
  })
})

describe('perguntas', () => {
  const items = buildItems({ types: ALL_TYPES, qualities: all, kinds: [...KINDS] })

  it('toda pergunta de múltipla escolha tem 4 opções distintas e a certa está marcada', () => {
    for (let i = 0; i < 1500; i++) {
      const it = items[(i * 37) % items.length]
      const q = makeQuestion(it)
      if (q.type === 'grau-no-desenho' || q.type === 'cronometrado') continue
      expect(q.options, it.key).toHaveLength(4)
      const keys = q.options.map((o) => (o.voicing ? o.voicing.frets.join() : o.label))
      expect(new Set(keys).size, it.key).toBe(4)
      const ans = q.options[q.answer]
      if (q.type === 'cifra-desenho') expect(ans.voicing!.frets).toEqual(q.listen[0] && placeFrets(q))
      if (q.type === 'desenho-cifra') expect(ans.label).toBe(q.symbol)
      expect(q.explain.length).toBeGreaterThan(5)
      expect(q.listen.length).toBeGreaterThan(0)
    }
  })

  it('cifra → desenho: as erradas são outros acordes (não outro desenho do mesmo)', () => {
    for (const it of items.filter((x) => x.type === 'cifra-desenho').slice(0, 300)) {
      const q = makeQuestion(it)
      const want = new Set(qualityById(it.quality).pcs.map((p) => (p + q.root) % 12))
      q.options.forEach((o, i) => {
        const pcs = new Set(pcsOf(o.voicing!.frets))
        const same = [...pcs].every((p) => want.has(p)) && [...want].filter((p) => !(qualityById(it.quality).pcs.length >= 4 && (p - q.root + 12) % 12 === 7)).every((p) => pcs.has(p))
        if (i === q.answer) expect(same, it.key).toBe(true)
        else expect(same, `${it.key} opção ${o.label}`).toBe(false)
      })
    }
  })

  it('graus no desenho: as cordas marcadas têm mesmo o grau pedido', () => {
    for (const it of items.filter((x) => x.type === 'grau-no-desenho')) {
      const q = makeQuestion(it)
      expect(q.answerStrings!.length, it.key).toBeGreaterThan(0)
      const ivs = q.answerStrings!.map((s) => (LOW[s] + q.voicing!.frets[s]! - q.root + 1200) % 12)
      expect(new Set(ivs).size).toBe(1)
    }
  })

  it('nota do grau: a resposta é a nota certa do acorde', () => {
    for (const it of items.filter((x) => x.type === 'nota-do-grau')) {
      const q = makeQuestion(it)
      // a mesma altura (grafia pode ser a "prática": G no lugar de F##)
      const c = parseChord(q.symbol)!
      expect(parseChord(q.options[q.answer].label)!.root, it.key).toBe((c.root + it.interval!) % 12)
      expect(q.options[q.answer].label, it.key).not.toMatch(/bb|##/)
    }
  })

  it('o que muda: a resposta descreve a mudança certa e há dois acordes para ouvir', () => {
    const q = makeQuestion(items.find((x) => x.key === 'comparar:maj>m')!)
    expect(q.options[q.answer].label).toContain('3ª desce')
    expect(q.listen).toHaveLength(2)
  })
})

describe('texto das perguntas', () => {
  it('grafia de músico: G#m em vez de Abm (sem Cb), A#m7(b5) em vez de Bbm7(b5) com Fb', () => {
    expect(spell(8, 'm')).toBe('G#m')
    expect(spell(10, 'm7b5')).toBe('A#m7(b5)')
    expect(spell(10, 'm')).toBe('Bbm') // Bb Db F: normal, fica
    expect(spell(8, 'maj')).toBe('Ab')
  })
  it('graus como se fala', () => {
    expect(degLabel(4, 'maj')).toBe('3ª')
    expect(degLabel(3, 'm')).toBe('b3 (3ª menor)')
    expect(degLabel(2, 'add9')).toBe('9ª')
    expect(degLabel(10, '7')).toBe('b7 (7ª menor)')
  })
  it('cifra → desenho: as 4 opções são acordes diferentes', () => {
    const items = buildItems({ types: ['cifra-desenho'], qualities: all, kinds: [...KINDS] })
    for (const it of items.slice(0, 200)) {
      const q = makeQuestion(it)
      expect(new Set(q.options.map((o) => o.label)).size, it.key).toBe(4)
    }
  })
})

describe('sorteio', () => {
  it('não repete os itens recentes nem o mesmo tipo em seguida', () => {
    const items = buildItems({ types: ['cifra-desenho'], qualities: ['maj', 'm', '7'], kinds: ['aberta', 'pestana'] })
    const recent: string[] = []
    let last: string | undefined
    for (let i = 0; i < 200; i++) {
      const it = drawItem(items, {}, recent, last)
      expect(recent).not.toContain(it.key)
      expect(it.quality).not.toBe(last)
      recent.push(it.key)
      if (recent.length > 4) recent.shift()
      last = it.quality
    }
  })
})

describe('Leitner', () => {
  it('errar volta para a caixa 1; acertar rápido sobe', () => {
    expect(grade({ box: 4, seen: 3, right: 3 }, 'errei').box).toBe(1)
    expect(grade({ box: 2, seen: 1, right: 1 }, 'rapido').box).toBe(3)
    expect(grade(undefined, 'rapido').box).toBe(3)
  })

  it('itens da caixa 1 saem bem mais que os da caixa 5', () => {
    const stats = { a: { box: 1, seen: 1, right: 0 }, b: { box: 5, seen: 9, right: 9 } }
    let a = 0
    for (let i = 0; i < 5000; i++) if (drawWeighted([{ k: 'a' }, { k: 'b' }], (x) => x.k, stats).k === 'a') a++
    expect(a / 5000).toBeGreaterThan(0.85)
  })
})

// a resposta certa de "cifra → desenho" é o desenho do próprio item na fundamental sorteada
function placeFrets(q: ReturnType<typeof makeQuestion>) {
  return q.options[q.answer].voicing!.frets
}

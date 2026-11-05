import type { Block, ImpCfg, TecCfg } from '../../core/plano'
import { go } from '../../ui/nav'
import { useEscalas } from '../escalas/store'
import { useImproviso } from '../improviso/store'
import { useOuvido } from '../ouvido/store'
import { useHoje } from './store'

export function applyTec(c: TecCfg) {
  useEscalas.getState().set({
    scaleId: c.scaleId,
    key: c.key,
    boxes: c.boxes,
    exercise: c.exercise,
    perBeat: c.perBeat,
    bpm: c.bpm,
    autoBpm: !!c.autoBpm,
    ...(c.display ? { display: c.display } : {}),
  })
}

export function applyImp(c: ImpCfg) {
  const s = useImproviso.getState()
  if (s.status === 'playing') return // não troca a base no meio de uma volta
  s.set({
    progId: c.progId,
    key: c.key,
    keyMinor: !!c.keyMinor,
    styleId: c.styleId,
    bpm: c.bpm,
    scaleId: c.scaleId,
    restrictionId: c.restrictionId ?? 'nenhuma',
    focusBox: c.focusBox ?? 0,
    ...(c.guide !== undefined ? { guide: c.guide } : {}),
    ...(c.customText ? { customText: c.customText } : {}),
  })
}

/** "Abrir": aplica a configuração do bloco na área, marca o bloco ativo e leva até lá */
export function openBlock(date: string, b: Block) {
  if (!b.area) return
  if (b.tec) applyTec(b.tec)
  if (b.imp) applyImp(b.imp)
  if (b.ear?.length) useOuvido.getState().set({ preset: b.ear[0] })
  useHoje.getState().setActive({ date, blockId: b.id, area: b.area, title: b.title, hint: b.lines[0] ?? '' })
  go(b.area)
}

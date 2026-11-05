import { useEffect, useState } from 'react'
import { useHoje, type Timer } from './store'

/**
 * Timer dos blocos: um por vez, sobrevive à troca de área e ao recarregar a página
 * (fica no store persistido). Os minutos entram no bloco ao pausar e ao terminar.
 */

const remaining = (t: Timer, now = Date.now()) => (t.endAt ? Math.max(0, (t.endAt - now) / 1000) : t.left)

export function startTimer(date: string, blockId: string, minutes: number) {
  const s = useHoje.getState()
  const t = s.timer
  if (t && t.endAt) pauseTimer() // o outro bloco para e guarda os minutos dele
  const cur = useHoje.getState().timer
  const same = cur && cur.date === date && cur.blockId === blockId && cur.left > 0
  const left = same ? cur.left : minutes * 60
  s.setTimer({ date, blockId, total: same ? cur.total : minutes * 60, left, endAt: Date.now() + left * 1000 })
}

export function pauseTimer() {
  const s = useHoje.getState()
  const t = s.timer
  if (!t || !t.endAt) return
  const rest = remaining(t)
  s.addMinutes(t.date, t.blockId, (t.left - rest) / 60)
  s.setTimer({ ...t, endAt: null, left: rest })
}

export function resetTimer() {
  const s = useHoje.getState()
  if (s.timer?.endAt) pauseTimer()
  s.setTimer(null)
}

/** três bipes curtos, com um AudioContext próprio (não depende do motor da base) */
function beep() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.28, 0.56].forEach((at, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = i === 2 ? 1175 : 880
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at)
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.22)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + at)
      o.stop(ctx.currentTime + at + 0.25)
    })
    setTimeout(() => void ctx.close(), 1200)
  } catch {
    /* sem áudio: só não bipa */
  }
}

/** montado uma vez no App: confere o fim do timer e segura a tela acesa enquanto ele roda */
export function useTimerWatch() {
  const running = useHoje((s) => !!s.timer?.endAt)
  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const s = useHoje.getState()
      const t = s.timer
      if (!t?.endAt || remaining(t) > 0) return
      s.addMinutes(t.date, t.blockId, t.left / 60)
      const done = s.days[t.date]?.blocks[t.blockId]?.done
      if (!done) s.toggleBlock(t.date, t.blockId)
      s.setTimer({ ...t, endAt: null, left: 0 })
      beep()
      if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200])
    }, 500)
    // tela acesa (celular no estante): wake lock enquanto o timer roda
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {})
    return () => {
      window.clearInterval(id)
      void lock?.release().catch(() => {})
    }
  }, [running])
}

/** segundos restantes do timer deste bloco (re-renderiza a cada meio segundo enquanto roda) */
export function useTimerLeft(date: string, blockId: string): { left: number; running: boolean; total: number } | null {
  const t = useHoje((s) => (s.timer && s.timer.date === date && s.timer.blockId === blockId ? s.timer : null))
  const [, tick] = useState(0)
  useEffect(() => {
    if (!t?.endAt) return
    const id = window.setInterval(() => tick((n) => n + 1), 500)
    return () => window.clearInterval(id)
  }, [t?.endAt])
  if (!t) return null
  return { left: remaining(t), running: !!t.endAt, total: t.total }
}

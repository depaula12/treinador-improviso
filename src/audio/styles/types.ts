import type { ChordInfo } from '../../core/theory'

export type DrumPiece =
  | 'kick'
  | 'snare'
  | 'hhClosed'
  | 'hhOpen'
  | 'ride'
  | 'crash'
  | 'tomHi'
  | 'tomMid'
  | 'tomFloor'

/** Posições em tempos (semínimas) a partir do início do compasso. 2/3 = colcheia tercinada. */
export interface DrumHit {
  piece: DrumPiece
  beat: number
  vel: number
}

export interface PitchedNote {
  beat: number
  /** duração em tempos */
  dur: number
  vel: number
  midi: number[]
  /** strum de violão: ordem das cordas */
  strum?: 'down' | 'up'
}

export interface BarContext {
  /** índice absoluto do compasso desde o play (0 = primeiro após a contagem) */
  index: number
  chord: ChordInfo
  prev: ChordInfo
  next: ChordInfo
  /** variação do groove na frase atual */
  variation: 'A' | 'B'
  isFill: boolean
  /** primeiro compasso de uma frase (crash) */
  isPhraseStart: boolean
  /** voicing de piano já com voice leading (MIDI) */
  pianoVoicing: number[]
  /** acorde de violão em forma de pestana (6 cordas, MIDI do grave ao agudo) */
  guitarVoicing: number[]
}

export interface Style {
  id: string
  name: string
  drums(ctx: BarContext): DrumHit[]
  bass(ctx: BarContext): PitchedNote[]
  piano(ctx: BarContext): PitchedNote[]
  guitar(ctx: BarContext): PitchedNote[]
}

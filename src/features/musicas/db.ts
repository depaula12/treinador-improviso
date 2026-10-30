import Dexie, { type EntityTable } from 'dexie'
import type { Song } from '../../core/song'

// Banco local (IndexedDB) do app. Por enquanto só as músicas; o progresso entra na v0.3.
class TreinadorDB extends Dexie {
  songs!: EntityTable<Song, 'id'>
  constructor() {
    super('treinador')
    this.version(1).stores({ songs: 'id, title, updatedAt' })
  }
}

export const db = new TreinadorDB()

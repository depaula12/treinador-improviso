import * as Tone from 'tone'

// Nome do arquivo -> nota do Tone ("Ds4" -> "D#4", "Bb1" fica igual)
function mapUrls(files: string[]): Record<string, string> {
  const urls: Record<string, string> = {}
  for (const f of files) urls[f.replace('s', '#')] = `${f}.mp3`
  return urls
}

const PIANO = ['A1', 'C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6']
const BASS = ['E1', 'G1', 'Bb1', 'Db2', 'E2', 'G2', 'Bb2', 'Db3', 'E3', 'G3']
const GUITAR = ['E2', 'G2', 'Bb2', 'Db3', 'E3', 'G3', 'Bb3', 'Db4', 'E4', 'G4', 'Bb4', 'Db5', 'E5']

export function createSamplers(base: string) {
  return {
    piano: new Tone.Sampler({ urls: mapUrls(PIANO), baseUrl: `${base}/piano/`, release: 0.8 }),
    bass: new Tone.Sampler({ urls: mapUrls(BASS), baseUrl: `${base}/bass/`, release: 0.12 }),
    guitar: new Tone.Sampler({ urls: mapUrls(GUITAR), baseUrl: `${base}/guitar/`, release: 0.25 }),
  }
}

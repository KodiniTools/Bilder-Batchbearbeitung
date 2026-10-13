import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  imageFileType,
  pickSaveDirectory,
  pickSaveFile,
  saveToDirectory,
  saveToTarget,
  SAVE_FILE_TYPES,
  type SaveDirectoryHandle,
  type SaveFileHandle,
} from '@/lib/features/save-file'

type PickerWindow = Window & {
  showSaveFilePicker?: unknown
  showDirectoryPicker?: unknown
}

const blob = () => new Blob(['inhalt'], { type: 'text/plain' })

function fakeFileHandle(name: string) {
  const written: Blob[] = []
  const handle: SaveFileHandle = {
    name,
    createWritable: async () => ({
      write: async (data: Blob) => {
        written.push(data)
      },
      close: async () => {},
    }),
  }
  return { handle, written }
}

function fakeDirectory(existing: string[] = []) {
  const files = new Map<string, Blob[]>()
  existing.forEach((n) => files.set(n, []))
  const dir: SaveDirectoryHandle = {
    getFileHandle: async (name, options) => {
      if (!files.has(name)) {
        if (!options?.create) throw new DOMException('fehlt', 'NotFoundError')
        files.set(name, [])
      }
      return {
        name,
        createWritable: async () => ({
          write: async (data: Blob) => {
            files.get(name)?.push(data)
          },
          close: async () => {},
        }),
      }
    },
  }
  return { dir, files }
}

afterEach(() => {
  delete (window as PickerWindow).showSaveFilePicker
  delete (window as PickerWindow).showDirectoryPicker
  document.body.innerHTML = ''
})

describe('pickSaveFile', () => {
  it('öffnet den Speichern-Dialog mit Dateiname und Typ', async () => {
    const { handle } = fakeFileHandle('mein-export.pdf')
    const picker = vi.fn(async () => handle)
    ;(window as PickerWindow).showSaveFilePicker = picker
    const target = await pickSaveFile('bilder-export.pdf', SAVE_FILE_TYPES.pdf)
    expect(target).toEqual({ kind: 'handle', handle, name: 'mein-export.pdf' })
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: 'bilder-export.pdf',
        types: [{ description: 'PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
    )
  })

  it('gibt bei Abbruch null zurück', async () => {
    ;(window as PickerWindow).showSaveFilePicker = vi.fn(async () => {
      throw new DOMException('abgebrochen', 'AbortError')
    })
    expect(await pickSaveFile('a.zip')).toBeNull()
  })

  it('fällt ohne API oder bei Sperre auf den Download zurück', async () => {
    expect(await pickSaveFile('a.zip')).toEqual({ kind: 'download', name: 'a.zip' })
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    ;(window as PickerWindow).showSaveFilePicker = vi.fn(async () => {
      throw new DOMException('iframe', 'SecurityError')
    })
    expect(await pickSaveFile('a.zip')).toEqual({ kind: 'download', name: 'a.zip' })
  })
})

describe('saveToTarget', () => {
  it('schreibt in die gewählte Datei', async () => {
    const { handle, written } = fakeFileHandle('x.png')
    const data = blob()
    await saveToTarget({ kind: 'handle', handle, name: 'x.png' }, data)
    expect(written).toEqual([data])
  })

  it('lädt im Fallback unter dem vorgeschlagenen Namen herunter', async () => {
    let downloadName = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloadName = this.download
    })
    await saveToTarget({ kind: 'download', name: 'bilder.zip' }, blob())
    expect(downloadName).toBe('bilder.zip')
  })
})

describe('pickSaveDirectory / saveToDirectory', () => {
  it('gibt bei Abbruch null zurück und fällt ohne API auf Downloads zurück', async () => {
    expect(await pickSaveDirectory()).toEqual({ kind: 'download' })
    ;(window as PickerWindow).showDirectoryPicker = vi.fn(async () => {
      throw new DOMException('abgebrochen', 'AbortError')
    })
    expect(await pickSaveDirectory()).toBeNull()
  })

  it('überschreibt keine vorhandenen oder doppelten Dateien', async () => {
    const { dir, files } = fakeDirectory(['bild.png'])
    ;(window as PickerWindow).showDirectoryPicker = vi.fn(async () => dir)
    const target = await pickSaveDirectory()
    if (target?.kind !== 'directory') throw new Error('Ordner erwartet')
    expect(await saveToDirectory(target, blob(), 'bild.png')).toBe('bild (1).png')
    expect(await saveToDirectory(target, blob(), 'bild.png')).toBe('bild (2).png')
    expect(await saveToDirectory(target, blob(), 'anderes.jpg')).toBe('anderes.jpg')
    expect(files.get('bild.png')).toEqual([])
    expect(files.get('bild (1).png')).toHaveLength(1)
  })
})

describe('imageFileType', () => {
  it('ordnet Bildformaten MIME-Typ und Endungen zu', () => {
    expect(imageFileType('jpg')).toEqual({
      description: 'JPG',
      mime: 'image/jpeg',
      extensions: ['.jpg', '.jpeg'],
    })
    expect(imageFileType('webp').mime).toBe('image/webp')
  })
})

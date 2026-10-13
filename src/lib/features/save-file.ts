// Speichern exportierter Dateien mit Speichern-Dialog.
//
// - Chrome, Edge, Opera und die Desktop-App (Electron): Datei-Dialog der File System
//   Access API; der Nutzer wählt Speicherort und Dateinamen.
// - Firefox, Safari und andere Browser ohne die API: bisheriger Download; ob der
//   Browser dabei nach dem Speicherort fragt, legt der Nutzer in den Browser-Einstellungen fest.
//
// Die Dialoge brauchen eine Nutzeraktion: pickSaveFile()/pickSaveDirectory() deshalb
// im Klick-Handler vor dem ersten await aufrufen und die Datei erst danach erzeugen.

/** Dateityp für den Filter im Speichern-Dialog */
export interface SaveFileType {
  description: string
  mime: string
  /** Endungen mit Punkt, z. B. ['.jpg', '.jpeg'] */
  extensions: string[]
}

interface WritableFileStream {
  write(data: Blob): Promise<void>
  close(): Promise<void>
  abort?(): Promise<void>
}

export interface SaveFileHandle {
  readonly name: string
  createWritable(): Promise<WritableFileStream>
}

export interface SaveDirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<SaveFileHandle>
}

interface SaveFilePickerOptions {
  suggestedName?: string
  id?: string
  startIn?: string
  types?: { description: string; accept: Record<string, string[]> }[]
}

interface FileSystemAccessWindow {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<SaveFileHandle>
  showDirectoryPicker?: (options?: {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: string
  }) => Promise<SaveDirectoryHandle>
}

/** Ziel einer einzelnen Datei: vom Nutzer gewählte Datei oder Download-Fallback */
export type SaveTarget =
  | { kind: 'handle'; handle: SaveFileHandle; name: string }
  | { kind: 'download'; name: string }

/** Ziel mehrerer Dateien: vom Nutzer gewählter Ordner oder einzelne Downloads */
export type SaveDirectoryTarget =
  | { kind: 'directory'; dir: SaveDirectoryHandle; used: Set<string> }
  | { kind: 'download' }

/** Merkt sich den zuletzt gewählten Ordner (Chrome/Edge) */
const PICKER_ID = 'bilder-export'

export const SAVE_FILE_TYPES = {
  pdf: { description: 'PDF', mime: 'application/pdf', extensions: ['.pdf'] },
  zip: { description: 'ZIP', mime: 'application/zip', extensions: ['.zip'] },
  svg: { description: 'SVG', mime: 'image/svg+xml', extensions: ['.svg'] },
  json: { description: 'JSON', mime: 'application/json', extensions: ['.json'] },
} satisfies Record<string, SaveFileType>

/** Dateityp eines Bildformats (png, jpg, webp, …) */
export function imageFileType(format: string): SaveFileType {
  const ext = format.toLowerCase()
  const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`
  const extensions = ext === 'jpg' || ext === 'jpeg' ? ['.jpg', '.jpeg'] : [`.${ext}`]
  return { description: ext.toUpperCase(), mime, extensions }
}

function fsWindow(): FileSystemAccessWindow {
  return window as unknown as FileSystemAccessWindow
}

export function supportsSaveFilePicker(): boolean {
  return typeof fsWindow().showSaveFilePicker === 'function'
}

export function supportsDirectoryPicker(): boolean {
  return typeof fsWindow().showDirectoryPicker === 'function'
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Öffnet den Speichern-Dialog mit vorgeschlagenem Dateinamen.
 * Ohne Unterstützung der API (oder wenn der Browser sie verweigert, z. B. im iframe)
 * fällt die Funktion auf den Download zurück.
 *
 * @returns Ziel zum Schreiben, oder null, wenn der Nutzer den Dialog abbricht
 */
export async function pickSaveFile(
  suggestedName: string,
  type?: SaveFileType
): Promise<SaveTarget | null> {
  const picker = fsWindow().showSaveFilePicker
  if (!picker) return { kind: 'download', name: suggestedName }
  try {
    const handle = await picker.call(window, {
      suggestedName,
      id: PICKER_ID,
      startIn: 'downloads',
      types: type
        ? [{ description: type.description, accept: { [type.mime]: type.extensions } }]
        : undefined,
    })
    return { kind: 'handle', handle, name: handle.name }
  } catch (error) {
    if (isAbortError(error)) return null
    console.warn('Speichern-Dialog nicht verfügbar, nutze Download:', error)
    return { kind: 'download', name: suggestedName }
  }
}

/**
 * Öffnet einen Ordner-Dialog für den Export mehrerer Dateien.
 *
 * @returns Ziel zum Schreiben, oder null, wenn der Nutzer den Dialog abbricht
 */
export async function pickSaveDirectory(): Promise<SaveDirectoryTarget | null> {
  const picker = fsWindow().showDirectoryPicker
  if (!picker) return { kind: 'download' }
  try {
    const dir = await picker.call(window, {
      id: PICKER_ID,
      mode: 'readwrite',
      startIn: 'downloads',
    })
    return { kind: 'directory', dir, used: new Set() }
  } catch (error) {
    if (isAbortError(error)) return null
    console.warn('Ordner-Dialog nicht verfügbar, nutze Download:', error)
    return { kind: 'download' }
  }
}

/** Startet einen Download über einen temporären Link. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Erst nach dem Start des Downloads freigeben
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function writeHandle(handle: SaveFileHandle, blob: Blob): Promise<void> {
  const writable = await handle.createWritable()
  try {
    await writable.write(blob)
    await writable.close()
  } catch (error) {
    await writable.abort?.().catch(() => undefined)
    throw error
  }
}

/** Schreibt die Datei an das gewählte Ziel. */
export async function saveToTarget(target: SaveTarget, blob: Blob): Promise<void> {
  if (target.kind === 'handle') await writeHandle(target.handle, blob)
  else downloadBlob(blob, target.name)
}

function splitName(fileName: string): [string, string] {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? [fileName.slice(0, dot), fileName.slice(dot)] : [fileName, '']
}

async function fileExists(dir: SaveDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name)
    return true
  } catch {
    return false
  }
}

/**
 * Freier Dateiname im Ordner: vorhandene Dateien und Namen dieses Exports werden
 * nicht überschrieben, sondern wie beim Download nummeriert („bild (1).png“).
 */
async function uniqueName(dir: SaveDirectoryHandle, used: Set<string>, fileName: string) {
  const [base, ext] = splitName(fileName)
  let name = fileName
  for (let i = 1; used.has(name.toLowerCase()) || (await fileExists(dir, name)); i++) {
    name = `${base} (${i})${ext}`
  }
  used.add(name.toLowerCase())
  return name
}

/**
 * Speichert eine von mehreren Dateien im gewählten Ordner (bzw. als Download).
 * @returns tatsächlich verwendeter Dateiname
 */
export async function saveToDirectory(
  target: SaveDirectoryTarget,
  blob: Blob,
  fileName: string
): Promise<string> {
  if (target.kind === 'download') {
    downloadBlob(blob, fileName)
    return fileName
  }
  const name = await uniqueName(target.dir, target.used, fileName)
  const handle = await target.dir.getFileHandle(name, { create: true })
  await writeHandle(handle, blob)
  return name
}

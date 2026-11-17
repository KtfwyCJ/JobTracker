import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const execFileAsync = promisify(execFile)

export const MAX_PAGE_FILL = 1.5

const PDFLATEX = process.env.PDFLATEX_PATH ?? '/Library/TeX/texbin/pdflatex'
const SP_PER_PT = 65536
const MARGIN_PT = 0.6 * 72.27 // 0.6in in TeX points

/**
 * Parse the last `\resumeend{page}{y[sp]}{height pt}` line; y is sp from page bottom.
 * Returns the UNROUNDED fill so the `<= MAX_PAGE_FILL` gate is exact; round only for display.
 */
export function parsePageFill(aux: string): number | null {
  const re = /\\resumeend\{(\d+)\}\{(-?\d+)(?:sp)?\}\{([\d.]+)pt\}/g
  let last: RegExpExecArray | null = null
  for (let m = re.exec(aux); m; m = re.exec(aux)) last = m
  if (!last) return null
  const page = Number(last[1])
  const y = Number(last[2]) / SP_PER_PT
  const h = Number(last[3])
  return page - 1 + (h - MARGIN_PT - y) / (h - 2 * MARGIN_PT)
}

/** Overfull boxes wider than this (pt) are reported; smaller ones are invisible in print. */
export const OVERFULL_TOLERANCE_PT = 2

/** Collect `Overfull \hbox (Xpt too wide) …` lines from a pdflatex log where X > OVERFULL_TOLERANCE_PT. */
export function parseOverfullWarnings(log: string): string[] {
  const re = /Overfull \\hbox \((\d+(?:\.\d+)?)pt too wide\)([^\n]*)/g
  const out: string[] = []
  for (let m = re.exec(log); m; m = re.exec(log)) {
    const pt = Number(m[1])
    if (pt > OVERFULL_TOLERANCE_PT) out.push(`Overfull hbox ${m[1]}pt${m[2].trimEnd()}`)
  }
  return out
}

export interface CompileResult { pdfPath: string; pageFill: number | null; warnings: string[] }

export async function compileTex(
  tex: string,
  workDir: string,
): Promise<CompileResult> {
  await mkdir(workDir, { recursive: true })
  await writeFile(join(workDir, 'cv.tex'), tex)
  try {
    await execFileAsync(
      PDFLATEX,
      ['-no-shell-escape', '-interaction=nonstopmode', '-halt-on-error', '-output-directory', workDir, 'cv.tex'],
      { cwd: workDir, timeout: 30000 },
    )
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error('pdflatex not found — install MacTeX or set PDFLATEX_PATH')
    }
    let tail = ''
    try {
      tail = (await readFile(join(workDir, 'cv.log'), 'utf8')).split('\n').slice(-20).join('\n')
    } catch {
      tail = (err as Error).message
    }
    throw new Error(`pdflatex failed:\n${tail}`)
  }
  const aux = await readFile(join(workDir, 'cv.aux'), 'utf8').catch(() => '')
  const log = await readFile(join(workDir, 'cv.log'), 'utf8').catch(() => '')
  return { pdfPath: join(workDir, 'cv.pdf'), pageFill: parsePageFill(aux), warnings: parseOverfullWarnings(log) }
}

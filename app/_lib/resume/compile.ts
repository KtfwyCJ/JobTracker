import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const execFileAsync = promisify(execFile)

export const MAX_PAGE_FILL = 1.5

const PDFLATEX = process.env.PDFLATEX_PATH ?? '/Library/TeX/texbin/pdflatex'
const SP_PER_PT = 65536
const MARGIN_PT = 0.6 * 72.27 // 0.6in in TeX points

/** Parse the last `\resumeend{page}{y[sp]}{height pt}` line; y is sp from page bottom. */
export function parsePageFill(aux: string): number | null {
  const re = /\\resumeend\{(\d+)\}\{(-?\d+)(?:sp)?\}\{([\d.]+)pt\}/g
  let last: RegExpExecArray | null = null
  for (let m = re.exec(aux); m; m = re.exec(aux)) last = m
  if (!last) return null
  const page = Number(last[1])
  const y = Number(last[2]) / SP_PER_PT
  const h = Number(last[3])
  const fill = page - 1 + (h - MARGIN_PT - y) / (h - 2 * MARGIN_PT)
  return Math.round(fill * 100) / 100
}

export async function compileTex(
  tex: string,
  workDir: string,
): Promise<{ pdfPath: string; pageFill: number | null }> {
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
  return { pdfPath: join(workDir, 'cv.pdf'), pageFill: parsePageFill(aux) }
}

import { describe, it, expect } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseEvidence } from '../evidence'
import { buildBasePlan } from '../base'
import { renderTex } from '../render'
import { compileTex, parsePageFill, MAX_PAGE_FILL } from '../compile'

const PDFLATEX = process.env.PDFLATEX_PATH ?? '/Library/TeX/texbin/pdflatex'
const M = 0.6 * 72.27
const expected = (p: number, y: number, h: number) =>
  Math.round(((p - 1) + (h - M - y) / (h - 2 * M)) * 100) / 100

describe('parsePageFill', () => {
  it('parses the real pdflatex format (bare sp integer)', () => {
    const v = parsePageFill('\\resumeend{1}{17990582}{845.04684pt}')
    expect(v).toBeCloseTo(expected(1, 17990582 / 65536, 845.04684), 2)
  })
  it('parses a y value with sp suffix', () => {
    const v = parsePageFill('\\resumeend{2}{30000000sp}{841.89pt}')
    expect(v).toBeCloseTo(expected(2, 30000000 / 65536, 841.89), 2)
  })
  it('uses the last marker when several exist', () => {
    const aux = '\\resumeend{1}{17990582}{845.04684pt}\n\\resumeend{2}{30000000sp}{841.89pt}\n'
    expect(parsePageFill(aux)).toBeCloseTo(expected(2, 30000000 / 65536, 841.89), 2)
  })
  it('returns null without a marker', () => {
    expect(parsePageFill('\\relax')).toBeNull()
  })
  it('exposes the limit', () => {
    expect(MAX_PAGE_FILL).toBe(1.5)
  })
})

describe.skipIf(!existsSync(PDFLATEX))('compileTex (pdflatex)', () => {
  const ev = parseEvidence(readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8'))
  it('compiles the fixture and measures fill', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'resume-'))
    try {
      const { pdfPath, pageFill } = await compileTex(renderTex(ev, buildBasePlan(ev, 'ai-engineer')), dir)
      expect(existsSync(pdfPath)).toBe(true)
      expect(pageFill).not.toBeNull()
      expect(pageFill!).toBeGreaterThan(0)
      expect(pageFill!).toBeLessThan(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 40000)
  it('rejects broken tex with the log tail', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'resume-'))
    try {
      await expect(
        compileTex('\\documentclass{article}\\begin{document}\\foo\\end{document}', dir),
      ).rejects.toThrow(/Undefined control sequence/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 40000)
})

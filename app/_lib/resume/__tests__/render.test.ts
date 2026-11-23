import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEvidence } from '../evidence'
import { buildBasePlan } from '../base'
import { escapeLatex, escapeHrefUrl, renderTex, renderPlainText, texToPlainText, TABLE_COLSPEC } from '../render'
import { findTermSpan, termMatches } from '../coverage'
import type { Plan } from '../types'

const ev = parseEvidence(readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8'))
const plan: Plan = {
  profile: 'senior-fullstack',
  experiences: [
    { experienceId: 'acme', bulletIds: ['acme-2', 'acme-1'] },
    { experienceId: 'beta', bulletIds: ['beta-2'] },
  ],
  bold: [{ bulletId: 'acme-1', terms: ['Node.js'] }, { bulletId: 'acme-2', terms: ['50%'] }],
  skillGroups: [{ groupId: 'fe', items: ['Vue.js', 'React'] }, { groupId: 'lang', items: ['Python', 'C++'] }],
}

describe('findTermSpan', () => {
  it('finds boundary-respecting spans', () => {
    expect(findTermSpan('Java and JavaScript', 'Java', true)).toEqual({ start: 0, end: 4 })
    expect(findTermSpan('JavaScript', 'Java', true)).toBeNull()
    expect(findTermSpan('java', 'Java', false)).toEqual({ start: 0, end: 4 })
  })
})

describe('escapeLatex', () => {
  it('escapes specials', () => {
    expect(escapeLatex('50% R&D C# a_b')).toBe('50\\% R\\&D C\\# a\\_b')
    expect(escapeLatex('\\ $ { } ~ ^')).toBe('\\textbackslash{} \\$ \\{ \\} \\textasciitilde{} \\textasciicircum{}')
  })
})

describe('renderTex', () => {
  const tex = renderTex(ev, plan)
  it('fills all slots and bolds first occurrence once', () => {
    expect(tex).not.toContain('%%')
    expect(tex.split('\\textbf{Node.js}').length - 1).toBe(1)
    expect(tex).toContain('\\textbf{50\\%}')
    expect(tex).toContain('\\makeatletter\n\\pdfsavepos\\write\\@auxout{\\string\\resumeend{\\thepage}{\\the\\pdflastypos}{\\the\\paperheight}}\n\\makeatother\n\\end{document}')
    expect(tex).toContain('\\providecommand{\\resumeend}[3]{}')
  })
  it('keeps plan bullet order and omits unselected', () => {
    expect(tex.indexOf('Cut page load')).toBeLessThan(tex.indexOf('Built a '))
    expect(tex).toContain('Wrote Python tooling')
    expect(tex).not.toContain('Mentored three')
    expect(tex).not.toContain('retrieval pipeline')
  })
  it('renders skills in plan order and omits empty sections', () => {
    expect(tex.indexOf('Frontend')).toBeLessThan(tex.indexOf('Languages}'))
    expect(tex.indexOf('Vue.js')).toBeLessThan(tex.indexOf('React'))
    const noRes = renderTex({ ...ev, research: [] }, plan)
    expect(noRes).not.toContain('Research')
    expect(tex).toContain('Research')
  })
  it('contact line has mailto', () => {
    expect(tex).toContain('\\href{mailto:ada@example.com}{ada@example.com}')
  })
})

describe('renderPlainText', () => {
  it('keeps raw characters', () => {
    const t = renderPlainText(ev, buildBasePlan(ev, 'senior-frontend'))
    expect(t).toContain('50%')
    expect(t).not.toContain('\\%')
  })
})

describe('renderTex extras', () => {
  const nasty = parseEvidence(readFileSync(join(__dirname, '../__fixtures__/evidence.yaml'), 'utf8'))
  it('escapes non-bullet fields', () => {
    nasty.experiences[0].company = 'R&D_Co 50%'
    nasty.experiences[0].role = 'C# Dev'
    nasty.profiles[1].summary = 'Fast & **big_win** 5%'
    nasty.skillGroups[0].items = ['C#', 'a_b']
    nasty.interests[0].text = 'R&D $'
    nasty.research[0].title = 'T#1'
    const p: Plan = { ...plan, skillGroups: [{ groupId: 'lang', items: ['C#', 'a_b'] }] }
    const t = renderTex(nasty, p)
    for (const s of ['R\\&D\\_Co 50\\%', 'C\\# Dev', 'Fast \\& \\textbf{big\\_win} 5\\%', 'C\\#, a\\_b', 'R\\&D \\$', 'T\\#1'])
      expect(t).toContain(s)
  })
  it('prefixes https only for non-URL contact values', () => {
    const e = { ...ev, contact: { ...ev.contact, github: 'github.com/httpie', linkedin: 'https://linkedin.com/in/x', website: 'x.dev' } }
    const t = renderTex(e, plan)
    expect(t).toContain('\\href{https://github.com/httpie}{github.com/httpie}')
    expect(t).toContain('\\href{https://linkedin.com/in/x}{https://linkedin.com/in/x}')
    expect(t).toContain('\\href{https://x.dev}{x.dev}')
  })
  it('omits empty sections without dangling vspace', () => {
    const t = renderTex({ ...ev, education: [], skillGroups: [], languages: [], interests: [] }, { ...plan, skillGroups: [] })
    for (const n of ['Education', 'Skills}', 'Languages}', 'Interests']) expect(t).not.toContain('\\cvsection{' + n.replace('}', ''))
    expect((t.match(/\\vspace\{6pt\}/g) ?? []).length).toBe(1)
  })
  it('keeps CV.tex 6pt spacing before sections', () => {
    const t = renderTex(ev, plan)
    for (const n of ['Work Experience', 'Education', 'Skills', 'Languages', 'Interests'])
      expect(t).toContain('\\vspace{6pt}\n\n\\cvsection{' + n + '}')
    expect(t).not.toContain('\\vspace{6pt}\n\n\\cvsection{Research')
  })
})

describe('renderTex wrapping tables and markup', () => {
  it('skills, languages and interests use a wrapping tabularx value column', () => {
    expect(TABLE_COLSPEC).toBe('@{}l@{\\quad}>{\\raggedright\\arraybackslash}X@{}')
    const t = renderTex(ev, plan)
    expect(t).toContain('\\usepackage{tabularx}')
    const tables = t.match(/\\begin\{tabularx\}\{\\linewidth\}\{([^\n]*)\}\n/g) ?? []
    expect(tables.length).toBe(3)
    for (const x of tables) expect(x).toBe(`\\begin{tabularx}{\\linewidth}{${TABLE_COLSPEC}}\n`)
    expect(t).not.toContain('\\begin{tabular}{@{}l@{\\quad}l@{}}')
    expect(t).toMatch(/\\textbf\{Frontend\}: & Vue\.js, React \\\\/)
  })
  it('supports **bold** in research and interest text, stripped in plain text', () => {
    const e = { ...ev,
      research: ev.research.map(r => ({ ...r, text: 'Compared **prompting, fine-tuning** 5%' })),
      interests: ev.interests.map(i => ({ ...i, text: 'Love **mountains** & lakes' })) }
    const t = renderTex(e, plan)
    expect(t).toContain('Compared \\textbf{prompting, fine-tuning} 5\\%')
    expect(t).toContain('Love \\textbf{mountains} \\& lakes')
    const p = renderPlainText(e, plan)
    expect(p).toContain('Compared prompting, fine-tuning 5%')
    expect(p).not.toContain('**')
  })
  it('escapes href URLs', () => {
    expect(escapeHrefUrl('https://x.dev/a%20b#f?q=1&r=a_b~c')).toBe('https://x.dev/a\\%20b\\#f?q=1&r=a_b~c')
    expect(escapeHrefUrl('https://x.dev/{a}\\b')).toBe('https://x.dev/\\%7Ba\\%7D\\%5Cb')
    const e = { ...ev, contact: { ...ev.contact, website: 'x.dev/p#me' } }
    expect(renderTex(e, plan)).toContain('\\href{https://x.dev/p\\#me}{x.dev/p\\#me}')
  })
})

describe('texToPlainText', () => {
  const doc = (body: string) => `\\documentclass{article}\n\\usepackage{xcolor}\n\\begin{document}\n${body}\n\\end{document}`
  it('keeps only the document body', () => {
    const t = texToPlainText(doc('Hello'))
    expect(t).toContain('Hello'); expect(t).not.toContain('documentclass'); expect(t).not.toContain('xcolor')
  })
  it('unescapes and keeps command arguments', () => {
    expect(texToPlainText(doc('Used \\textbf{Node.js} \\& React, 50\\% faster'))).toContain('Used Node.js & React, 50% faster')
  })
  it('drops comments but not \\%', () => {
    const t = texToPlainText(doc('keep 5\\% % drop me'))
    expect(t).toContain('keep 5%'); expect(t).not.toContain('drop me')
  })
  it('href keeps only the display text', () => {
    const t = texToPlainText(doc('\\href{https://ex.com/a}{ex.com}'))
    expect(t).toContain('ex.com'); expect(t).not.toContain('https://')
  })
  it('drops length commands and environment names', () => {
    const t = texToPlainText(doc('\\vspace{6pt}\\begin{itemize}\\item A\\end{itemize}\\hspace{3pt}'))
    expect(t).not.toMatch(/6pt|3pt|itemize/); expect(t).toContain('A')
  })
  it('command inside a word does not split it', () => expect(texToPlainText(doc('full-\\textbf{stack} and a\\textbackslash{}b'))).toContain('full-stack and a\\b'))
  it('no \\begin{document} → whole input', () => expect(texToPlainText('just \\textit{text}')).toContain('just text'))
  it('every keyword covered by renderPlainText is covered by texToPlainText(renderTex)', () => {
    const kws = ['Node.js', 'React', 'Vue.js', 'C++', 'Python', '50%']
    const a = renderPlainText(ev, plan), b = texToPlainText(renderTex(ev, plan))
    for (const k of kws) if (termMatches(a, k, ev.aliases)) expect(termMatches(b, k, ev.aliases), k).toBe(true)
  })
})

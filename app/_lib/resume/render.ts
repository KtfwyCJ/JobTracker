import fs from 'node:fs'
import path from 'node:path'
import { findTermSpan } from './coverage'
import type { Evidence, Plan } from './types'

const ESC: Record<string, string> = {
  '\\': '\\textbackslash{}', '&': '\\&', '%': '\\%', $: '\\$', '#': '\\#', _: '\\_',
  '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}',
}

export const escapeLatex = (s: string): string => s.replace(/[\\&%$#_{}~^]/g, c => ESC[c])

/** Escape raw text, wrapping the first occurrence of each bold term in \textbf. */
function boldText(text: string, terms: string[]): string {
  const spans = terms
    .map(t => ({ t, s: findTermSpan(text, t, true) }))
    .filter((x): x is { t: string; s: { start: number; end: number } } => x.s !== null)
    .sort((a, b) => a.s.start - b.s.start)
  let out = ''
  let pos = 0
  for (const { t, s } of spans) {
    if (s.start < pos) continue
    out += escapeLatex(text.slice(pos, s.start)) + '\\textbf{' + escapeLatex(t) + '}'
    pos = s.end
  }
  return out + escapeLatex(text.slice(pos))
}

const summaryTex = (s: string) => escapeLatex(s).replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}')

const href = (url: string, display: string) => `\\href{${url}}{${escapeLatex(display)}}`
const webUrl = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`)

function contactTex(c: Evidence['contact']): string {
  const parts: string[] = []
  if (c.phone) parts.push(escapeLatex(c.phone))
  if (c.email) parts.push(href(`mailto:${c.email}`, c.email))
  for (const v of [c.github, c.linkedin, c.website]) if (v) parts.push(href(webUrl(v), v))
  return parts.join(' \\enspace|\\enspace ')
}

function nameTex(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/)
  const head = `{\\fontsize{38}{46}\\fontseries{l}\\selectfont ${escapeLatex(first)} }`
  return rest.length ? `${head}%\n  {\\fontsize{38}{46}\\bfseries ${escapeLatex(rest.join(' '))}}` : head
}

const section = (title: string, body: string, gap = true) => `${gap ? '\\vspace{6pt}\n\n' : ''}\\cvsection{${title}}\n${body}`
const itemize = (items: string[]) =>
  items.length
    ? `\\begin{itemize}[leftmargin=*,topsep=2pt,itemsep=1pt,parsep=0pt]\n${items.map(i => `  \\item ${i}\n`).join('\n')}\\end{itemize}`
    : ''
const header = (top: string, topRight: string, sub: string, subRight: string) =>
  `\\noindent\\textbf{${escapeLatex(top)}}\\hfill\\textit{${escapeLatex(topRight)}}\\\\\n` +
  `{\\scshape\\small ${escapeLatex(sub)}}\\hfill{\\small\\itshape ${escapeLatex(subRight)}}`
const table = (rows: string[]) => `\\begin{tabular}{@{}l@{\\quad}l@{}}\n${rows.map(r => r + ' \\\\').join('\n')}\n\\end{tabular}`

export function renderTex(ev: Evidence, plan: Plan): string {
  const profile = ev.profiles.find(p => p.id === plan.profile)
  const tpl = fs.readFileSync(path.join(process.cwd(), 'app/_lib/resume/template.tex'), 'utf8')
  const boldFor = (id: string) => plan.bold.find(b => b.bulletId === id)?.terms ?? []

  const expBlocks: string[] = []
  for (const exp of ev.experiences) {
    const sel = plan.experiences.find(e => e.experienceId === exp.id)
    if (!sel) continue
    const bullets = sel.bulletIds
      .map(id => exp.bullets.find(b => b.id === id))
      .filter((b): b is NonNullable<typeof b> => !!b)
      .map(b => boldText(b.text, boldFor(b.id)))
    expBlocks.push(header(exp.company, exp.location, exp.role, exp.dates) + '\n' + itemize(bullets))
  }

  const eduBlocks = ev.education.map(e =>
    header(e.school, e.location, e.degree, e.dates) + (e.notes.length ? '\n' + itemize(e.notes.map(n => summaryTex(n))) : ''))

  const resBlocks = ev.research.map(r =>
    `\\begin{tabular*}{\\linewidth}{@{}l@{\\extracolsep{\\fill}}r@{}}\n\\textbf{${escapeLatex(r.title)}} & \\textit{${escapeLatex(r.venue)}} \\\\\n\\end{tabular*}\n` +
    `\\textbf{Topic: ${escapeLatex(r.topic)}} \\\\\n${escapeLatex(r.text)}`)

  const skillRows: string[] = []
  for (const sg of plan.skillGroups) {
    const g = ev.skillGroups.find(x => x.id === sg.groupId)
    if (g) skillRows.push(`\\textbf{${escapeLatex(g.label)}}: ${sg.items.map(escapeLatex).join(', ')}`)
  }

  const slots: Record<string, string> = {
    NAME: nameTex(ev.contact.name),
    TITLE: escapeLatex(profile?.title ?? ''),
    LOCATION: escapeLatex(ev.contact.location),
    CONTACT: contactTex(ev.contact),
    SUMMARY: profile?.summary ? section('Summary', summaryTex(profile.summary), false) : '',
    EXPERIENCE: expBlocks.length ? section('Work Experience', expBlocks.join('\n\n\\vspace{4pt}\n')) : '',
    EDUCATION: eduBlocks.length ? section('Education', eduBlocks.join('\n\n')) : '',
    RESEARCH: resBlocks.length ? section('Research Activity', '\\vspace{4pt}\n' + resBlocks.join('\n\n'), false) : '',
    SKILLS: skillRows.length ? section('Skills', table(skillRows)) : '',
    LANGUAGES: ev.languages.length ? section('Languages', table(ev.languages.map(l => `\\textbf{${escapeLatex(l.name)}:} ${escapeLatex(l.level)}`))) : '',
    INTERESTS: ev.interests.length ? section('Interests', table(ev.interests.map(i => `\\textbf{${escapeLatex(i.name)}:} ${escapeLatex(i.text)}`))) : '',
  }
  return tpl.replace(/%%([A-Z]+)%%/g, (_, k: string) => slots[k] ?? '')
}

const stripBold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1')

export function renderPlainText(ev: Evidence, plan: Plan): string {
  const profile = ev.profiles.find(p => p.id === plan.profile)
  const lines: string[] = [ev.contact.name, profile?.title ?? '', ev.contact.location]
  if (profile?.summary) lines.push(stripBold(profile.summary))
  for (const exp of ev.experiences) {
    const sel = plan.experiences.find(e => e.experienceId === exp.id)
    if (!sel) continue
    lines.push(`${exp.company}, ${exp.location} - ${exp.role} (${exp.dates})`)
    for (const id of sel.bulletIds) {
      const b = exp.bullets.find(x => x.id === id)
      if (b) lines.push(b.text)
    }
  }
  for (const e of ev.education) {
    lines.push(`${e.school}, ${e.location} - ${e.degree} (${e.dates})`)
    for (const n of e.notes) lines.push(stripBold(n))
  }
  for (const r of ev.research) lines.push(`${r.title} (${r.venue}) Topic: ${r.topic}. ${r.text}`)
  for (const sg of plan.skillGroups) {
    const g = ev.skillGroups.find(x => x.id === sg.groupId)
    if (g) lines.push(`${g.label}: ${sg.items.join(', ')}`)
  }
  for (const l of ev.languages) lines.push(`${l.name}: ${l.level}`)
  for (const i of ev.interests) lines.push(`${i.name}: ${i.text}`)
  return lines.filter(l => l !== '').join('\n')
}

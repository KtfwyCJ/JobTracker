import { readFileSync } from 'fs'
import { join } from 'path'

export interface WatchlistCompany {
  name: string
  aliases: string[]
  category: string
  tier: string
  priority: string | null
  city: string
  careerPortalUrl: string | null
}

function normalizeCity(rawCity: string): string {
  const first = rawCity.split('/')[0].trim()
  return /remote/i.test(first) ? 'Germany' : first
}

function parsePortalUrl(cell: string): string | null {
  return cell.match(/\]\((https?:\/\/[^)]+)\)/)?.[1] ?? null
}

function parseRow(line: string): WatchlistCompany | null {
  const cells = line
    .split('|')
    .slice(1, -1) // drop the empty strings before the first and after the last "|"
    .map((c) => c.trim())

  if (cells.length < 7) return null
  const [, name, category, tier, priority, city, careerPortal] = cells
  if (!name) return null

  return {
    name,
    aliases: name.split('/').map((a) => a.trim()).filter(Boolean),
    category,
    tier,
    priority: priority || null,
    city: normalizeCity(city),
    careerPortalUrl: parsePortalUrl(careerPortal),
  }
}

export function parseCompanyList(): WatchlistCompany[] {
  let content: string
  try {
    content = readFileSync(join(process.cwd(), 'companylist.md'), 'utf-8')
  } catch {
    throw new Error('companylist.md not found in project root.')
  }

  const lines = content.split('\n')
  const headingIndex = lines.findIndex((l) => l.trim() === '## 📋 Master Tracker')
  if (headingIndex === -1) {
    throw new Error('Could not find "## 📋 Master Tracker" section in companylist.md.')
  }

  const afterHeading = lines.slice(headingIndex + 1)
  const sectionEnd = afterHeading.findIndex((l) => l.trim() === '---')
  const section = sectionEnd === -1 ? afterHeading : afterHeading.slice(0, sectionEnd)

  const tableLines = section.filter((l) => l.trim().startsWith('|'))

  // First table line is the header row, second is the "|---|---|..." separator.
  const companies = tableLines
    .slice(2)
    .map(parseRow)
    .filter((c): c is WatchlistCompany => c !== null)

  if (companies.length === 0) {
    throw new Error('No companies found in the Master Tracker table.')
  }

  return companies
}

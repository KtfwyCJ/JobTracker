/**
 * Country / location matching shared by the aggregator fetchers and the
 * Watchlist route's server-side filter.
 *
 * The job feeds give location as a free-text string ("Berlin, Berlin, Germany",
 * "Spain (Remote)", "Düsseldorf, Nordrhein-Westfalen", "Remote") and sometimes a
 * separately-tagged country. This module turns a requested country + a job's
 * location into a yes/no, precisely enough that "United States (Remote)" does not
 * count as Germany.
 */

// Synonyms -> canonical country name. Extend as needed.
const COUNTRY_SYNONYMS: Record<string, string> = {
  germany: 'germany',
  deutschland: 'germany',
  de: 'germany',
  ger: 'germany',
  'united states': 'united states',
  'united states of america': 'united states',
  usa: 'united states',
  us: 'united states',
  'u.s.': 'united states',
  'u.s.a.': 'united states',
  america: 'united states',
  'united kingdom': 'united kingdom',
  uk: 'united kingdom',
  'u.k.': 'united kingdom',
  gb: 'united kingdom',
  britain: 'united kingdom',
  'great britain': 'united kingdom',
  england: 'united kingdom',
  scotland: 'united kingdom',
  wales: 'united kingdom',
  austria: 'austria',
  österreich: 'austria',
  switzerland: 'switzerland',
  schweiz: 'switzerland',
  suisse: 'switzerland',
  france: 'france',
  netherlands: 'netherlands',
  nederland: 'netherlands',
  'the netherlands': 'netherlands',
  holland: 'netherlands',
  spain: 'spain',
  españa: 'spain',
  italy: 'italy',
  italia: 'italy',
  poland: 'poland',
  polska: 'poland',
  ireland: 'ireland',
  'republic of ireland': 'ireland',
  portugal: 'portugal',
  belgium: 'belgium',
  sweden: 'sweden',
  denmark: 'denmark',
  norway: 'norway',
  finland: 'finland',
  canada: 'canada',
  india: 'india',
  australia: 'australia',
  brazil: 'brazil',
  singapore: 'singapore',
  japan: 'japan',
  romania: 'romania',
  'czech republic': 'czech republic',
  czechia: 'czech republic',
  hungary: 'hungary',
  greece: 'greece',
  turkey: 'turkey',
  mexico: 'mexico',
  argentina: 'argentina',
  emea: 'emea',
  apac: 'apac',
}

// Canonical country -> known cities/regions that identify it on their own,
// used only when the location string names no country at all.
const COUNTRY_CITIES: Record<string, string[]> = {
  germany: [
    'berlin', 'munich', 'münchen', 'muenchen', 'hamburg', 'frankfurt', 'cologne',
    'köln', 'koeln', 'stuttgart', 'düsseldorf', 'dusseldorf', 'duesseldorf',
    'leipzig', 'dortmund', 'essen', 'bremen', 'dresden', 'hanover', 'hannover',
    'nuremberg', 'nürnberg', 'nuernberg', 'duisburg', 'bochum', 'wuppertal',
    'bonn', 'bielefeld', 'mannheim', 'karlsruhe', 'wiesbaden', 'münster',
    'muenster', 'augsburg', 'aachen', 'mönchengladbach', 'gelsenkirchen',
    'braunschweig', 'kiel', 'chemnitz', 'halle', 'magdeburg', 'freiburg',
    'krefeld', 'mainz', 'lübeck', 'luebeck', 'erfurt', 'rostock', 'kassel',
    'potsdam', 'saarbrücken', 'saarbruecken', 'heidelberg', 'darmstadt',
    'regensburg', 'ingolstadt', 'ulm', 'wolfsburg', 'walldorf', 'gerlingen',
    'renningen', 'erlangen', 'forchheim', 'ottobrunn', 'nordrhein-westfalen',
    'bavaria', 'bayern', 'baden-württemberg', 'baden-wuerttemberg', 'hesse',
    'hessen', 'saxony', 'sachsen', 'lower saxony', 'niedersachsen',
    'rhineland', 'brandenburg', 'thuringia', 'thüringen',
  ],
  austria: ['vienna', 'wien', 'graz', 'linz', 'salzburg', 'innsbruck'],
  switzerland: ['zurich', 'zürich', 'geneva', 'genève', 'basel', 'bern', 'lausanne', 'lugano', 'zug'],
}

// Non-target city names that reliably indicate a different country, used to
// reject a location that names no country but clearly isn't the target.
const FOREIGN_CITY_HINTS = [
  'new york', 'san francisco', 'seattle', 'austin', 'boston', 'chicago',
  'los angeles', 'denver', 'atlanta', 'dallas', 'washington', 'palo alto',
  'mountain view', 'san jose', 'toronto', 'vancouver', 'montreal', 'london',
  'manchester', 'dublin', 'paris', 'amsterdam', 'rotterdam', 'madrid',
  'barcelona', 'lisbon', 'porto', 'warsaw', 'krakow', 'kraków', 'wrocław',
  'wroclaw', 'bengaluru', 'bangalore', 'hyderabad', 'pune', 'mumbai', 'delhi',
  'gurgaon', 'gurugram', 'chennai', 'noida', 'singapore', 'sydney', 'melbourne',
  'tokyo', 'são paulo', 'sao paulo', 'mexico city', 'tel aviv', 'stockholm',
  'copenhagen', 'oslo', 'helsinki', 'milan', 'rome', 'bucharest', 'prague',
  'budapest', 'athens', 'istanbul', 'brussels', 'zagreb', 'sofia', 'tallinn',
]

export function canonicalCountry(raw: string): string {
  const s = raw.trim().toLowerCase()
  if (!s) return ''
  if (COUNTRY_SYNONYMS[s]) return COUNTRY_SYNONYMS[s]
  // e.g. "Germany (Remote)" or "de-remote"
  const cleaned = s.replace(/\(.*?\)/g, '').replace(/[-_/].*$/, '').trim()
  return COUNTRY_SYNONYMS[cleaned] ?? cleaned
}

/** Last comma-separated segment of a location, mapped to a canonical country. */
export function countryFromLocationTail(location: string): string {
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const c = canonicalCountry(parts[i])
    if (c && (COUNTRY_SYNONYMS[parts[i].trim().toLowerCase()] || c in COUNTRY_CITIES)) return c
  }
  return ''
}

function stripRemote(loc: string): string {
  return loc
    .toLowerCase()
    .replace(/\(.*?remote.*?\)/g, ' ')
    .replace(/\b(fully|100%|full|part)?\s*-?\s*remote\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function mentionsCountry(loc: string, canonical: string): boolean {
  for (const [syn, canon] of Object.entries(COUNTRY_SYNONYMS)) {
    if (canon !== canonical) continue
    const re = new RegExp(`(^|[\\s,(/-])${syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s,)/-])`, 'i')
    if (re.test(` ${loc} `)) return true
  }
  return false
}

function mentionsOtherCountry(loc: string, canonical: string): boolean {
  for (const [syn, canon] of Object.entries(COUNTRY_SYNONYMS)) {
    if (canon === canonical) continue
    // Skip 1-2 letter codes ("us", "de", "uk", "gb") — too many false hits inside words.
    if (syn.length <= 2) continue
    const re = new RegExp(`(^|[\\s,(/-])${syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s,)/-])`, 'i')
    if (re.test(` ${loc} `)) return true
  }
  for (const city of FOREIGN_CITY_HINTS) {
    if ((canonical === 'germany' || canonical === 'austria' || canonical === 'switzerland') &&
        loc.includes(city)) {
      return true
    }
  }
  return false
}

function mentionsKnownCity(loc: string, canonical: string): boolean {
  const cities = COUNTRY_CITIES[canonical]
  if (!cities) return false
  return cities.some((city) => loc.includes(city))
}

/**
 * Does a job at `location` (optionally already tagged with `jobCountry`) belong
 * to `requestedCountry`?
 *
 * - Blank requested country → everything matches.
 * - A country-scoped source (jobCountry set) → trust the tag.
 * - Otherwise: match on the country name; reject if a *different* country is
 *   named; match on a known city; and finally accept when nothing contradicts
 *   (bare "Remote", or a town we don't recognise) since the job is already
 *   bound to a company in the Germany-focused directory.
 */
export function locationMatchesCountry(
  location: string,
  requestedCountry: string,
  jobCountry?: string
): boolean {
  const want = canonicalCountry(requestedCountry)
  if (!want) return true

  if (jobCountry) {
    const jc = canonicalCountry(jobCountry)
    if (jc) return jc === want
  }

  const loc = stripRemote(location)
  if (!loc) return true // bare "Remote" / empty

  if (mentionsCountry(loc, want)) return true
  if (mentionsOtherCountry(loc, want)) return false
  if (mentionsKnownCity(loc, want)) return true
  return true
}

/**
 * update-results.mjs
 *
 * Scarica i risultati dei Mondiali 2026 da football-data.org
 * e li scrive su Firebase Realtime Database.
 *
 * Viene eseguito automaticamente da GitHub Actions ogni mattina alle 08:00 italiane.
 * Può essere eseguito manualmente: node scripts/update-results.mjs
 *
 * Variabili d'ambiente richieste:
 *   FOOTBALL_API_KEY          → chiave API di football-data.org
 *   FIREBASE_DATABASE_URL     → URL del Realtime Database Firebase
 *   FIREBASE_SERVICE_ACCOUNT  → JSON del service account Firebase (stringa)
 *   FORCE_UPDATE=true         → forza l'esecuzione fuori dalla finestra del Mondiale
 */

// ─── FINESTRA AUTOMATICA MONDIALE 2026 ────────────────────────────
// La finale e' il 19 luglio sera in Italia: il controllo del 20 luglio
// mattina cattura il risultato finale anche in caso di supplementari/rigori.
const AUTO_UPDATE_START = new Date('2026-06-11T00:00:00.000Z')
const AUTO_UPDATE_END   = new Date('2026-07-20T23:59:59.999Z')
const now               = new Date(process.env.AUTO_UPDATE_NOW || Date.now())
const forceUpdate       = process.env.FORCE_UPDATE === 'true'

if (!forceUpdate && (now < AUTO_UPDATE_START || now > AUTO_UPDATE_END)) {
  console.log(`⏭️  Fuori finestra Mondiale 2026 (${now.toISOString()}). Nessun aggiornamento eseguito.`)
  process.exit(0)
}

// ─── INIT FIREBASE ADMIN ───────────────────────────────────────────
const { FOOTBALL_API_KEY, FIREBASE_DATABASE_URL, FIREBASE_SERVICE_ACCOUNT } = process.env

if (!FOOTBALL_API_KEY || !FIREBASE_DATABASE_URL || !FIREBASE_SERVICE_ACCOUNT) {
  console.error('❌ Variabili d\'ambiente mancanti. Vedi README.md sezione "Risultati automatici".')
  process.exit(1)
}

const [{ initializeApp, cert }, { getDatabase }] = await Promise.all([
  import('firebase-admin/app'),
  import('firebase-admin/database'),
])

initializeApp({
  credential:  cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)),
  databaseURL: FIREBASE_DATABASE_URL,
})
const db = getDatabase()

// ─── MAPPATURA NOMI SQUADRE (inglese API → italiano app) ───────────
const TEAM_MAP = {
  'Mexico':                       'Mexico',
  'South Africa':                 'Sud Africa',
  'South Korea':                  'Corea del Sud',
  'Korea Republic':               'Corea del Sud',
  'Czech Republic':               'Cechia',
  'Czechia':                      'Cechia',
  'Canada':                       'Canada',
  'Bosnia and Herzegovina':       'Bosnia-Erzegovina',
  'Bosnia-Herzegovina':           'Bosnia-Erzegovina',
  'Qatar':                        'Qatar',
  'Switzerland':                  'Svizzera',
  'Brazil':                       'Brasile',
  'Morocco':                      'Marocco',
  'Haiti':                        'Haiti',
  'Scotland':                     'Scozia',
  'USA':                          'USA',
  'United States':                'USA',
  'Paraguay':                     'Paraguay',
  'Australia':                    'Australia',
  'Turkey':                       'Turchia',
  'Türkiye':                      'Turchia',
  'Germany':                      'Germania',
  'Curacao':                      'Curaçao',
  'Curaçao':                      'Curaçao',
  "Ivory Coast":                  "Costa d'Avorio",
  "Côte d'Ivoire":                "Costa d'Avorio",
  'Ecuador':                      'Ecuador',
  'Netherlands':                  'Olanda',
  'Japan':                        'Giappone',
  'Sweden':                       'Svezia',
  'Tunisia':                      'Tunisia',
  'Belgium':                      'Belgio',
  'Egypt':                        'Egitto',
  'Iran':                         'Iran',
  'IR Iran':                      'Iran',
  'New Zealand':                  'Nuova Zelanda',
  'Spain':                        'Spagna',
  'Cape Verde':                   'Capo Verde',
  'Saudi Arabia':                 'Arabia Saudita',
  'Uruguay':                      'Uruguay',
  'France':                       'Francia',
  'Senegal':                      'Senegal',
  'Iraq':                         'Iraq',
  'Norway':                       'Norvegia',
  'Argentina':                    'Argentina',
  'Algeria':                      'Algeria',
  'Austria':                      'Austria',
  'Jordan':                       'Giordania',
  'Portugal':                     'Portogallo',
  'DR Congo':                     'DR Congo',
  'Congo DR':                     'DR Congo',
  'Democratic Republic of Congo': 'DR Congo',
  'Uzbekistan':                   'Uzbekistan',
  'Colombia':                     'Colombia',
  'England':                      'Inghilterra',
  'Croatia':                      'Croazia',
  'Ghana':                        'Ghana',
  'Panama':                       'Panama',
}
const t = name => TEAM_MAP[name] || name

// ─── MAPPATURA GIRONI (formato API → lettera) ──────────────────────
const GROUP_MAP = {
  'GROUP_A':'A','GROUP_B':'B','GROUP_C':'C','GROUP_D':'D',
  'GROUP_E':'E','GROUP_F':'F','GROUP_G':'G','GROUP_H':'H',
  'GROUP_I':'I','GROUP_J':'J','GROUP_K':'K','GROUP_L':'L',
  'Group A':'A','Group B':'B','Group C':'C','Group D':'D',
  'Group E':'E','Group F':'F','Group G':'G','Group H':'H',
  'Group I':'I','Group J':'J','Group K':'K','Group L':'L',
}

// ─── BRACKET UFFICIALE FIFA 2026 (identico ad App.jsx) ────────────
const R32_T = [
  [{g:'A',p:'second'},{g:'B',p:'second'}],[{g:'E',p:'first'},{th:0}],
  [{g:'F',p:'first'},{g:'C',p:'second'}],[{g:'C',p:'first'},{g:'F',p:'second'}],
  [{g:'I',p:'first'},{th:1}],[{g:'E',p:'second'},{g:'I',p:'second'}],
  [{g:'A',p:'first'},{th:2}],[{g:'L',p:'first'},{th:3}],
  [{g:'D',p:'first'},{th:4}],[{g:'G',p:'first'},{th:5}],
  [{g:'K',p:'second'},{g:'L',p:'second'}],[{g:'H',p:'first'},{g:'J',p:'second'}],
  [{g:'B',p:'first'},{th:6}],[{g:'J',p:'first'},{g:'H',p:'second'}],
  [{g:'K',p:'first'},{th:7}],[{g:'D',p:'second'},{g:'G',p:'second'}],
]
const R16F = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]]
const QFF  = [[0,1],[2,3],[4,5],[6,7]]
const SFF  = [[0,1],[2,3]]

// ─── HELPERS ──────────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': FOOTBALL_API_KEY }
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HTTP ${res.status} per ${url}: ${body}`)
  }
  return res.json()
}

/** Restituisce il nome della squadra vincitrice di una partita, o null se non ancora finita */
function getWinner(match) {
  if (!match || match.status !== 'FINISHED') return null
  const h = match.score.fullTime.home
  const a = match.score.fullTime.away
  if (typeof h !== 'number' || typeof a !== 'number') return null
  if (h > a) return t(match.homeTeam.name)
  if (a > h) return t(match.awayTeam.name)
  // Rigori
  const ph = match.score.penalties?.home
  const pa = match.score.penalties?.away
  if (typeof ph === 'number' && typeof pa === 'number') {
    return ph > pa ? t(match.homeTeam.name) : t(match.awayTeam.name)
  }
  return null
}

/** Cerca una partita KO tra due squadre specifiche */
function findKOMatch(allMatches, teamA, teamB, stage) {
  if (!teamA || !teamB) return null
  return allMatches.find(m => {
    const mh = t(m.homeTeam.name), ma = t(m.awayTeam.name)
    const stageOk = !stage || m.stage === stage
    return stageOk && ((mh===teamA&&ma===teamB)||(mh===teamB&&ma===teamA))
  }) || null
}

// ─── LOGICA PRINCIPALE ─────────────────────────────────────────────
async function main() {
  console.log(`\n⚽ Aggiornamento risultati Mondiali 2026 — ${now.toISOString()}\n`)

  // 1. Classifiche gironi
  console.log('📥 Fetch classifiche gironi...')
  const standingsData = await fetchJSON('https://api.football-data.org/v4/competitions/WC/standings?season=2026')
  const groups = {}

  for (const standing of standingsData.standings || []) {
    const key = GROUP_MAP[standing.group]
    if (!key) continue
    const table = standing.table || []
    groups[key] = {
      first:  t(table[0]?.team?.name || ''),
      second: t(table[1]?.team?.name || ''),
      third:  t(table[2]?.team?.name || ''),
      fourth: t(table[3]?.team?.name || ''),
    }
  }
  const groupsDone = Object.keys(groups).length
  console.log(`   ✓ Gironi con dati: ${groupsDone}/12`)

  // 2. Tutte le partite
  console.log('📥 Fetch risultati partite...')
  const matchData = await fetchJSON('https://api.football-data.org/v4/competitions/WC/matches?season=2026')
  const allMatches = matchData.matches || []
  const koMatches  = allMatches.filter(m => m.stage !== 'GROUP_STAGE')

  const finished = allMatches.filter(m => m.status === 'FINISHED').length
  const total    = allMatches.length
  console.log(`   ✓ Partite finite: ${finished}/${total}`)

  // 3. Migliori terze classificate
  // L'ordine di qualificazione delle terze dipende da una tabella FIFA.
  // Usiamo l'ordine delle terze come appaiono nei risultati (in futuro
  // si può raffinare con la logica ufficiale dei punti/gol differenza).
  const allThirds = Object.values(groups)
    .filter(g => g.third)
    .map(g => g.third)
    .slice(0, 8)

  // 4. Calcola risultati bracket
  const resolve = (slot, thirds) =>
    slot.g ? groups[slot.g]?.[slot.p] || null : thirds[slot.th] || null

  const r32 = R32_T.map(([hs, as]) => {
    const h = resolve(hs, allThirds), a = resolve(as, allThirds)
    return getWinner(findKOMatch(koMatches, h, a, 'LAST_32'))
  })

  const r16 = R16F.map(([a,b]) =>
    getWinner(findKOMatch(koMatches, r32[a], r32[b], 'LAST_16'))
  )

  const qf = QFF.map(([a,b]) =>
    getWinner(findKOMatch(koMatches, r16[a], r16[b], 'QUARTER_FINAL'))
  )

  const sf = SFF.map(([a,b]) =>
    getWinner(findKOMatch(koMatches, qf[a], qf[b], 'SEMI_FINAL'))
  )

  const finalMatch  = koMatches.find(m => m.stage === 'FINAL')
  const thirdMatch  = koMatches.find(m => m.stage === 'THIRD_PLACE')
  const champion    = getWinner(finalMatch)
  const thirdPlace  = getWinner(thirdMatch)

  // 5. Componi oggetto risultati
  const results = {
    groups: Object.fromEntries(
      Object.entries(groups).map(([k,v]) => [k, { first: v.first||null, second: v.second||null }])
    ),
    thirds: allThirds,
    r32, r16, qf, sf, champion, thirdPlace,
    lastUpdated: now.toISOString(),
    updateCadence: 'daily-08-europe-rome',
  }

  // 6. Log riepilogo
  console.log('\n📊 Riepilogo:')
  console.log(`   Gironi completi : ${Object.values(results.groups).filter(g=>g.first&&g.second).length}/12`)
  console.log(`   Terze qualif.   : ${allThirds.length}/8`)
  console.log(`   Sedicesimi      : ${r32.filter(Boolean).length}/16`)
  console.log(`   Ottavi          : ${r16.filter(Boolean).length}/8`)
  console.log(`   Quarti          : ${qf.filter(Boolean).length}/4`)
  console.log(`   Semifinali      : ${sf.filter(Boolean).length}/2`)
  console.log(`   Campione        : ${champion || 'TBD'}`)

  // 7. Scrivi su Firebase
  console.log('\n💾 Scrittura su Firebase...')
  await db.ref('wc2026/results').set(results)
  console.log('✅ Firebase aggiornato con successo!\n')
}

main().catch(err => {
  console.error('\n❌ Errore:', err.message)
  process.exit(1)
})

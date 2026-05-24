/**
 * Fuzzy team name matching utilities.
 * Safety rule: similarity must be >= 85% to allow automatic pairing.
 */

const SIMILARITY_THRESHOLD = 0.85;

const MAX_GAME_TIME_DIFF_HOURS = 6;

// ── Levenshtein + normalised similarity ──────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

export function canAutoMatch(
  teamA: string,
  teamB: string
): boolean {
  return similarity(teamA, teamB) >= SIMILARITY_THRESHOLD;
}

// ── Time-based matching guard ─────────────────────────────────────────────

export function isWithinAllowedTimeDiff(
  internationalGameTime: string | Date,
  taiwanGameTime: string | Date
): boolean {
  const a = new Date(internationalGameTime).getTime();
  const b = new Date(taiwanGameTime).getTime();
  const diffHours = Math.abs(a - b) / (1000 * 60 * 60);
  return diffHours <= MAX_GAME_TIME_DIFF_HOURS;
}

// ── City / city abbreviation maps ─────────────────────────────────────────

const NBA_ALIASES: Record<string, string[]> = {
  "Atlanta Hawks": ["老鷹", "hawks", "atl"],
  "Boston Celtics": ["塞爾提克", "celtics", "bos"],
  "Brooklyn Nets": ["籃網", "nets", "bkn"],
  "Charlotte Hornets": ["黃蜂", "hornets", "cha"],
  "Chicago Bulls": ["公牛", "bulls", "chi"],
  "Cleveland Cavaliers": ["騎士", "cavaliers", "cle"],
  "Dallas Mavericks": ["小牛", "獨行俠", "mavericks", "dal"],
  "Denver Nuggets": ["金塊", "nuggets", "den"],
  "Detroit Pistons": ["活塞", "pistons", "det"],
  "Golden State Warriors": ["勇士", "warriors", "gsw"],
  "Houston Rockets": ["火箭", "rockets", "hou"],
  "Indiana Pacers": ["溜馬", "pacers", "ind"],
  "LA Clippers": ["快艇", "clippers", "lac"],
  "Los Angeles Lakers": ["湖人", "lakers", "lal"],
  "Memphis Grizzlies": ["灰熊", "grizzlies", "mem"],
  "Miami Heat": ["熱火", "heat", "mia"],
  "Milwaukee Bucks": ["公鹿", "bucks", "mil"],
  "Minnesota Timberwolves": ["灰狼", "timberwolves", "min"],
  "New Orleans Pelicans": ["鵜鶘", "pelicans", "nop"],
  "New York Knicks": ["尼克", "knicks", "nyk"],
  "Oklahoma City Thunder": ["雷霆", "thunder", "okc"],
  "Orlando Magic": ["魔術", "magic", "orl"],
  "Philadelphia 76ers": ["七六人", "76ers", "phi"],
  "Phoenix Suns": ["太陽", "suns", "phx"],
  "Portland Trail Blazers": ["拓荒者", "blazers", "por"],
  "Sacramento Kings": ["國王", "kings", "sac"],
  "San Antonio Spurs": ["馬刺", "spurs", "sas"],
  "Toronto Raptors": ["暴龍", "raptors", "tor"],
  "Utah Jazz": ["爵士", "jazz", "uta"],
  "Washington Wizards": ["巫師", "wizards", "was"],
};

const MLB_ALIASES: Record<string, string[]> = {
  "Arizona Diamondbacks": ["響尾蛇", "diamondbacks", "ari"],
  "Atlanta Braves": ["勇士", "braves", "atl"],
  "Baltimore Orioles": ["金鶯", "orioles", "bal"],
  "Boston Red Sox": ["紅襪", "red sox", "bos"],
  "Chicago Cubs": ["小熊", "cubs", "chc"],
  "Chicago White Sox": ["白襪", "white sox", "cws"],
  "Cincinnati Reds": ["紅人", "reds", "cin"],
  "Cleveland Guardians": ["守護者", "guardians", "cle"],
  "Colorado Rockies": ["洛磯", "rockies", "col"],
  "Detroit Tigers": ["老虎", "tigers", "det"],
  "Houston Astros": ["太空人", "astros", "hou"],
  "Kansas City Royals": ["皇家", "royals", "kc"],
  "Los Angeles Angels": ["天使", "angels", "laa"],
  "Los Angeles Dodgers": ["道奇", "dodgers", "lad"],
  "Miami Marlins": ["馬林魚", "marlins", "mia"],
  "Milwaukee Brewers": ["釀酒人", "brewers", "mil"],
  "Minnesota Twins": ["雙城", "twins", "min"],
  "New York Mets": ["大都會", "mets", "nym"],
  "New York Yankees": ["洋基", "yankees", "nyy"],
  "Oakland Athletics": ["運動家", "athletics", "oak"],
  "Philadelphia Phillies": ["費城人", "phillies", "phi"],
  "Pittsburgh Pirates": ["海盜", "pirates", "pit"],
  "San Diego Padres": ["教士", "padres", "sd"],
  "San Francisco Giants": ["巨人", "giants", "sf"],
  "Seattle Mariners": ["水手", "mariners", "sea"],
  "St. Louis Cardinals": ["紅雀", "cardinals", "stl"],
  "Tampa Bay Rays": ["光芒", "rays", "tb"],
  "Texas Rangers": ["遊騎兵", "rangers", "tex"],
  "Toronto Blue Jays": ["藍鳥", "blue jays", "tor"],
  "Washington Nationals": ["國民", "nationals", "was"],
};

type AliasMap = Record<string, string[]>;

function resolveCanonical(name: string, aliases: AliasMap): string | null {
  const norm = normalize(name);
  for (const [canonical, alts] of Object.entries(aliases)) {
    if (normalize(canonical) === norm) return canonical;
    for (const alt of alts) {
      if (normalize(alt) === norm) return canonical;
    }
  }
  return null;
}

/** Resolve a team name (English, Chinese, abbrev) to its canonical English form. */
export function resolveTeamName(
  name: string,
  league: "NBA" | "MLB"
): string | null {
  const aliases = league === "NBA" ? NBA_ALIASES : MLB_ALIASES;
  return resolveCanonical(name, aliases);
}

/** Get Chinese name for a team. */
export function getTeamZh(
  canonicalName: string,
  league: "NBA" | "MLB"
): string | null {
  const aliases = league === "NBA" ? NBA_ALIASES : MLB_ALIASES;
  const alts = aliases[canonicalName];
  if (!alts) return null;
  const zh = alts.find((a) => /[一-鿿]/.test(a));
  return zh ?? null;
}

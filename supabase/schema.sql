-- ================================================================
-- NBA / MLB 賠率 Edge 分析系統 - Supabase SQL Schema
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- 1. games — 比賽基本資料
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  league            VARCHAR(10) NOT NULL CHECK (league IN ('NBA', 'MLB')),
  home_team         VARCHAR(100) NOT NULL,
  away_team         VARCHAR(100) NOT NULL,
  home_team_zh      VARCHAR(100),
  away_team_zh      VARCHAR(100),
  game_time         TIMESTAMPTZ NOT NULL,
  status            VARCHAR(20) DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
  external_id       VARCHAR(200) UNIQUE,   -- The Odds API / OpticOdds game ID
  taiwan_game_id    VARCHAR(200),          -- 台灣運彩內部 ID
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_league_time ON games (league, game_time);
CREATE INDEX IF NOT EXISTS idx_games_external_id ON games (external_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);

-- ----------------------------------------------------------------
-- 2. odds_snapshots — 每次賠率快照（國際盤 + 台灣運彩）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS odds_snapshots (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id       UUID        REFERENCES games(id) ON DELETE CASCADE,
  bookmaker     VARCHAR(100) NOT NULL,
  -- e.g. 'pinnacle', 'bet365', 'sbobet', 'draftkings', 'taiwan_sports'
  market_type   VARCHAR(50) NOT NULL CHECK (market_type IN ('moneyline', 'spread', 'totals')),
  home_odds     NUMERIC(8,4),
  away_odds     NUMERIC(8,4),
  draw_odds     NUMERIC(8,4),  -- 和局（目前 NBA/MLB 不適用，保留欄位）
  line          NUMERIC(8,2),  -- spread / totals 的 line 值
  snapshot_time TIMESTAMPTZ DEFAULT NOW(),
  source        VARCHAR(50),   -- 'the-odds-api', 'opticodds', 'manual', 'mock'
  raw_data      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_game_bookmaker
  ON odds_snapshots (game_id, bookmaker, market_type);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON odds_snapshots (snapshot_time DESC);

-- ----------------------------------------------------------------
-- 3. fair_probabilities — 去除 vig 後的公平機率
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fair_probabilities (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id             UUID    REFERENCES games(id) ON DELETE CASCADE,
  market_type         VARCHAR(50) NOT NULL,
  home_no_vig_prob    NUMERIC(10,6),  -- 主場公平勝率
  away_no_vig_prob    NUMERIC(10,6),  -- 客場公平勝率
  home_fair_odds      NUMERIC(8,4),   -- 1 / home_no_vig_prob
  away_fair_odds      NUMERIC(8,4),   -- 1 / away_no_vig_prob
  vig_pct             NUMERIC(8,4),   -- 水錢百分比
  bookmakers_used     TEXT[],         -- 計算來源的莊家清單
  bookmakers_count    INT,
  calculated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fair_prob_game ON fair_probabilities (game_id, market_type);

-- ----------------------------------------------------------------
-- 4. edge_signals — Edge 訊號（最終分析結果）
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS edge_signals (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id           UUID    REFERENCES games(id) ON DELETE CASCADE,
  market_type       VARCHAR(50) NOT NULL,
  side              VARCHAR(10) NOT NULL CHECK (side IN ('home', 'away')),
  taiwan_odds       NUMERIC(8,4),     -- 台灣運彩賠率（小數）
  no_vig_prob       NUMERIC(10,6),    -- 去水後公平機率
  fair_odds         NUMERIC(8,4),     -- 公平賠率
  ev_pct            NUMERIC(8,4),     -- EV% = (no_vig_prob * taiwan_odds - 1) * 100
  edge_pct          NUMERIC(8,4),     -- 同 ev_pct（保留兩個欄位方便區分）
  kelly_fraction    NUMERIC(10,6),    -- Kelly 建議比例
  confidence_level  VARCHAR(20) DEFAULT 'medium'
                    CHECK (confidence_level IN ('high', 'medium', 'low', 'manual_review')),
  needs_review      BOOLEAN DEFAULT FALSE,  -- edge > 10% 標記
  data_sources      JSONB,            -- { bookmakers: [...], snapshot_ids: [...] }
  calculated_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edge_game ON edge_signals (game_id, market_type);
CREATE INDEX IF NOT EXISTS idx_edge_ev ON edge_signals (ev_pct DESC);
CREATE INDEX IF NOT EXISTS idx_edge_review ON edge_signals (needs_review) WHERE needs_review = TRUE;

-- ----------------------------------------------------------------
-- 自動更新 updated_at（games 表）
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS games_updated_at ON games;
CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ----------------------------------------------------------------
-- Row Level Security（生產環境建議開啟）
-- ----------------------------------------------------------------
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE odds_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE fair_probabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_signals ENABLE ROW LEVEL SECURITY;

-- 允許匿名讀取（Dashboard 顯示用）
DROP POLICY IF EXISTS "public read games" ON games;
DROP POLICY IF EXISTS "public read snapshots" ON odds_snapshots;
DROP POLICY IF EXISTS "public read fair_prob" ON fair_probabilities;
DROP POLICY IF EXISTS "public read edge_signals" ON edge_signals;
CREATE POLICY "public read games" ON games FOR SELECT USING (true);
CREATE POLICY "public read snapshots" ON odds_snapshots FOR SELECT USING (true);
CREATE POLICY "public read fair_prob" ON fair_probabilities FOR SELECT USING (true);
CREATE POLICY "public read edge_signals" ON edge_signals FOR SELECT USING (true);

-- 只允許 service_role 寫入
DROP POLICY IF EXISTS "service write games" ON games;
DROP POLICY IF EXISTS "service write snapshots" ON odds_snapshots;
DROP POLICY IF EXISTS "service write fair_prob" ON fair_probabilities;
DROP POLICY IF EXISTS "service write edge_signals" ON edge_signals;
CREATE POLICY "service write games" ON games FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service write snapshots" ON odds_snapshots FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service write fair_prob" ON fair_probabilities FOR ALL
  USING (auth.role() = 'service_role');
CREATE POLICY "service write edge_signals" ON edge_signals FOR ALL
  USING (auth.role() = 'service_role');

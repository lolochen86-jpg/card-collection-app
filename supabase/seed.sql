-- ================================================================
-- Seed: 測試用 Mock 資料（執行於本地 Supabase 環境）
-- ================================================================

-- 清空舊資料（開發用）
TRUNCATE edge_signals, fair_probabilities, odds_snapshots, games RESTART IDENTITY CASCADE;

-- ── Games ──────────────────────────────────────────────────────────────────
INSERT INTO games (id, league, home_team, away_team, home_team_zh, away_team_zh, game_time, status, external_id, taiwan_game_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'NBA', 'Boston Celtics',       'Miami Heat',          '塞爾提克', '熱火',   NOW() + INTERVAL '3 hours',  'scheduled', 'ext-nba-001', 'tw-nba-001'),
  ('00000000-0000-0000-0000-000000000002', 'NBA', 'Los Angeles Lakers',   'Golden State Warriors','湖人',     '勇士',   NOW() + INTERVAL '5 hours',  'scheduled', 'ext-nba-002', 'tw-nba-002'),
  ('00000000-0000-0000-0000-000000000003', 'NBA', 'Denver Nuggets',       'Phoenix Suns',        '金塊',     '太陽',   NOW() + INTERVAL '6 hours',  'scheduled', 'ext-nba-003', 'tw-nba-003'),
  ('00000000-0000-0000-0000-000000000004', 'MLB', 'New York Yankees',     'Boston Red Sox',      '洋基',     '紅襪',   NOW() + INTERVAL '4 hours',  'scheduled', 'ext-mlb-001', 'tw-mlb-001'),
  ('00000000-0000-0000-0000-000000000005', 'MLB', 'Los Angeles Dodgers',  'San Francisco Giants','道奇',     '巨人',   NOW() + INTERVAL '7 hours',  'scheduled', 'ext-mlb-002', 'tw-mlb-002'),
  ('00000000-0000-0000-0000-000000000006', 'MLB', 'Houston Astros',       'Texas Rangers',       '太空人',   '遊騎兵', NOW() + INTERVAL '2 hours',  'live',      'ext-mlb-003', 'tw-mlb-003');

-- ── Odds Snapshots ─────────────────────────────────────────────────────────
INSERT INTO odds_snapshots (game_id, bookmaker, market_type, home_odds, away_odds, source)
VALUES
  -- g1 Celtics vs Heat
  ('00000000-0000-0000-0000-000000000001', 'pinnacle',      'moneyline', 1.72, 2.21, 'mock'),
  ('00000000-0000-0000-0000-000000000001', 'bet365',        'moneyline', 1.70, 2.25, 'mock'),
  ('00000000-0000-0000-0000-000000000001', 'sbobet',        'moneyline', 1.71, 2.22, 'mock'),
  ('00000000-0000-0000-0000-000000000001', 'taiwan_sports', 'moneyline', 1.85, 2.10, 'manual'),
  -- g2 Lakers vs Warriors
  ('00000000-0000-0000-0000-000000000002', 'pinnacle',      'moneyline', 2.08, 1.85, 'mock'),
  ('00000000-0000-0000-0000-000000000002', 'bet365',        'moneyline', 2.10, 1.83, 'mock'),
  ('00000000-0000-0000-0000-000000000002', 'sbobet',        'moneyline', 2.05, 1.88, 'mock'),
  ('00000000-0000-0000-0000-000000000002', 'taiwan_sports', 'moneyline', 2.20, 1.80, 'manual'),
  -- g3 Nuggets vs Suns
  ('00000000-0000-0000-0000-000000000003', 'pinnacle',      'moneyline', 1.55, 2.65, 'mock'),
  ('00000000-0000-0000-0000-000000000003', 'bet365',        'moneyline', 1.57, 2.60, 'mock'),
  ('00000000-0000-0000-0000-000000000003', 'taiwan_sports', 'moneyline', 1.60, 2.55, 'manual'),
  -- g4 Yankees vs Red Sox
  ('00000000-0000-0000-0000-000000000004', 'pinnacle',      'moneyline', 1.82, 2.10, 'mock'),
  ('00000000-0000-0000-0000-000000000004', 'bet365',        'moneyline', 1.80, 2.12, 'mock'),
  ('00000000-0000-0000-0000-000000000004', 'sbobet',        'moneyline', 1.83, 2.08, 'mock'),
  ('00000000-0000-0000-0000-000000000004', 'taiwan_sports', 'moneyline', 1.95, 2.00, 'manual'),
  -- g5 Dodgers vs Giants
  ('00000000-0000-0000-0000-000000000005', 'pinnacle',      'moneyline', 1.45, 2.90, 'mock'),
  ('00000000-0000-0000-0000-000000000005', 'bet365',        'moneyline', 1.47, 2.85, 'mock'),
  ('00000000-0000-0000-0000-000000000005', 'taiwan_sports', 'moneyline', 1.50, 2.80, 'manual'),
  -- g6 Astros vs Rangers (live)
  ('00000000-0000-0000-0000-000000000006', 'pinnacle',      'moneyline', 1.65, 2.35, 'mock'),
  ('00000000-0000-0000-0000-000000000006', 'bet365',        'moneyline', 1.67, 2.30, 'mock'),
  ('00000000-0000-0000-0000-000000000006', 'taiwan_sports', 'moneyline', 1.75, 2.25, 'manual');

-- ── Fair Probabilities ─────────────────────────────────────────────────────
INSERT INTO fair_probabilities (game_id, market_type, home_no_vig_prob, away_no_vig_prob, home_fair_odds, away_fair_odds, vig_pct, bookmakers_used, bookmakers_count)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'moneyline', 0.5826, 0.4174, 1.7163, 2.3958, 2.8, ARRAY['pinnacle','bet365','sbobet'], 3),
  ('00000000-0000-0000-0000-000000000002', 'moneyline', 0.4730, 0.5270, 2.1141, 1.8975, 3.1, ARRAY['pinnacle','bet365','sbobet'], 3),
  ('00000000-0000-0000-0000-000000000003', 'moneyline', 0.6393, 0.3607, 1.5642, 2.7724, 2.5, ARRAY['pinnacle','bet365'], 2),
  ('00000000-0000-0000-0000-000000000004', 'moneyline', 0.5332, 0.4668, 1.8754, 2.1421, 3.6, ARRAY['pinnacle','bet365','sbobet'], 3),
  ('00000000-0000-0000-0000-000000000005', 'moneyline', 0.6720, 0.3280, 1.4881, 3.0488, 2.2, ARRAY['pinnacle','bet365'], 2),
  ('00000000-0000-0000-0000-000000000006', 'moneyline', 0.5892, 0.4108, 1.6973, 2.4343, 2.9, ARRAY['pinnacle','bet365'], 2);

-- ── Edge Signals ──────────────────────────────────────────────────────────
-- Pre-computed with the formula: EV = noVigProb * taiwanOdds - 1
INSERT INTO edge_signals (game_id, market_type, side, taiwan_odds, no_vig_prob, fair_odds, ev_pct, edge_pct, kelly_fraction, confidence_level, needs_review, data_sources)
VALUES
  ('00000000-0000-0000-0000-000000000001','moneyline','home',1.85,0.5826,1.7163, 7.78, 7.78, 0.0777, 'high',  false, '{"bookmakers":["pinnacle","bet365","sbobet"]}'),
  ('00000000-0000-0000-0000-000000000001','moneyline','away',2.10,0.4174,2.3958,-12.35,-12.35,0,     'high',  false, '{"bookmakers":["pinnacle","bet365","sbobet"]}'),
  ('00000000-0000-0000-0000-000000000002','moneyline','home',2.20,0.4730,2.1141, 4.06, 4.06, 0.0229, 'high',  false, '{"bookmakers":["pinnacle","bet365","sbobet"]}'),
  ('00000000-0000-0000-0000-000000000002','moneyline','away',1.80,0.5270,1.8975,-5.14,-5.14,0,       'high',  false, '{"bookmakers":["pinnacle","bet365","sbobet"]}'),
  ('00000000-0000-0000-0000-000000000003','moneyline','home',1.60,0.6393,1.5642, 2.29, 2.29, 0.0191, 'medium',false, '{"bookmakers":["pinnacle","bet365"]}'),
  ('00000000-0000-0000-0000-000000000003','moneyline','away',2.55,0.3607,2.7724,-7.98,-7.98,0,       'medium',false, '{"bookmakers":["pinnacle","bet365"]}'),
  ('00000000-0000-0000-0000-000000000004','moneyline','home',1.95,0.5332,1.8754, 3.97, 3.97, 0.0264, 'high',  false, '{"bookmakers":["pinnacle","bet365","sbobet"]}'),
  ('00000000-0000-0000-0000-000000000004','moneyline','away',2.00,0.4668,2.1421,-6.64,-6.64,0,       'high',  false, '{"bookmakers":["pinnacle","bet365","sbobet"]}'),
  ('00000000-0000-0000-0000-000000000005','moneyline','home',1.50,0.6720,1.4881, 0.80, 0.80, 0.0053, 'medium',false, '{"bookmakers":["pinnacle","bet365"]}'),
  ('00000000-0000-0000-0000-000000000005','moneyline','away',2.80,0.3280,3.0488,-8.16,-8.16,0,       'medium',false, '{"bookmakers":["pinnacle","bet365"]}'),
  ('00000000-0000-0000-0000-000000000006','moneyline','home',1.75,0.5892,1.6973, 3.11, 3.11, 0.0252, 'medium',false, '{"bookmakers":["pinnacle","bet365"]}'),
  ('00000000-0000-0000-0000-000000000006','moneyline','away',2.25,0.4108,2.4343,-7.57,-7.57,0,       'medium',false, '{"bookmakers":["pinnacle","bet365"]}');

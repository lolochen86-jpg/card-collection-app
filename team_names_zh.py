"""
NBA / MLB 隊伍名稱中英對照表（繁體中文，台灣慣用譯名）
"""

NBA_TEAMS_ZH: dict[str, str] = {
    "Atlanta Hawks": "老鷹",
    "Boston Celtics": "塞爾提克",
    "Brooklyn Nets": "籃網",
    "Charlotte Hornets": "黃蜂",
    "Chicago Bulls": "公牛",
    "Cleveland Cavaliers": "騎士",
    "Dallas Mavericks": "獨行俠",
    "Denver Nuggets": "金塊",
    "Detroit Pistons": "活塞",
    "Golden State Warriors": "勇士",
    "Houston Rockets": "火箭",
    "Indiana Pacers": "溜馬",
    "LA Clippers": "快艇",
    "Los Angeles Clippers": "快艇",
    "Los Angeles Lakers": "湖人",
    "Memphis Grizzlies": "灰熊",
    "Miami Heat": "熱火",
    "Milwaukee Bucks": "公鹿",
    "Minnesota Timberwolves": "灰狼",
    "New Orleans Pelicans": "鵜鶘",
    "New York Knicks": "尼克",
    "Oklahoma City Thunder": "雷霆",
    "Orlando Magic": "魔術",
    "Philadelphia 76ers": "76 人",
    "Phoenix Suns": "太陽",
    "Portland Trail Blazers": "拓荒者",
    "Sacramento Kings": "國王",
    "San Antonio Spurs": "馬刺",
    "Toronto Raptors": "暴龍",
    "Utah Jazz": "爵士",
    "Washington Wizards": "巫師",
}

MLB_TEAMS_ZH: dict[str, str] = {
    "Arizona Diamondbacks": "響尾蛇",
    "Atlanta Braves": "勇士",
    "Baltimore Orioles": "金鶯",
    "Boston Red Sox": "紅襪",
    "Chicago Cubs": "小熊",
    "Chicago White Sox": "白襪",
    "Cincinnati Reds": "紅人",
    "Cleveland Guardians": "守護者",
    "Colorado Rockies": "落磯",
    "Detroit Tigers": "老虎",
    "Houston Astros": "太空人",
    "Kansas City Royals": "皇家",
    "Los Angeles Angels": "天使",
    "Los Angeles Dodgers": "道奇",
    "Miami Marlins": "馬林魚",
    "Milwaukee Brewers": "釀酒人",
    "Minnesota Twins": "雙城",
    "New York Mets": "大都會",
    "New York Yankees": "洋基",
    "Oakland Athletics": "運動家",
    "Athletics": "運動家",
    "Sacramento Athletics": "運動家",
    "Philadelphia Phillies": "費城人",
    "Pittsburgh Pirates": "海盜",
    "San Diego Padres": "教士",
    "San Francisco Giants": "巨人",
    "Seattle Mariners": "水手",
    "St. Louis Cardinals": "紅雀",
    "Tampa Bay Rays": "光芒",
    "Texas Rangers": "遊騎兵",
    "Toronto Blue Jays": "藍鳥",
    "Washington Nationals": "國民",
}


def zh_label(en_name: str, mapping: dict[str, str]) -> str:
    """回傳中文名稱；若找不到中文則回傳英文。"""
    return mapping.get(en_name, en_name)


def build_display_map(en_names: list[str], mapping: dict[str, str]) -> dict[str, str]:
    """
    建立 {顯示名稱: 英文名稱} 的字典，並按中文名稱排序。
    顯示名稱用於下拉選單，英文名稱用於後端 API 查詢。
    """
    pairs = [(zh_label(en, mapping), en) for en in en_names]
    pairs.sort(key=lambda x: (mapping.get(x[1], x[1]), x[1]))
    return dict(pairs)

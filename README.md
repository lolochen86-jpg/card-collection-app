# CardVault 個人線上卡冊

手機優先的球員卡收藏管理 Web App，支援拍照建檔、市價追蹤、收藏成本管理與社群交流。

## 功能概覽

| 頁面 | 路徑 | 說明 |
|------|------|------|
| 首頁 | `/` | 收藏總覽、快速統計、最近新增 |
| 我的卡冊 | `/collection` | 搜尋、排序、瀏覽全部收藏 |
| 新增卡片 | `/cards/new` | 四步驟精靈：照片→基本資料→取得方式→存放資訊 |
| 卡片詳情 | `/cards/[id]` | 完整卡片資訊、財務概覽、價格紀錄 |
| 編輯卡片 | `/cards/[id]/edit` | 修改所有欄位 |
| 卡價追蹤 | `/prices` | 搜尋 eBay 市價並記錄歷史 |
| 成本統計 | `/stats` | 損益分析、取得方式分佈、TOP 5 |
| 社群交流 | `/community` | 發文、按讚、留言 |
| 登入 | `/login` | Email / Google 登入 |
| 註冊 | `/register` | 建立新帳號 |

## 技術架構

```
Next.js 14 (App Router)
├── Firebase Auth        — 使用者驗證
├── Firebase Firestore   — 資料儲存
├── Firebase Storage     — 圖片儲存
├── Tailwind CSS         — 樣式
├── Zustand              — 全域狀態 (auth)
├── React Hook Form      — 表單管理
└── eBay Browse API      — 卡價查詢 (server-side proxy)
```

## Firebase 資料結構

```
users/{uid}
  email, displayName, photoURL, bio, createdAt

cards/{cardId}
  userId, player, team, year, brand, series, cardNumber, parallel
  condition (raw/PSA/BGS/SGC/CGC), grade
  images[]: { url, storagePath }
  acquisitionDate, acquisitionType, acquisitionCost
  marketValueAtAcquisition, acquisitionNotes
  storageType, storageLocation
  story, tags[], isForTrade
  createdAt, updatedAt

  cards/{cardId}/priceHistory/{priceId}
    price, currency, source, sourceUrl, recordedAt

posts/{postId}
  userId, userName, userPhotoURL
  content, images[]
  likesCount, commentsCount, createdAt

comments/{commentId}
  postId, userId, userName, userPhotoURL
  content, createdAt

likes/{postId_userId}
  postId, userId, createdAt
```

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.local.example` 為 `.env.local` 並填入你的 Firebase 設定：

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# eBay API（選填，用於卡價查詢）
EBAY_CLIENT_ID=...
EBAY_CLIENT_SECRET=...
```

### 3. Firebase 設定

在 Firebase Console：

1. **Authentication** → 啟用 Email/Password 及 Google 登入
2. **Firestore** → 建立資料庫（production mode），部署規則：
   ```bash
   firebase deploy --only firestore
   ```
3. **Storage** → 啟用，部署規則：
   ```bash
   firebase deploy --only storage
   ```

### 4. 本地開發

```bash
npm run dev
```

### 5. 部署到 Vercel

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel

# 在 Vercel Dashboard 設定環境變數（同 .env.local）
```

## 安全注意事項

- Firebase API key 以 `NEXT_PUBLIC_` 開頭是正常的；Firebase 安全性由 **Firestore Rules** 和 **Storage Rules** 控制
- eBay API 金鑰只存在 server-side（`EBAY_CLIENT_ID`、`EBAY_CLIENT_SECRET`），透過 `/api/prices/search` 路由代理，不會暴露給前端
- Firestore Rules 確保使用者只能讀寫自己的卡片資料

## 卡價查詢 API

`POST /api/prices/search`

Request body:
```json
{
  "player": "Shohei Ohtani",
  "year": 2021,
  "brand": "Topps",
  "cardNumber": "150",
  "parallel": "Refractor"
}
```

Response:
```json
{
  "price": 4800,
  "source": "eBay (近期成交均價)",
  "url": "https://www.ebay.com/..."
}
```

## 專案結構

```
src/
├── app/
│   ├── (auth)/login/        # 登入頁
│   ├── (auth)/register/     # 註冊頁
│   ├── (main)/              # 主應用（含 BottomNav）
│   │   ├── page.tsx         # 首頁
│   │   ├── collection/      # 我的卡冊
│   │   ├── cards/new/       # 新增卡片
│   │   ├── cards/[id]/      # 卡片詳情
│   │   ├── cards/[id]/edit/ # 編輯卡片
│   │   ├── prices/          # 卡價追蹤
│   │   ├── stats/           # 成本統計
│   │   └── community/       # 社群交流
│   ├── api/prices/search/   # 卡價查詢 API（server-side）
│   └── layout.tsx           # 根 layout
├── components/
│   ├── layout/              # AppShell, BottomNav
│   ├── providers/           # AuthProvider
│   └── ui/                  # Button, Input, Select, Textarea
├── lib/
│   ├── firebase.ts          # Firebase 初始化
│   ├── firestore.ts         # Firestore CRUD helpers
│   ├── storage.ts           # Storage upload helpers
│   └── utils.ts             # 工具函式、常數
├── store/
│   └── authStore.ts         # Zustand auth store
└── types/
    └── index.ts             # TypeScript 型別定義
```

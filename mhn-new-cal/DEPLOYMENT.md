# 部署指南 (分離前端與後端)

本專案已支援前端（UI介面）與後端（武器計算核心邏輯）分離。

## 1. 部署計算核心到 Cloudflare Workers

由於計算公式包含許多細節，部署到 Cloudflare Workers 能確保高效能、無延遲以及跨設備統一的計算結果。

### 建立 Cloudflare Worker 步驟：
1. 登入 Cloudflare，在側邊欄選擇 **Workers & Pages** -> **Create application** -> **Create Worker**。
2. 替您的 Worker 命名（例如：`mhn-calc-api`）並點擊 **Deploy**。
3. 點擊 **Edit code**，將以下代碼覆蓋 `worker.js` (或 `index.js`) 內的內容：

```javascript
// ====== 將 src/data/constants.ts 與 src/data/skills.ts 以及 src/utils/calculator.ts 內的邏輯合併到這裡 ======
// 為了便於 Cloudflare 部署，建議您使用打包工具 (如 esbuild) 將伺服器端代碼包裝，或直接部署整個專案。
// 在專案底下的 `server.ts` 提供了一個完整的伺服器端點 `/api/calculate`，
// 它接受前端傳來的 JSON 請求： { inputs, selectedSkills, hhBuffsArray } 並回傳計算結果。
```

**最簡單的 Cloudflare Workers 部署方式 (透過 Wrangler)：**
1. 在本地安裝 Wrangler：`npm install -g wrangler`
2. 建立新資料夾並初始化：`wrangler init mhn-calc-worker`
3. 將本專案的 `src/utils/calculator.ts` 及 `src/data/*` 複製過去。
4. 在 Worker 的主要進入點 (如 `src/index.ts`) 中撰寫接收 `POST` 請求到 `/api/calculate` 的邏輯，並回傳 `calculateDamage` 的執行結果。
5. 設定好 CORS 標頭，允許 `https://您的github-pages-url` 存取。
6. 輸入 `wrangler deploy` 部署。

## 2. 部署前端到 GitHub Pages

1. 打開 `src/App.tsx`，找到 `fetch` 呼叫 API 的段落 (大約第 80 行)：
   \`\`\`javascript
   const apiUrl = process.env.NODE_ENV === 'development' 
        ? '/api/calculate' 
        : 'https://您的-cloudflare-worker-網址.workers.dev/api/calculate';
   \`\`\`
2. 將網址替換為您在第 1 步取得的 Cloudflare Worker 網址。
3. 執行 `npm run build`，這會編譯出 `dist/` 目錄。
4. 將 `dist/` 目錄內的檔案推送到 GitHub 儲存庫的 `gh-pages` 分支（或開啟 GitHub Pages 設定指向您的存放區）。

## 3. 開發模式整合

在目前的 AI Studio 環境中，為了讓您可以直接預覽，專案採用 `Express + Vite Middleware` 的全端架構。
開發(Dev)時會自動代理 `/api/calculate` 到同一台機器上的 Node.js 伺服器，因此在開發環境中您隨時可以看到即時的計算結果，也不會有 CORS 的問題。

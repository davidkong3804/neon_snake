# CYBER SNAKE // 霓虹科幻貪食蛇

一個精美、現代、霓虹科幻風格的網頁版貪食蛇遊戲。後端基於 Node.js (Express)，前端使用 HTML5 Canvas、Vanilla CSS 及原生 JavaScript 開發。

本遊戲已完成 **GitHub Pages 靜態託管優化**，並整合了 **CI/CD 自動化測試與部署**。當沒有 Node.js 後端伺服器時，遊戲會自動啟用 `localStorage` 離線本地排行榜，完美支援在 GitHub Pages 順利遊玩與保存紀錄！

---

## 🎮 遊戲特色

1. 🤖 **智慧型時間維度 BFS 自動導航 AI (Time-Based BFS & Tail Chaser)**：
   - **時間維度尋路**：不同於傳統靜態 A*/BFS 演算法（常因誤判靜態身體阻擋而導致蛇原地打轉），AI 尋路採用時間維度 BFS，能精確預測蛇身體節點隨時間前進的「消散時間」，完美利用蛇身空出來的格子進行穿插尋路。
   - **虛擬吃食模擬 (Virtual Sim)**：AI 找到前往食物的最佳路徑後，會先在記憶體中模擬移動並「吃掉」食物。接著，確認長度 +1 的虛擬蛇頭是否依然能透過路徑安全連回虛擬蛇尾。唯有在確認 100% 不會困死自己的情況下，才會執行吃食動作。
   - **空間最大化追尾 (Space-Maximizing Tail Chase)**：若通往食物的路徑暫時不安全，蛇會主動進入「追尾生存模式」，計算能到達蛇尾的鄰近格子，並使用洪流演算法 (Flood Fill) 優先選擇可達空間最大的方向，盤旋等待吃食時機。
   - **手動覆蓋 (Manual Override)**：開啟自動導航後，玩家隨時按下 W/A/S/D 或方向鍵即可接管控制，AI 將自動關閉。

2. 🚀 **極致效能優化 (CPU/GPU 資源節約)**：
   - **硬體加速背景**：將原本導致 CPU/GPU 滿載 80%+ 的全螢幕 `background-position` CSS 網格動畫，改為使用 GPU 專用的 `transform: translate3d()` 與 `will-change: transform` 進行圖層硬體加速，大幅降至 1% 以下。
   - **Canvas 霓虹發光優化**：將耗費大量 GPU 像素渲染的 Canvas `shadowBlur` 霓虹發光特效限制在「蛇頭」和「食物」上，身體部分則採用流暢的漸層色彩渲染，避免百節蛇身同時進行高斯模糊的渲染瓶頸。

3. 🔊 **純程式碼音效合成 (Web Audio API)**：
   - 完全使用 Web Audio API 在瀏覽器中動態合成吃食物、金幣、減速與死亡的街機風復古音效，無須載入任何外部音訊資源。

4. 🏆 **雙模排行榜 (Server API + LocalStorage)**：
   - **Node.js 模式**：執行 Node.js 伺服器時，自動使用 Express API 保存分數至本機 `scores.json`。
   - **靜態網頁模式 (GitHub Pages)**：無後端時自動啟用 `localStorage` 排行榜，依然可以挑戰前 10 名分數紀錄！

---

## 🛠️ 執行與開發說明

### 1. 安裝依賴
確保已安裝 Node.js，然後在專案根目錄下執行：
```bash
npm install
```

### 2. 本地測試 (Automated Tests)
執行自動化測試，驗證尋路與 AI 模擬是否正常：
```bash
npm test
```
該測試將會使用模擬 DOM 環境，並執行 200 步的 AI 自主尋路演算法以確保 AI 不會自殺或卡死。

### 3. 啟動本地伺服器
執行以下指令啟動本地 Node.js 伺服器：
```bash
npm start
```
在瀏覽器中開啟 [http://localhost:8000](http://localhost:8000) 即可遊玩！

### 4. 靜態部署 (GitHub Pages)
直接將 `public/` 資料夾下的檔案部署至靜態網頁託管服務（例如 GitHub Pages、Vercel 或 Netlify）即可運行。

---

## 🚀 CI/CD 自動化部署

專案中已配置 GitHub Actions 工作流於 `.github/workflows/deploy.yml`。當您將代碼推送到 `main` 分支時，它會自動：
1. 執行 `npm test` 進行 AI 尋路防撞與安全檢測。
2. 測試通過後，自動將 `public/` 目錄編譯並發布至 `gh-pages` 分支。
3. 您的 GitHub Pages 網頁將自動更新並提供上線遊玩！

---

## 📂 專案結構

```text
├── .github/workflows/
│   └── deploy.yml     # CI/CD 自動化測試與 Pages 部署工作流
├── test/
│   └── ai.test.js     # AI 尋路演算法防撞單元與模擬測試
├── server.js          # Express 伺服器 (靜態託管與排行榜 API)
├── package.json       # Node.js 專案設定與指令定義
├── scores.json        # 排行榜持久化資料 (Node 模式自動生成)
└── public/
    ├── index.html     # 前端遊戲主畫面
    ├── style.css      # 響應式霓虹 Cyberpunk 主題樣式 (GPU 優化)
    └── game.js        # 遊戲主邏輯與智慧型 AI 尋路尋尾 (Canvas 渲染)
```

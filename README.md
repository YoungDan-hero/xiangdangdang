# 响当当 🎀

为响响记录喂养与成长的本地优先 App。数据全部保存在手机本地（IndexedDB），仅 AI 助手会联网调用 DeepSeek。

## 功能

- **今日看板**：今日喂养次数、总奶量、距上次喂养时长，一键快捷记录
- **喂养记录**：母乳 / 配方奶 / 混合 / 辅食，母乳亲喂支持计时器，支持增删改
- **生长曲线**：身长 / 体重 / 头围，动态叠加 WHO 女童 0–24 月标准百分位（P3/P15/P50/P85/P97），自动评估所处区间
- **AI 育儿助手**：DeepSeek 对话，自动携带响响的真实数据作为上下文
- **数据备份**：一键导出 JSON

## 技术栈

Vite + React 18 + TypeScript（严格模式）· Dexie(IndexedDB) · ECharts · React Router · Capacitor(Android)

## 开发

```bash
npm install
npm run dev      # 浏览器调试 http://localhost:5173
npm run build    # 类型检查 + 生产构建到 dist/
```

## 打包安卓 APK

需先安装 [Android Studio](https://developer.android.com/studio)（含 Android SDK / JDK 17）。

```bash
npm run cap:sync   # 构建 web 并同步到 android 工程
npm run cap:open   # 用 Android Studio 打开
```

在 Android Studio 中：`Build → Build Bundle(s)/APK(s) → Build APK(s)`，
生成的 APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`，传到手机安装即可。

或命令行直接打 debug 包：

```bash
npm run cap:sync
cd android && ./gradlew assembleDebug
```

## 使用前配置

首次打开进入「设置」：

1. 填写响响的**出生日期**（生长曲线按月龄对照百分位所必需）
2. 填写 **DeepSeek API Key**（在 https://platform.deepseek.com/api_keys 获取），仅存本机

## WHO 数据来源

`src/data/whoGrowth.ts` 由 `scripts/genGrowth.mjs` 依据 WHO Child Growth Standards 2006 女童 LMS 参数换算生成，请勿手改。

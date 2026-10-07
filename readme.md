# 🏴‍☠️ 海贼王·伟大航路卡牌对战（One Piece Card Battle）

一款以《海贼王》为主题、参考游戏王式回合制卡牌对战的**纯前端 H5 手机网页游戏**。
iPhone Safari / 安卓 Chrome 打开链接即玩，无需安装、无需服务器，进度自动保存在手机本地。

> ⚠️ 本项目为**非商业同人学习项目**，One Piece 相关名称与角色版权归尾田荣一郎/集英社/东映动画所有。

---

## 🎮 玩法一览

| 模式 | 说明 |
|---|---|
| 🗺 冒险模式 | 按原著剧情顺序闯关：东海 → 双子岬 → 阿拉巴斯坦 → 空岛 → 司法岛 → 恐怖三桅帆船 → 推进城/顶上战争 → 鱼人岛 → 德雷斯罗萨 → 和之国（11 章 27 关），逐关解锁不可跳关 |
| ⚔ 对战模式 | 用自己的卡组挑战 AI，简单 / 普通 / 困难三档，困难档全 BOSS 级卡池 |
| 🗂 卡组编辑 | 15 张卡组，同名卡最多 3 张，人物 + 装备自由搭配 |
| 📚 卡牌图鉴 | 60 人物卡 + 13 装备卡收集进度、稀有度筛选 |
| 🎁 商店抽卡 | 普通/高级召唤，40 抽保底 SSR+；SSS 主要靠冒险完美通关获取 |
| 📒 获得台账 | 每张卡的获得/消耗记录，可导出存档备份 |

### 核心战斗规则（游戏王式移动端简化）

- **双方船长** 各 100 HP（敌方按关卡配置），清空敌方场上单位后可直接攻击船长，船长 HP 归零判负
- **能量**：每回合 +3（冒险模式敌方 +2），召唤/装备/技能消耗能量
- **人物卡**：攻/防/生命三围；每回合可攻击一次；**主动技能**手动发动（耗能+冷却），**被动技能**自动触发（光环/复活/狂化等）
- **装备卡**：武器/防具/饰品各 1 件，属性加成 + 专属被动（如阎魔：攻击无视 30% 防御但自伤 4 点）
- **异常状态**：灼烧/中毒（持续伤害）、眩晕/冰冻/束缚（跳过行动）、封印（禁技能）
- **满血/满积分完美通关** → 额外获得 1 张 **SSS 级卡**（每个关卡独立判定）
- 战斗中刷新/切后台自动保存，回来可继续；40 回合未分胜负按船长血量比判定

### 卡牌稀有度

`N → R → SR → SSR → SSS`（最高）。SSS 卡（路飞五档、白胡子、凯多、红发等 15 张）只能通过冒险模式完美通关或终局关卡奖励获取。

---

## 📱 手机上玩（两种方式）

### 方式一：GitHub Pages 在线玩（推荐）

1. 把本仓库推到你的 GitHub 账号
2. 仓库 Settings → Pages → Source 选 `main` 分支 `/ (root)` → Save
3. 等 1~2 分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`
4. 把链接发到微信/QQ，手机点开即玩（建议加到主屏幕，全屏体验更好）

### 方式二：本地局域网试玩

Windows 双击 `serve-local.bat`（或手动：`npx serve .`），手机连同一 Wi-Fi，访问控制台显示的局域网地址。
也可直接双击 `index.html` 用浏览器打开（file:// 协议同样可玩，存档保存在浏览器 localStorage）。

> ⚠️ 微信内打开可能受限，请点击右上角"在浏览器中打开"。iPhone Safari 顶部地址栏下拉可隐藏工具栏。

---

## 🛠 本地开发与测试

```bash
# 无需安装任何依赖（零依赖纯原生 JS）
# 回归测试（Node 16+）
node tests/run-tests.js      # 40 项规则回归 + 全剧情模拟通关
node tests/sim-balance.js    # 平衡矩阵：不同卡组强度 × 关卡胜率
```

### 目录结构

```
onepiece-card-game/
├── index.html              # 入口（唯一页面）
├── css/style.css           # 全部样式（移动端优先）
├── js/
│   ├── data/cards.js       # ★ 卡牌数据库（60 人物 + 13 装备 + 技能 DSL）
│   ├── data/chapters.js    # ★ 剧情章节/关卡/波次/奖励/难度曲线
│   ├── engine/engine.js    # 战斗引擎（纯数据可序列化，支持中断恢复）
│   ├── engine/ai.js        # AI 对手（三档难度 × 六种策略风格）
│   ├── save.js             # 存档（localStorage + 双备份 + 台账 + 导出导入）
│   ├── assets.js           # 占位卡面生成器（悬赏令风 SVG）
│   └── ui.js               # 界面控制（屏幕路由/战斗交互/图鉴/抽卡）
├── tests/run-tests.js      # 回归测试
├── tests/sim-balance.js    # 平衡模拟
├── tests/lib-sim.js        # 模拟器共享库
├── assets/cards/           # 真实卡面图片放这里（见下方换图说明）
├── publish.bat             # 一键发布 GitHub Pages
└── serve-local.bat         # 本地局域网试玩
```

---

## 🎨 数值调整指南（改这两个文件就够）

### 改卡牌数值 → `js/data/cards.js`

```js
{ id:'luffy_gear5', name:'路飞·五档', rarity:'SSS', cost:8, atk:62, def:38, hp:150,
  skill:{ type:'active', energy:3, cd:2, effects:[ {type:'aoeDamage', value:22}, ... ] } }
```

- `cost` 召唤费用 / `atk` `def` `hp` 三围
- 主动技能 `energy` 耗能、`cd` 冷却、`effects` 效果数组
- 常用效果类型：`damage`（单体）/ `aoeDamage`（全体）/ `dot`（灼烧中毒）/ `debuff`（控制）/ `heal` / `shield` / `draw` / `selfBuff` / `permBuff` / `summonToken` / `statSteal` / `drain` 等，引擎里 `applyEffect` 有完整实现可参考

### 改关卡难度 → `js/data/chapters.js`

每关 4 个杠杆：

| 字段 | 作用 |
|---|---|
| `scale` | 敌方卡牌属性倍率（1.0=与玩家同强度，终局约 1.05~1.15） |
| `enemyHp` | 敌方船长血量（决定"斩杀线"） |
| `waves` | 两波敌人：`[小弟×2] → [BOSS+随从]`，BOSS 只出现一次 |
| `enemyStrategy` | AI 风格：aggro 进攻 / control 控制 / turtle 龟缩 / boss 均衡 / summon 召唤 / tanky 反伤 |

**调难度守则**（经过 40 轮平衡模拟验证）：
- 前中期（ch1~ch6）scale 0.85~1.16：新手卡组可稳步推进
- 后期（ch7~ch9）scale 1.15~1.23：需要中期卡组（SR/SSR 主力）
- 终局（ch10）scale 1.05~1.07 + BOSS 卡本身高基础值：需要通关练度 + SSS 卡
- 改完务必跑 `node tests/run-tests.js` 确认 40 项全过、全剧情仍可通关

---

## 🖼 换成真实海贼王图片（等爬图到位后）

1. 把图片放到 `assets/cards/` 目录，**文件名 = 卡牌 ID**（如 `luffy_gear5.jpg`、`zoro_enma.png`）
2. 支持 jpg / png / webp，建议 300×420 竖版、单张 ≤ 200KB（手机流量友好）
3. 放进去即自动生效——`assets.js` 优先加载真实图片，没有的卡继续用程序生成的悬赏令风占位图
4. 完整 ID 清单见 [`CARD_ART_REPLACEMENT.md`](CARD_ART_REPLACEMENT.md)，照着改名即可逐张替换

---

## 🚀 发布到 GitHub Pages

**方法一：脚本一键发布**

```bat
publish.bat <你的GitHub用户名> <仓库名>
```

（首次会让你登录 Git 凭据；需要仓库已建好且为空）

**方法二：GitHub 网页操作（最简单）**

1. GitHub 上 New repository（公开、不要初始化 README）
2. 本目录打开终端：
   ```bash
   git init -b main
   git add .
   git commit -m "海贼王卡牌对战 v1.0"
   git tag v1.0
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main --tags
   ```
3. 仓库 Settings → Pages → Source: `main` / `(root)` → Save
4. 1~2 分钟后打开 `https://<用户名>.github.io/<仓库名>/`

### 版本回滚

每个里程碑都打了 git tag（v1.0、v1.1…）。线上出问题时：

```bash
git checkout v1.0 -- . && git commit -m "rollback to v1.0" && git push
```

Pages 自动重新部署，链接不变、立即可玩。

---

## 💾 存档说明

- 进度/卡牌/金币存在浏览器 **localStorage**（换浏览器/清缓存会丢）
- **设置 → 导出存档**：生成 Base64 码，存到备忘录即可跨设备迁移
- **导入存档**：粘贴代码一键恢复
- 存档每次写入前自动备份，损坏时自动回滚到上一版并提示
- 战斗中刷新/闪退：重进游戏首页点"继续中断的战斗"

---

## ✅ 质量验证记录

- `tests/run-tests.js`：**40/40 通过**——含召唤/攻击/技能/装备/波次/胜负判定/SSS 奖励发放/存档回滚/RNG 确定性/全剧情 27 关模拟通关
- `tests/sim-balance.js`：平衡矩阵——新手卡组通前中期 12/12，真实曲线卡组 ch7 10/10、ch9 8/10，终局 ch10 保持 25~40% 胜率（练度挑战区）
- 中断恢复：战斗中刷新 → 自动恢复（引擎状态全量可序列化）
- 存档破坏演练：主档写坏 → 自动回滚备份档

## 🐛 已知限制

- 对战模式为单机 AI（实时联机需要后端，超出静态托管能力）
- 60张人物卡已接入官方TCG卡图（tools/map-art.js 自动管线，重跑即可更新）；13张装备卡仍用程序生成器物卡面
- 首版仅简体中文

## 📄 License

MIT（代码部分）。角色与名称版权归原作方，本项目仅作学习交流。

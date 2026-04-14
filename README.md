# OnlineGames 🎮

极简、高可扩展的**实时多人在线棋牌游戏平台** - 为朋友间娱乐而生。

## 🎯 项目初衷

- **极简理念**：摒弃冗繁，只做核心功能
- **快速部署**：一键启动，朋友圈分享链接（Pinggy）
- **无缝扩展**：新游戏接入只需新增目录，无需改核心代码
- **实时交互**：WebSocket 双向通信，毫秒级延迟

---

## 🏗️ 项目结构
```
OnlineGames/
├── README.md                  # 项目总览
├── ADD_NEW_GAME.md            # 添加新游戏完全指南
│
├── games/                     # ===== 游戏目录 =====
│   ├── treasure-hunt/         # 游戏1：寻宝之战
│   │   ├── gameSpec.json      # 游戏元数据
│   │   ├── README.md          # 游戏规则文档
│   │   ├── backend/           # 后端逻辑
│   │   │   ├── engine.js      # 核心游戏引擎
│   │   │   ├── constants.js   # 游戏常数
│   │   │   └── validator.js   # 验证规则
│   │   └── frontend/          # 前端组件
│   │       ├── Board.jsx      # 主游戏组件
│   │       ├── Cell.jsx       # 棋盘格子
│   │       ├── hooks.js       # 游戏逻辑 hooks
│   │       ├── constants.js   # 样式常数（可选）
│   │       └── index.js       # 导出入口
│   │
│   └── [新游戏]/              # 游戏2、3... 按相同结构添加
│
├── shared/                    # ===== 前后端共享代码 =====
│   ├── constants.js           # 全局常数（事件、阶段等）
│   ├── events.js              # 事件定义
│   ├── types.js               # JSDoc 类型定义
│   ├── validators.js          # 验证函数库
│   └── game-registry.js       # ✨ 游戏注册表（新增）
│
└── platform/                  # ===== 平台核心代码 =====
    ├── server/                # 后端：Express + Socket.io
    │   ├── src/
    │   │   ├── index.js       # 服务器入口 + Socket 事件
    │   │   ├── core/
    │   │   │   ├── GameDispatcher.js # 游戏路由分发器
    │   │   │   ├── RoomManager.js    # 房间管理
    │   │   │   └── socketToRoom.js   # Socket-房间映射
    │   │   ├── middlewares/
    │   │   │   └── auth.js
    │   │   └── utils/
    │   │       ├── logger.js
    │   │       └── socket-error.js
    │   ├── package.json
    │   └── public/
    │       └── index.html
    │
    └── web/                   # 前端：React + Vite + Tailwind
        ├── src/
        │   ├── App.jsx        # 应用主组件
        │   ├── main.jsx       # 入口点
        │   ├── pages/         # 路由页面
        │   │   ├── Lobby.jsx      # 游戏列表大厅
        │   │   ├── GameMenu.jsx   # 加入/创建房间
        │   │   ├── Room.jsx       # 房间等待大厅
        │   │   ├── Game.jsx       # 游戏路由（动态加载）
        │   │   └── GameRules.jsx  # 游戏规则说明
        │   ├── services/
        │   │   ├── socket.js      # Socket.io 客户端配置
        │   │   └── game-api.js    # 游戏 API 封装
        │   ├── hooks/         # 自定义 Hooks
        │   │   ├── useSocket.js
        │   │   ├── useRoom.js
        │   │   └── useGame.js
        │   ├── store/         # 状态管理（预留 Zustand）
        │   ├── constants/     # UI 常数
        │   ├── lib/           # 工具函数
        │   └── assets/
        ├── package.json
        ├── vite.config.js
        ├── tailwind.config.js
        └── index.html
```

---

## 🎮 当前游戏

| 游戏 | 路径 | 状态 | 玩家数 | 说明 |
|------|------|------|--------|------|
| 寻宝之战 | `games/treasure-hunt/` | ✅ 可玩 | 2-3人 | 回合制棋盘策略 |

---

## 🚀 快速启动

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装与启动

```bash
# 1. 安装服务器依赖
cd platform/server
npm install

# 2. 安装前端依赖
cd ../web
npm install

# 3. 启动服务器（终端1）
cd ../server
npm run dev
# 监听 http://localhost:3000

# 4. 启动前端开发服务器（终端2）
cd ../web
npm run dev
# 开启 http://localhost:5173
```

### 部署到Pinggy

```bash
# 方式1：与 localhost:3000 建立隧道
ssh -R 80:localhost:3000 -R 443:localhost:3000 a.pinggy.io

# 方式2：使用 Pinggy CLI
npm install -g @pinggy/cli
pinggy http://localhost:5173
```

复制生成的链接发送给朋友即可！

## 架构设计

### 后端架构（Node.js + Socket.io）

```text
Socket 连接
    ↓
index.js (事件监听)
    ├─ JOIN_OR_CREATE_ROOM      → RoomManager（房间管理）
    ├─ START_GAME               → RoomManager + GameDispatcher
    ├─ GAME_ACTION              → GameDispatcher（游戏分发）
    │   └─ treasure_hunt/engine.js（游戏逻辑）
    ├─ CHAT_MESSAGE
    └─ disconnect
    
返回：广播 GAME_STATE_UPDATED 到房间所有客户端
```

### 前端架构（React + Vite）

```text
App.jsx (4个视图状态)
    ├─ Lobby.jsx        (游戏选择) → 使用 GAME_REGISTRY
    ├─ GameMenu.jsx     (加入房间)
    ├─ Room.jsx         (等待开始)
    └─ Game.jsx         (游戏容器) → 动态加载游戏组件
         └─ TreasureHuntBoard.jsx / [其他游戏组件]
```

### 共享层（前后端通信）

| 文件 | 职责 |
|------|------|
| constants.js | 游戏类型、房间状态、阶段定义 |
| events.js | Socket 事件名定义 |
| types.js | JSDoc 类型定义（为代码补全做准备） |
| shared/game-registry.js | ✨ 游戏动态注册表（新增核心） |

## 核心特性

### 1. 游戏隔离与可组合性

每个游戏独立目录：games/[游戏名]/backend/ + games/[游戏名]/frontend/

后端引擎标准接口：initializeGame() + processAction()

前端组件标准导出：默认导出游戏 Board 组件

游戏元数据独立：gameSpec.json 定义游戏特性

### 2. 动态加载机制

后端：GameDispatcher 在启动时自动扫描 GAME_REGISTRY 加载引擎

前端：Game.jsx 使用 React.lazy() 动态导入游戏组件

### 3. 无硬编码设计

新增游戏只需修改 shared/game-registry.js，无需改 Game.jsx

新增游戏只需在 games/[游戏名]/ 创建目录，无需改核心代码

## 📝 添加新游戏

请参考 [ADD_NEW_GAME.md](./ADD_NEW_GAME.md) 文档，了解如何添加新游戏。

## 项目约定

| 约定 | 说明 |
|------|------|
| 游戏ID | 使用 snake_case（如 treasure_hunt） |
| 组件命名 | 使用 PascalCase（如 TreasureHuntBoard.jsx） |
| 常量命名 | 使用 UPPER_CASE（如 TREASURE_HUNT_SIZE） |
| 事件命名 | 使用 UPPER_SNAKE_CASE（如 GAME_STATE_UPDATED） |
| 导入路径 | 后端用相对路径，前端优先使用相对路径 |

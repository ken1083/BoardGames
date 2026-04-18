# 部署 & 迁移指南

> React + Vite + Node.js + Socket.io 多人游戏项目

---

## 目录

1. [总览](#总览)
2. [必改：部署最小改动](#必改部署最小改动)
3. [Part 1：URL Routing](#part-1url-routing)
4. [Part 2：断线重连](#part-2断线重连)
5. [Part 3：服务端改动](#part-3服务端改动)
6. [Part 4：部署配置](#part-4部署配置)
7. [平台选择](#平台选择)

---

## 总览

### 建议顺序

先做 **URL Routing**，再做**断线重连**——有了 URL，roomCode 自然在地址栏里，断线重连逻辑会简单很多。

### URL 结构

```
/            → Lobby
/<gameName>        → GameMenu（起名选游戏）
/<gameName>/:code  → Room（等待室）
/<gameName>/:code/play  → InGame（游戏中）
```

### 刷新行为对比

| 阶段 | 刷新后结果 |
|---|---|
| 现在 | 回 Lobby，state 清空，socket 断 |
| 加 routing 后 | 留在 `/room/ABC123`，但 state 丢失 |
| 两个都加后 | 自动 rejoin，恢复完整游戏状态 |

### 改动量估计

| 改动 | 涉及范围 | 估计时间 |
|---|---|---|
| URL Routing | 前端 App.jsx + 各 screen | 3–5 小时 |
| 断线重连 | 前端 + 服务端 | 2–4 小时 |
| 部署最小改动 | 10 行代码 | 30 分钟 |

---

## 必改：部署最小改动

上线前**必须**做的两件事，改动约 10 行。

### 1. 前端 socket URL 改成环境变量

```js
// .env.development
VITE_SOCKET_URL=http://localhost:3000

// .env.production
VITE_SOCKET_URL=https://your-backend.railway.app
```

```js
// 代码里（替换原来的 hardcode）
const socket = io(import.meta.env.VITE_SOCKET_URL)
```

### 2. 后端加 CORS

```js
const io = new Server(server, {
  cors: {
    origin: "https://your-frontend.vercel.app",
    methods: ["GET", "POST"]
  }
})
```

> ⚠️ 前端是 `https://`，后端也必须是 `https://`，否则浏览器会拦截（Mixed Content 错误）。

---

## Part 1：URL Routing

**约 3–5 小时**

### Step 1 — 安装

```bash
npm install react-router-dom
```

### Step 2 — main.jsx 包一层 BrowserRouter

```jsx
import { BrowserRouter } from 'react-router-dom'

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
```

### Step 3 — App.jsx 核心改动

```jsx
// 删掉旧的：
// const [screen, setScreen] = useState('lobby')
// if (screen === 'lobby') return <Lobby />
// if (screen === 'menu')  return <GameMenu />
// ...

// 换成：
import { Routes, Route, Navigate } from 'react-router-dom'

export default function App() {
  return (
    <Routes>
      <Route path="/"           element={<Lobby />} />
      <Route path=`/${gameName}`       element={<GameMenu />} />
      <Route path=`/${gameName}/:code` element={<Room />} />
      <Route path=`/${gameName}/:code/play` element={<InGame />} />
      <Route path="*"           element={<Navigate to="/" />} />
    </Routes>
  )
}
```

### Step 4 — 各 screen 换掉 setScreen

```jsx
import { useNavigate, useParams } from 'react-router-dom'

// 旧：setScreen('menu')
// 新：
const navigate = useNavigate()
navigate(`/${gameName}`)
navigate(`/${gameName}/${roomCode}`)  // 进房间
navigate('/')                  // 回 lobby

// Room / InGame 里读 roomCode
const { code } = useParams()
```

### Step 5 — socket 改成单例

socket 要跨 route 共享，不能每个 screen 各自 `io()`。

```js
// src/socket.js
import { io } from 'socket.io-client'

export const socket = io(import.meta.env.VITE_SOCKET_URL, {
  autoConnect: false  // 手动 connect，避免进来就连
})
```

```js
// Lobby.jsx — 点开始游戏再连
import { socket } from '../socket'
socket.connect()
```

---

## Part 2：断线重连

**约 2–4 小时**

### Step 1 — 生成持久 playerId

```js
// src/identity.js
export function getPlayerId() {
  let id = localStorage.getItem('playerId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('playerId', id)
  }
  return id
}
```

### Step 2 — socket 连线时带上 playerId

```js
// src/socket.js
import { io } from 'socket.io-client'
import { getPlayerId } from './identity'

export const socket = io(import.meta.env.VITE_SOCKET_URL, {
  autoConnect: false,
  auth: { playerId: getPlayerId() }
})
```

### Step 3 — Room / InGame 加 rejoin 逻辑

有了 URL routing，roomCode 直接从 `useParams` 拿，不需要另存 localStorage。

```jsx
// Room.jsx（InGame 同理）
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../socket'
import { getPlayerId } from '../identity'

function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])

  useEffect(() => {
    if (!socket.connected) socket.connect()

    // 每次进入（包括刷新后）都尝试 rejoin
    socket.emit('rejoin', {
      playerId: getPlayerId(),
      roomCode: code
    })

    socket.on('state_sync', (gameState) => {
      setPlayers(gameState.players)
      // ... 其他状态
    })

    socket.on('rejoin_failed', () => {
      navigate('/')  // 房间不存在，回 lobby
    })

    return () => {
      socket.off('state_sync')
      socket.off('rejoin_failed')
    }
  }, [code])

  // ... 正常渲染
}
```

> ⚠️ `state_sync` 要包含**完整游戏状态**（手牌、轮次、所有玩家分数等），服务端需要把整个 `room.gameState` 序列化推回来。

---

## Part 3：服务端改动

### rooms 数据结构升级

```js
// 旧
rooms['ABC'] = { gameState: { ... } }

// 新 — 加 playerIds 映射
rooms['ABC'] = {
  gameState: { ... },
  playerIds: {
    'uuid-alice': { seat: 0, name: 'Alice' },
    'uuid-bob':   { seat: 1, name: 'Bob'   }
  }
}
```

### 加 rejoin 事件处理

```js
const playerSockets = {}  // playerId → socket.id（可选，用于判断是否在线）

io.on('connection', (socket) => {
  const { playerId } = socket.handshake.auth
  playerSockets[playerId] = socket.id

  socket.on('rejoin', ({ playerId, roomCode }) => {
    const room = rooms[roomCode]

    if (!room || !room.playerIds[playerId]) {
      socket.emit('rejoin_failed')
      return
    }

    socket.join(roomCode)
    socket.emit('state_sync', room.gameState)
    // 告知房间其他人"XX 回来了"
    socket.to(roomCode).emit('player_reconnected', { playerId })
  })

  socket.on('disconnect', () => {
    delete playerSockets[playerId]
    // 建议：不立即删房间，设 setTimeout 60s 后再清理
    // 这样玩家有时间重连
  })
})
```

> ✅ 服务端改动集中在一个地方，不需要动其他游戏逻辑。

---

## Part 4：部署配置

有了 React Router，`/room/ABC123` 刷新会直接 404，需要告诉托管平台把所有路径都返回 `index.html`。这是**最容易漏掉**的一步。

### Vercel

在项目根目录创建 `vercel.json`：

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Netlify

在 `public/` 目录创建 `_redirects` 文件：

```
/*  /index.html  200
```

### Cloudflare Pages

Settings → Builds → Functions → 勾选 **SPA mode**，自动处理，无需配置文件。

---

## 平台选择

推荐组合：**前端 Vercel + 后端 Railway**，两个都免费，部署简单。

### 前端静态托管

| 平台 | 特点 |
|---|---|
| **Vercel**（推荐） | 连 GitHub 自动部署，全球 CDN，环境变量直接在 dashboard 配 |
| Netlify | 和 Vercel 类似，免费额度够个人项目 |
| Cloudflare Pages | 免费额度最大，速度快，配置略复杂 |
| GitHub Pages | 最简单，但不支持环境变量注入 |

### 后端 Node.js 服务

| 平台 | 特点 |
|---|---|
| **Railway**（推荐） | 自动检测 Node.js，GitHub 推送即部署，HTTPS 自动配 |
| Render | 和 Railway 类似，免费版冷启动较慢（~50s） |
| Fly.io | Docker 部署，控制力强，延迟低 |
| VPS（DigitalOcean / Hetzner） | ~$5/月，完全控制，需自配 Nginx + SSL + PM2 |

> **冷启动问题**：Render / Railway 免费版一段时间无请求后会休眠。可用 [UptimeRobot](https://uptimerobot.com) 每 5 分钟 ping 一次保持活跃。

---

## 推进顺序建议

```
1. socket.js 改成单例            （独立，可先做）
2. 加 .env + CORS               （10 分钟，必做）
3. main.jsx + App.jsx 接路由     （可单独测试）
4. 各 screen 换 navigate         （逐个替换）
5. identity.js + rejoin 逻辑     （前后端一起做）
6. 部署平台配置                   （最后）
```

每一步都可以独立测试，不需要一次改完。

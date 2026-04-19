# Frontend Architecture Plan — Multi-Game Platform

## 现状

```
platform/web/src/pages/Game.jsx          ← 路由器
games/treasure-hunt/frontend/Board.jsx
games/treasure-hunt/frontend/Cell.jsx
games/treasure-hunt/frontend/...
```

---

## 目标结构

```
platform/web/src/
│
├── pages/
│   └── Game.jsx                         ← 不变，动态路由器
│
├── shared/
│   └── components/
│       ├── Avatar.jsx                   ← 玩家头像（颜色圆圈 + 名字）
│       ├── Timer.jsx                    ← 倒计时组件
│       ├── Modal.jsx                    ← 通用弹窗
│       ├── Toast.jsx                    ← 通知提示
│       └── Badge.jsx                   ← 标签/徽章（如"房主"）
│
└── game-shell/
    ├── GameLayout.jsx                   ← 整体布局容器
    ├── GameHeader.jsx                   ← 顶部栏（left/center/right slots）
    ├── PlayerPanel.jsx                  ← 玩家面板骨架（+ renderPlayerDetail 插槽）
    ├── ActionBar.jsx                    ← 底部操作区骨架
    ├── TurnIndicator.jsx                ← 回合指示器
    └── GameOverOverlay.jsx              ← 游戏结束遮罩

games/
├── treasure-hunt/
│   └── frontend/
│       ├── TreasureHuntGame.jsx         ← 游戏主组件（组装所有层）
│       ├── Board.jsx                    ← 私有
│       ├── Cell.jsx                     ← 私有
│       ├── SetupPanel.jsx               ← 私有（战前准备）
│       ├── TreasureHints.jsx            ← 私有（玩家面板插槽内容）
│       └── theme.js                     ← 私有
│
└── {future-game}/
    └── frontend/
        ├── {FutureGame}Game.jsx
        └── ...
```

---

## 三层职责说明

### 层一：`shared/components/` — 零游戏知识

跨游戏完全复用，对游戏逻辑一无所知，纯 UI 原子组件。

| 组件 | 职责 |
|---|---|
| `Avatar.jsx` | 玩家头像，接受 `color` / `name` prop |
| `Timer.jsx` | 倒计时，接受 `seconds` / `onExpire` prop |
| `Modal.jsx` | 弹窗容器，接受 `title` / `children` / `onClose` |
| `Toast.jsx` | 短暂通知，接受 `message` / `type` |
| `Badge.jsx` | 小标签，如"房主" / "断线中" |

**原则：** 这些组件里永远不会出现任何游戏名、游戏状态字段。

---

### 层二：`game-shell/` — 知道布局，不知道内容

定义游戏页面的骨架结构，通过 **slots / render props** 接受游戏私有内容。

#### `GameHeader.jsx`
```jsx
// 接受 left / center / right 三个 slot
<GameHeader
  left={<RoomInfo room={room} />}
  center={hasMultipleModes ? <Badge>{gameMode}</Badge> : null}
  right={<TurnIndicator currentPlayer={currentPlayer} />}
/>
```
GameHeader 自身不判断"是否有游戏模式"，由游戏主组件决定传不传 `center`。

#### `PlayerPanel.jsx`
```jsx
// renderPlayerDetail 是游戏私有内容的插槽
<PlayerPanel
  players={gameState.players}
  myId={myId}
  renderPlayerDetail={(player) => (
    <TreasureHints hints={player.hints} />   // treasure-hunt 私有
  )}
/>
```
骨架负责：头像、名字、在线状态、通用分数/血量。  
插槽负责：各游戏不同的面板内容（线索、手牌、资源等）。

#### `ActionBar.jsx`
```jsx
// children 由游戏主组件传入
<ActionBar>
  <button onClick={handleMove}>移动</button>
  <button onClick={handleBlock}>放障碍</button>
</ActionBar>
```

#### `GameOverOverlay.jsx`
```jsx
// 接受 winner 和 renderResult 插槽
<GameOverOverlay
  winner={winner}
  onPlayAgain={handlePlayAgain}
  onBackToLobby={onBackToLobby}
  renderResult={() => <TreasureHuntResult stats={gameStats} />}
/>
```

---

### 层三：`games/{game}/frontend/` — 完全私有

每个游戏独立，互不依赖，可以自由定义任何结构。

#### `TreasureHuntGame.jsx` — 游戏主组件
唯一知道全局的地方，负责把三层组装起来：

```jsx
export default function TreasureHuntGame({ initialGameState, onBackToLobby, onBackToRoom }) {
  // 所有游戏逻辑、socket 监听、state 管理...

  return (
    <GameLayout>
      <GameHeader
        left={<RoomInfo room={room} />}
        center={null}                        {/* 只有一种模式，不传 */}
        right={<TurnIndicator ... />}
      />
      <PlayerPanel
        players={gameState.players}
        renderPlayerDetail={(p) => (
          <TreasureHints hints={p.hints} targetFound={p.targetFound} />
        )}
      />
      <Board gameState={gameState} ... />   {/* 完全私有 */}
      <ActionBar>
        {isSetupPhase ? <SetupControls /> : <MoveControls />}
      </ActionBar>
      <GameOverOverlay ... />
    </GameLayout>
  );
}
```

---

## 判断组件归属

| 问题 | 归属 |
|---|---|
| 换一个游戏，这个组件**完全不变**？ | `shared/components/` |
| 换一个游戏，**结构不变但细节变**？ | `game-shell/`，用 slot / render prop |
| 换一个游戏，**整个组件都要重写**？ | `games/{game}/frontend/` |

常见例子：

| 组件 | 归属 | 理由 |
|---|---|---|
| `Avatar` | shared | 所有游戏都一样 |
| `Timer` | shared | 所有游戏都一样 |
| `PlayerPanel` 骨架 | game-shell | 框架相同，细节不同 |
| `GameHeader` | game-shell | 框架相同，slot 内容不同 |
| `Board` | games/xxx | 每个游戏完全不同 |
| `Cell` | games/xxx | 每个游戏完全不同 |
| `TreasureHints` | games/treasure-hunt | 完全私有 |

---

## 迁移步骤（treasure-hunt 现有代码）

1. **新建目录结构**，不删除现有文件
2. 从现有 `Board.jsx` / `Game.jsx` 中**提取**通用骨架 → `game-shell/`
3. 创建 `TreasureHuntGame.jsx`，将原有游戏逻辑**移入**
4. 将 `Game.jsx` 的 lazy import 指向 `TreasureHuntGame.jsx`
5. 删除原有临时文件

---

## 新增游戏 Checklist

添加第二个游戏时，只需：

- [ ] 在 `games/{new-game}/frontend/` 下创建游戏私有文件
- [ ] 创建 `{NewGame}Game.jsx` 作为主组件，使用 `game-shell` 组件组装
- [ ] 在 `game-registry.js` 注册新游戏的 `componentPath`
- [ ] **不需要修改** `Game.jsx`、`game-shell/` 或 `shared/` 的任何文件
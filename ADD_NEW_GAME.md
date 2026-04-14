# 🎮 如何实现新游戏

本指南将逐步教你如何在 OnlineGames 平台上实现一个新游戏（以 Battle Line 为例）。

## 📚 目录

1. [架构概述](#架构概述)
2. [第一步：创建目录结构](#第一步创建目录结构)
3. [第二步：后端实现](#第二步后端实现)
4. [第三步：前端实现](#第三步前端实现)
5. [第四步：游戏注册](#第四步游戏注册)
6. [第五步：测试](#第五步测试)

---

## 架构概述

### 游戏的两个世界

OnlineGames 采用**前后端分离**的严格隔离，但通过**注册表**统一协调：

```
后端游戏引擎
├─ 输入：玩家操作（GAME_ACTION）
├─ 处理：游戏规则检查 + 状态更新
└─ 输出：新的游戏状态 → 广播给所有客户端

前端游戏组件
├─ 输入：服务器广播的游戏状态
├─ 处理：状态到 UI 的映射 + 用户交互监听
└─ 输出：玩家操作 → 发送给服务器（GAME_ACTION）

共享注册表
├─ shared/game-registry.js → 发现和加载游戏
├─ games/[game-name]/gameSpec.json → 游戏元数据
└─ games/[game-name]/backend/engine.js + frontend/index.js → 具体实现
```


### 标准接口承诺

所有游戏引擎**必须**实现以下接口：

```javascript
// 后端游戏引擎必须实现

class GameEngine {
  // 初始化游戏
  initializeGame(players) {
    return {
      board: [...],          // 可选：棋盘数据
      players: [...],        // 玩家状态
      phase: 'SETUP',        // 当前阶段
      winner: null,          // 赢家
      message: '游戏开始'     // 回合消息
    };
  }
  
  // 处理玩家操作
  processAction(gameState, playerId, action) {
    // 验证 → 状态转换 → 返回结果
    return {
      success: boolean,
      newState: {...},       // 新的游戏状态
      error?: string         // 失败时的错误信息
    };
  }
}

// 前端游戏组件必须接受这些 props

function BattleLineBoard({
  gameDef,              // 游戏定义（来自注册表）
  initialGameState,     // 初始游戏状态
  initialRoomData,      // 房间信息
  onBackToLobby        // 返回大厅的回调
}) {
  // 组件实现
}
```

## 第一步：创建目录结构

在 `games` 目录下创建一个新目录，例如 `battle-line`，并添加以下文件：

```
games/battle-line/
├── gameSpec.json              # 游戏元数据
├── README.md                  # 游戏规则文档
├── backend/
│   ├── engine.js             # 游戏逻辑引擎（必须）
│   ├── constants.js          # 游戏常数（卡牌、棋盘等）
│   └── validator.js          # 验证规则（可选）
└── frontend/
    ├── Board.jsx             # 主游戏组件（必须）
    ├── Card.jsx              # 卡牌组件
    ├── Hand.jsx              # 手牌区域
    ├── Board.module.css      # 样式（或使用 Tailwind）
    ├── constants.js          # 样式常数（可选）
    ├── hooks.js              # 游戏逻辑 Hooks（可选）
    └── index.js              # 导出入口（必须）
```

## 第二步：后端实现

### 2.1 创建 games/battle-line/gameSpec.json

```json
{
  "id": "battle_line",
  "name": "战线",
  "description": "2-4人卡牌对战游戏，控制三条战线争夺领地",
  "version": "1.0.0",
  
  "gamePlay": {
    "maxPlayers": 4,
    "minPlayers": 2,
    "boardSize": null,           // 无传统棋盘（改用卡牌）
    "turnBased": {
      "isSerialTurns": true
    }
  },
  
  "phases": [
    { "id": "SETUP", "name": "游戏设置" },
    { "id": "PLAY", "name": "对战阶段" },
    { "id": "RESOLVE", "name": "结算阶段" }
  ]
}
```

### 2.2 创建 games/battle-line/backend/engine.js

这是游戏的核心大脑，包含所有游戏规则。

```javascript
// games/battle-line/backend/engine.js

const {
  BATTLE_LINE_DECK,
  BATTLE_LINE_TROOPS,
  // ... 你的游戏常数
} = require('./constants');

class BattleLineEngine {
  /**
   * 初始化游戏
   * @param {Array} players - 玩家列表
   * @returns {Object} 初始游戏状态
   */
  initializeGame(players) {
    return {
      // 游戏需要的任何数据结构
      players: players.map((p, idx) => ({
        id: p.socketId,
        name: p.name,
        hand: [],              // 手牌
        flags: [null, null, null],  // 三条战线的控制
        units: [[], [], []],   // 三条战线上已出的单位
        score: 0
      })),
      
      // 游戏状态
      phase: 'SETUP',
      currentPlayerIndex: 0,
      round: 1,
      
      // 游戏进程
      discard: [],           // 弃牌堆
      winner: null,
      
      // 消息
      message: '游戏正在初始化...'
    };
  }
  
  /**
   * 处理玩家操作 - 游戏的核心方法
   * @param {Object} gameState - 当前游戏状态
   * @param {string} playerId - 执行操作的玩家 ID
   * @param {Object} action - 操作对象
   *                  - action.type: 操作类型（'play_card', 'move_unit' 等）
   *                  - action.payload: 操作数据
   * @returns {Object} { success: boolean, newState: Object?, error?: string }
   */
  processAction(gameState, playerId, action) {
    try {
      // 1. 验证操作合法性
      if (!this.isActionValid(gameState, playerId, action)) {
        return {
          success: false,
          error: '操作不合法'
        };
      }
      
      // 2. 克隆游戏状态，避免修改原对象
      const newState = JSON.parse(JSON.stringify(gameState));
      
      // 3. 根据操作类型执行不同的处理
      switch (action.type) {
        case 'play_card':
          this.handlePlayCard(newState, playerId, action);
          break;
          
        case 'move_unit':
          this.handleMoveUnit(newState, playerId, action);
          break;
          
        default:
          return {
            success: false,
            error: `未知操作类型: ${action.type}`
          };
      }
      
      // 4. 检查胜利条件
      const winner = this.checkWinCondition(newState);
      if (winner) {
        newState.winner = winner;
        newState.phase = 'FINISHED';
        newState.message = `🎉 玩家 ${winner.name} 获胜！`;
      }
      
      // 5. 返回成功结果
      return {
        success: true,
        newState: newState
      };
      
    } catch (error) {
      // 异常处理
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ============ 私有方法 ============
  
  isActionValid(gameState, playerId, action) {
    // 检查玩家是否存在
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return false;
    
    // 检查是否轮到该玩家
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return false;
    
    // 根据操作类型进行具体验证
    return true;
  }
  
  handlePlayCard(gameState, playerId, action) {
    // 实现"出牌"逻辑
    const { cardId, targetFlag } = action.payload;
    // TODO: 修改 gameState
  }
  
  handleMoveUnit(gameState, playerId, action) {
    // 实现"移动单位"逻辑
    // TODO: 修改 gameState
  }
  
  checkWinCondition(gameState) {
    // 检查胜利条件
    // 返回赢家玩家对象或 null
    return null;
  }
}

// ✅ 重要：导出实例或类，供后端加载
module.exports = new BattleLineEngine();
// 或
// export default new BattleLineEngine();
```

### 2.3 创建 games/battle-line/backend/constants.js

```javascript
// 游戏常数 - 集中定义所有游戏参数

export const BATTLE_LINE_TROOPS = [
  // { id, name, strength, specialty }
  // 你的卡牌定义
];

export const BATTLE_LINE_DECK = [
  // 完整的卡牌库
];

// ... 其他常数
```

## 2.4 可选：创建 games/battle-line/backend/validators.js

```javascript
// 验证工具函数 - 重复使用的验证逻辑

export function isValidCardPlay(gameState, playerId, cardId) {
  // 检查该玩家是否拥有该卡牌
  // 检查该卡牌是否可以出
}

export function isValidUnitMove(gameState, unitId, targetFlag) {
  // 检查单位是否可以移动到目标战线
}

// ... 其他验证函数
```

## 第三步：前端实现

### 3.1 创建 games/battle-line/frontend/Board.jsx

这是用户看到的游戏界面。

```javascript
// games/battle-line/frontend/Board.jsx

import { useEffect, useState } from 'react';
import { useGame } from '../../../platform/web/src/hooks/useGame';
import { useSocket } from '../../../platform/web/src/hooks/useSocket';
import Card from './Card';
import Hand from './Hand';
import FlagLine from './FlagLine';

/**
 * Battle Line 游戏主组件
 * @param {Object} props.gameDef - 游戏定义（来自注册表）
 * @param {Object} props.initialGameState - 初始游戏状态
 * @param {Object} props.initialRoomData - 房间数据
 * @param {Function} props.onBackToLobby - 返回大厅
 */
export default function BattleLineBoard({
  gameDef,
  initialGameState,
  initialRoomData,
  onBackToLobby
}) {
  // 状态管理
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedCard, setSelectedCard] = useState(null);
  const { socket } = useSocket();
  const { sendGameAction, endGame } = useGame();
  
  // Socket 事件监听
  useEffect(() => {
    if (!socket) return;
    
    // 监听游戏状态更新
    socket.on('GAME_STATE_UPDATED', (newState) => {
      setGameState(newState);
    });
    
    // 监听游戏结束
    socket.on('ROOM_UPDATED', (data) => {
      if (data.gameState?.winner) {
        // 游戏已结束，显示胜利界面
      }
    });
    
    return () => {
      socket.off('GAME_STATE_UPDATED');
      socket.off('ROOM_UPDATED');
    };
  }, [socket]);
  
  // 处理玩家操作
  const handlePlayCard = (cardId, targetFlag) => {
    sendGameAction({
      type: 'play_card',
      payload: { cardId, targetFlag }
    });
    setSelectedCard(null);
  };
  
  const handleMoveUnit = (unitId, targetFlag) => {
    sendGameAction({
      type: 'move_unit',
      payload: { unitId, targetFlag }
    });
  };
  
  // 获取当前玩家
  const myPlayer = gameState.players.find(p => p.id === socket?.id);
  const isMyTurn = gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === socket?.id);
  
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      {/* 顶部导航 */}
      <div className="flex justify-between items-center p-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold">⚔️ {gameDef.name}</h1>
        <button
          onClick={() => endGame().then(onBackToLobby)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
        >
          返回大厅
        </button>
      </div>
      
      {/* 游戏主体 */}
      <div className="flex-1 flex gap-6 p-6 overflow-auto">
        {/* 战线显示 */}
        <div className="flex-1">
          {gameState.players.map((player, idx) => (
            <FlagLine
              key={player.id}
              player={player}
              isMyPlayer={player.id === myPlayer.id}
            />
          ))}
        </div>
        
        {/* 右侧栏：手牌 + 信息 */}
        <div className="w-64 space-y-4">
          {/* 手牌区域 */}
          <div className="bg-slate-900 p-4 rounded-lg">
            <h3 className="font-bold mb-3">手牌 ({myPlayer?.hand.length || 0})</h3>
            <Hand
              cards={myPlayer?.hand || []}
              selectedCard={selectedCard}
              onSelectCard={setSelectedCard}
            />
            <button
              onClick={() => handlePlayCard(selectedCard?.id, 0)}
              disabled={!selectedCard || !isMyTurn}
              className="w-full mt-4 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
            >
              出牌
            </button>
          </div>
          
          {/* 游戏信息 */}
          <div className="bg-slate-900 p-4 rounded-lg">
            <p className="text-sm text-slate-400">阶段：{gameState.phase}</p>
            <p className="text-sm text-slate-400">当前玩家：{gameState.players[gameState.currentPlayerIndex]?.name}</p>
          </div>
        </div>
      </div>
      
      {/* 游戏消息 */}
      {gameState.winner && (
        <div className="bg-green-600 p-4 text-center font-bold">
          🎉 {gameState.winner.name} 获胜！
        </div>
      )}
    </div>
  );
}
```

### 3.2 创建 games/battle-line/frontend/Card.jsx

```javascript
// games/battle-line/frontend/Card.jsx

export default function Card({ card, onClick, isSelected }) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded border-2 cursor-pointer transition ${
        isSelected 
          ? 'border-blue-500 bg-blue-900' 
          : 'border-slate-600 hover:border-slate-400'
      }`}
    >
      <div className="font-bold text-sm">{card.name}</div>
      <div className="text-xs text-slate-400">⚔️ {card.strength}</div>
    </div>
  );
}
```

### 3.3 创建 games/battle-line/frontend/index.jsx

```javascript
// games/battle-line/frontend/index.js

// 导出主组件
export { default as BattleLineBoard } from './Board.jsx';

// 默认导出
export { default } from './Board.jsx';

// 导出其他组件
export { default as Card } from './Card.jsx';
export { default as Hand } from './Hand.jsx';
export { default as FlagLine } from './FlagLine.jsx';
```

## 第四步：游戏注册

编辑 `shared/game-registry.js` 文件，在 `GAME_REGISTRY` 注册新游戏：

```javascript
// shared/game-registry.js

export const GAME_REGISTRY = [
  {
    id: 'treasure_hunt',
    name: '寻宝之战',
    // ... 现有内容
  },
  
  // ✨ 添加新游戏
  {
    id: 'battle_line',
    name: '战线',
    description: '2-4人卡牌对战游戏',
    enabled: true,  // ← 改为 true 启用
    
    spec: {
      maxPlayers: 4,
      minPlayers: 2,
      boardSize: null,
      phases: ['SETUP', 'PLAY', 'RESOLVE'],
      features: ['chat', 'card-game']
    },
    
    backend: {
      enginePath: '../../games/battle-line/backend/engine.js'
    },
    
    frontend: {
      componentPath: () => import('../../games/battle-line/frontend/index.js')
    }
  }
];
```

## 第五步：测试

### 5.1 后端测试

```bash
# 1. 启动服务器
cd platform/server
npm run dev

# 2. 查看日志，确认游戏注册是否成功
# 应该看到：✅ 加载游戏引擎: battle_line
```

### 5.2 前端测试

```bash
# 1. 启动前端
cd platform/web
npm run dev

# 2. 打开 http://localhost:5173
# 3. 在 Lobby 中应该看到 "战线" 卡片
```

### 5.3 游戏测试

1. 创建房间或加入房间
2. 开始游戏
3. 确认游戏界面和功能正常


## 检查清单

完成后确认以下项目：
- 已创建 `games/battle-line/backend/engine.js` 并实现 `initializeGame()` 和 `processAction()`
- 已创建 `games/battle-line/frontend/Board.jsx` 并导出为默认导出
- 已创建 `games/battle-line/frontend/index.js` 并导出所有组件
- 已创建 `games/battle-line/gameSpec.json`
- 已在 `shared/game-registry.js` 注册游戏，`enabled: true`
- 后端日志显示"✅ 加载游戏引擎: battle_line"
- 前端 Lobby 显示新游戏卡片
- 能够成功创建房间和启动游戏
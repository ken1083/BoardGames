# 后端设计 (Backend Design)

因为剔除了传统数据库的沉重负担，我们的服务器后端职责变得极其单纯：**作为一款高效率的多用户“状态收发器和验证器”**。

---

## 1. 核心状态驻留：全内存数据结构 (In-Memory Maps)
我们仅仅只需要利用 Node.js 进程内部的字典或 Map 来存放这些“转瞬即逝”的信息：

```javascript
// 全局记录：所有打开的房间 (Key 是诸如 'AX9E' 这样的短码)
const globalRooms = new Map();

/*
  每个 Room 的数据结构大抵长这样：
  Room {
    id: 'AX9E',                   // 房间码
    gameType: 'tic-tac-toe',        // 当前什么游戏 
    hostSocketId: 'xcvsjk-12ss',  // 唯一房主权限识别
    players: [                    // 玩家名册
      { socketId: '...', name: 'Alice', isReady: true },
      { socketId: '...', name: 'Bob', isReady: false }
    ],
    gameState: { ... }            // 具体的桌游进行状态字典
  }
*/
```

---

## 2. 接口模式设计 (Event Routing)
我们的后端不需要写常见的 RESTful HTTP API (例如 `GET /api/users`)。整个后端的交流语言是 **WebSocket 里的事件侦听**。

### A. 大厅层事件 (Lobby Events)
只处理人员调度：
- `CREATE_ROOM` -> 服务器随机生成 4 位好念的英文数字混杂代码（保证没有歧义字符如 0/O 1/I），返回给其发起者。并将这名玩家初始化为“房主”。
- `JOIN_ROOM` -> 校验代码，通过则加入对应房间的玩家名单。并将改动群发（广播）给该房间的其他所有人。
- `LEAVE_ROOM` / `DISCONNECT` -> 处理突发断开连接，更新列表。如果走的是房主，甚至可以将房主移交给第二个人。如果是最后一个人，销毁该内存 Room 实例释放内存。
- `CHANGE_SETTINGS` -> 只有房主可以触发，改变人数、难度上限，并全员下发更新 UI。

### B. 系统层机制：简单的重连 (Soft-Reconnect)
虽然没有数据库，但为了避免手机息屏被系统杀掉进程带来的问题：
- 在玩家第一次发 `JOIN` 进入房间时，服务器可下发一个一次性的随机令牌 (Session Token) 放前端 `localStorage`。
- 若网络短暂掉线，玩家在 1 分钟内重连后，只要带上这个 Token，服务器可以绕过查重规则直接把他塞回原来断开的位置。

### C. 业务状态机隔离 (Game Logic Isolation)
不能把所有游戏的逻辑混合写在一个文件里。必须规划一个清晰的代码目录作为未来的基石：
- `/src/core/roomManager.js` (大厅管理员角色，创建、销毁机制)
- `/src/games/gameA_logic.js` (只暴露初始化游戏状态、处理走棋请求 `onPlayerMove`、判断输赢返回等方法，完全黑盒并向外导出函数)
- `/src/games/gameB_logic.js`

这样，当我们未来想接驳一个新桌游（比如大富翁）时，只用在这个目录追加一个文件，主框架永远不需要大改。

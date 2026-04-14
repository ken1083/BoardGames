# 🔴 Critical Priority - Fix Immediately

## Game-Breaking Issues

1. **Cannot rejoin ongoing game** - 从游戏内离开后（到房间/GameMenu/Lobby），无法重新join game(ongoing game)
   - This breaks the game experience when players accidentally navigate away
   
   **Proposed Solution:**
   - Store active game session ID in localStorage on game start
   - Add "Rejoin Game" button on GameMenu(also show room ID) and Room that checks for active session
   - Implement socket reconnection logic: when socket reconnects, fetch current game state from server
   - On server side: store active games in memory with player socket IDs; when player rejoins, restore their connection
   - Backend: Update `GameDispatcher.js` to handle player session recovery on reconnect

2. **Coordinate cannot directly map to specific cell** - 系统会使用坐标进行公告，玩家需要自己判断 `(r,c)` 的具体位置，降低体验感。可以在board的外围显示坐标，like a map。
   
   **Proposed Solution:**
   - Add row labels (1, 2, 3, ..., 9 on left side) and column labels (1, 2, 3, ..., 9 on top)
   - Make the board from 9x9 to 10x10, with the first row and column being labels
   - Label cells are not clickable and have transparent background
   - isOutOfBounds() 函数需要修改，以考虑label cells
   - Constants.js 里的board size需要修改，字母格以及永久障碍格的坐标也需要修改


# 🟠 High Priority - Essential Gameplay

1. **Multi-winner deadlock logic unclear** - 对于胜利条件2（死锁情况）：若多位玩家到其藏宝点的剩余格子数一样且是最少（即multi winners），目前的代码实现是怎样？实际应该要怎么判断（多位赢家？看谁先行动？还是其他？）
   - Need to clarify: multiple winners, first to act, or other logic?

2. **Announce treasure spots at game end** - 游戏结束时，Player intel 可以公告所有玩家的藏宝点（从 ？？？变成字母）
   - Important for final game state transparency

3. **Latest block highlight** - 对于最近放置的障碍（latest placed block），可以有一个border highlight用于提示所有玩家。
   - Improves board clarity

---

# 🟡 Medium Priority - Feature Enhancements

1. **Player order customization** - 新增功能：玩家可以在room里改变自己的顺序（idx），玩家顺序的变化不影响host的身份。
   - Nice-to-have player control feature

2. **Distinguish obstacles by player** - 游戏分成2种模式：
    - 不区分障碍（current mode）（default）：统一障碍物的颜色，你不知道障碍物是哪个玩家放的（除非你看公告/记下来了）
    - 区分障碍：会以玩家颜色渲染障碍物，你可以知道障碍物是哪个玩家放的
   - Optional game mode variant

---

# 🔵 Low Priority - Future Enhancements

1. **Mobile/responsive design** - 前端页面的设计完全没有考虑过移动设备（如电话），需要重新设计
   - Future redesign when mobile support needed

2. **SPA state persistence** - 目前的设计是Single Page Application (SPA)，refresh就会丢失状态。
   - Could add localStorage or session storage

3. **Small screen optimization** - 对于屏幕高度较小的设备，treasure-hunt in game 可能过长（chatbox的底部需要scroll down才能看到）。优先级不高，可是可以找一天进行优化。
   - Can optimize later if needed


# Solved Issues

1. 当多个玩家选择同一个藏宝点时，只有一个玩家能看到自己为下一位玩家配置的藏宝点标记（右上角圆形），其他玩家看不到（被覆盖了）。

2. 行动阶段没有提醒玩家行动，玩家需要自己判断是否轮到自己行动。

3. 公告没有通知玩家放置障碍物以及移动目标的坐标。

4. Player intel's 出发地点显示的是坐标 (r,c)。可是，由于出发点只能是字母格（just like 藏宝点），所以可以直接显示字母for出发点。
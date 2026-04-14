# 🔴 Critical Priority - Fix Immediately

## Game-Breaking Issues

1. **Cannot rejoin ongoing game** - 从游戏内离开后（到房间/GameMenu/Lobby），无法重新join game(ongoing game)
   - This breaks the game experience when players accidentally navigate away

2. **Move/obstacle announcement system** - 系统每一位玩家防止障碍或移动后，系统需要进行公告：
    - 玩家X放置障碍在(r,c)
    - 玩家X从(r,c)移动到(r',c')
   - Critical for multiplayer game state synchronization

---

# 🟠 High Priority - Essential Gameplay

1. **Action phase player prompts** - 行动阶段，应该给当前行动玩家提示要干嘛，for example:
    - 请选择要放置障碍的格子
    - 请选择要移动的目标
   - Essential for UX clarity

2. **Multi-winner deadlock logic unclear** - 对于胜利条件2（死锁情况）：若多位玩家到其藏宝点的剩余格子数一样且是最少（即multi winners），目前的代码实现是怎样？实际应该要怎么判断（多位赢家？看谁先行动？还是其他？）
   - Need to clarify: multiple winners, first to act, or other logic?

3. **Announce treasure spots at game end** - 游戏结束时，Player intel 可以公告所有玩家的藏宝点（从 ？？？变成字母）
   - Important for final game state transparency

4. **Latest block highlight** - 对于最近放置的障碍（latest placed block），可以有一个border highlight用于提示所有玩家。
   - Improves board clarity

5. **Pre-game setup prompts** - 战前准备阶段，对每个玩家提示：请为targetPlayer选择藏宝点/出发点
   - Clear instructions for game setup

---

# 🟡 Medium Priority - Feature Enhancements

1. **Display starting point as letter** - For treasure-hunt game, Player intel's 出发地点显示的是坐标 (r,c)。可是，由于出发点只能是字母格（just like 藏宝点），所以可以直接显示字母for出发点
   - Consistency with treasure spot display

2. **Player order customization** - 新增功能：玩家可以在room里改变自己的顺序（idx），玩家顺序的变化不影响host的身份。
   - Nice-to-have player control feature

3. **Distinguish obstacles by player** - 游戏分成2种模式：
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
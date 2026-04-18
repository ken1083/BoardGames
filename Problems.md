# 🔴 Critical Priority - Fix Immediately

***Currently no issue***

# 🟠 High Priority - Essential Gameplay

***Currently no issue***

---

# 🟡 Medium Priority - Feature Enhancements

1. **Distinguish obstacles by player** - 游戏分成2种模式：
    - 不区分障碍（current mode）（default）：统一障碍物的颜色，你不知道障碍物是哪个玩家放的（除非你看公告/记下来了）
    - 区分障碍：会以玩家颜色渲染障碍物，你可以知道障碍物是哪个玩家放的
    - change setting by host in room (with a brief of the modes)
    - in game, there will be a mode name under/beside the game's name in the top nav

2. **Game Rules viewing** - 目前，游戏规则只在GameMenu里显示，若是在游戏进行中想要查看规则需要退出到GameMenu再查看，体验感不佳。建议在InGame UI增加游戏规则的按钮，点击后可以显示游戏规则。(maybe can do a toggle view button between rule&chatbox, but this means chatbox should be put at the most right of the page instead of under player intel)

3. **Multiple session handling** - 若玩家同时加入多个房间/游戏（same tab，join other room/game aftfer soft leave），需要怎么处理？

4. **Room password option** - 让房主在创建房间的时候，选择是否需要密码加入房间。If yes, 则在创建之前设置密码。其他玩家加入房间的时候需要输入密码。

---

# 🔵 Low Priority - Future Enhancements

1. **Mobile/responsive design** - 前端页面的设计完全没有考虑过移动设备（如电话），需要重新设计
   - Future redesign when mobile support needed

2. **SPA state persistence** - 目前的设计是Single Page Application (SPA)，refresh就会丢失状态。
   - Could add localStorage or session storage

---

# Solved Issues

1. 当多个玩家选择同一个藏宝点时，只有一个玩家能看到自己为下一位玩家配置的藏宝点标记（右上角圆形），其他玩家看不到（被覆盖了）。

2. 行动阶段没有提醒玩家行动，玩家需要自己判断是否轮到自己行动。

3. 公告没有通知玩家放置障碍物以及移动目标的坐标。

4. Player intel's 出发地点显示的是坐标 (r,c)。可是，由于出发点只能是字母格（just like 藏宝点），所以可以直接显示字母for出发点。

5. Player intel 可以显示谁是host while in game

6. 游戏结束时，Player intel 可以公告所有玩家的藏宝点（从 ？？？变成字母）

7. 对于最近放置的障碍以及最近移动目标格子，可以有一个border highlight用于提示所有玩家。

8. 房间ID应该目前没有限制，汉字可以是room ID, 3个char也可以是room ID. Room ID should be: 4 characters and only contain letters and numbers ([A-Z0-9])

9. 新增功能：Host可以在room里改变玩家的顺序，玩家顺序的变化不影响host的身份。

10. 在board.jsx and room.jsx有使用 alert() and window.confirm()。建议使用自定义的notification组件，如board.jsx的errorMsg。对于confirm，可以改成弹出确认框，点击确认或取消进行对应操作。另外，这个组件应该是通用的而不是treasure-hunt专属。

11. 从游戏/房间内离开后（soft leave），无法重新join room or game(ongoing game)。

12. **Chatbox Viewport "Jumping"** - When a new announcement is made, the entire browser page forces a scroll to the chatbox if it isn't fully in view. This disrupts players who are focusing on the board.

13. **Ambiguous Setup Instructions** - The setup prompts ("Select Treasure Point") don't state who the point is for. Since players configure for the next player, this needs to be explicitly mentioned. （board.jsx line 355-356）

14. **Architectural Debt**:
   - `platform\web\src\constants\theme.js` contains game-specific constants but is treated as global.
   - In `shared\constants.js`, there is a definition of game_phase but game_phase should not be shared by all games since different game has different phases. Also, game_phase already defined in `games\treasure-hunt\backend\constants.js`
   - `TREASURE_HUNT_COLORS` should be moved to a platform-level global config for cross-game consistency.
   - Others

15. **Lack of Grid Coordinates** - Players struggle to quickly find cells mentioned in announcements (like (4, 5)) because there are no row/column labels (1-9) on the board's edge.

16. **Restart Game Button** - 目前，游戏内只有终止游戏按钮。玩家结束一局游戏后需要点击“终止游戏”回到房间再重新start game。可以增加一个“重开一局”的按钮在“终止游戏”旁边（only host can see and use）。

17. **Multi-winner deadlock logic unclear** - 对于胜利条件2（死锁情况）：若多位玩家到其藏宝点的剩余格子数一样且是最少，则在多位剩余格子最少的玩家中，从当前玩家开始顺延，谁先行动谁获胜。

18. **message gone after rejoining game** - 玩家在游戏中退出lobby并rejoin game之后，chatbox的messages会消失。
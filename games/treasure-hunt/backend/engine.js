// ═══════════════════════════════════════════════════════════════════════════════════
// 藏宝迷宫游戏引擎 - 寻宝之战核心逻辑
// ═══════════════════════════════════════════════════════════════════════════════════
// 游戏规则：
// 1. 所有玩家同时为"下一个玩家"配置：先选藏宝点(目标)，再选出发点(起点)
// 2. 游戏开始后：轮流放置障碍X → 移动一格 → 检查是否抵达目标
// 3. 赢家条件：第一个到达自己藏宝点的玩家胜出
// ═══════════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════════
// 导入常量 - 集中管理，避免重复定义
// ═══════════════════════════════════════════════════════════════════════════════════
const {
    TREASURE_HUNT_SIZE: SIZE,              // 棋盘大小：9×9
    TREASURE_HUNT_LETTERS: LETTERS,        // 8个宝藏字母格（藏宝点和出发点位置）
    TREASURE_HUNT_PERMANENT_X: PERMANENT_X, // 12个永久障碍
    TREASURE_HUNT_COLORS: COLORS           // 玩家棋子颜色
} = require('../shared/constants');

const { isOutOfBounds } = require('../shared/validator');

// ═══════════════════════════════════════════════════════════════════════════════════
// TreasureHunt 游戏引擎类
// ═══════════════════════════════════════════════════════════════════════════════════

class TreasureHunt {

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法1】initializeGame(players) - 游戏初始化
    // 目的：创建一盘新的游戏，初始化棋盘、玩家、游戏状态
    // 参数：players - 房间内所有参与游戏的玩家数组
    // 返回值：游戏状态对象(gameState)，包含棋盘、玩家、阶段等信息
    // ═══════════════════════════════════════════════════════════════════════════════════
    initializeGame(players) {
        // 步骤1：创建空白 11×11 棋盘，每个格子初始化为空字符串
        const board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(''));

        // 步骤1.5：填入坐标轴标签 (1-9) - 在四条边缘都生成标签，确保对称
        for (let i = 1; i <= 9; i++) {
            // 顶部与底部列标
            board[0][i] = i.toString();
            board[10][i] = i.toString();

            // 左侧与右侧行标
            board[i][0] = i.toString();
            board[i][10] = i.toString();
        }

        // 步骤2：在棋盘上放置永久障碍X（地图生成）
        PERMANENT_X.forEach(pos => board[pos.r][pos.c] = 'X'); // 填黑大障碍

        // 步骤3：在棋盘上放置宝藏字母A-H（这些是藏宝点和出发点的位置）
        LETTERS.forEach(pos => board[pos.r][pos.c] = pos.n);   // 填入金格字母

        // 步骤4：初始化每个玩家的信息对象
        // 每个玩家都有：
        //   - id: socket连接ID（用于识别玩家）
        //   - name: 玩家昵称
        //   - color: 棋子显示颜色（不同玩家不同颜色）
        //   - startPos: 出发点位置（战前准备阶段为null）
        //   - currentPos: 当前位置（游戏开始后 = startPos）
        //   - targetPos: 藏宝点位置（目标位置，战前准备阶段为null）
        //   - targetName: 藏宝点的字母名称 A-H
        //   - configuredBy: 记录是谁(哪个玩家)为这个玩家配置的
        const gamePlayers = players.map((p, index) => {
            return {
                id: p.socketId,
                name: p.name,
                color: COLORS[index % COLORS.length],
                startPos: null,        // 待配置
                startName: '???',       // 战前准备，初始未知
                currentPos: null,      // 待配置
                targetPos: null,       // 待配置
                targetName: '???',       // 战前准备，初始未知
                configuredBy: null     // 记录配置者名称
            };
        });

        // 步骤5：返回初始游戏状态对象
        return {
            board: board,                                      // 11×11棋盘（包含永久障碍X、字母A-H、四周坐标标号）
            players: gamePlayers,                              // 所有玩家的信息
            phase: 'SETUP_POSITIONS',                          // 游戏阶段：现在是"配置位置"阶段
            playerConfigCount: {},                             // 追踪每个玩家的配置进度：{socketId: 0|1|2}
            setupTempSelection: {},                            // 追踪setup阶段每个玩家的预选位置：{socketId: {r, c, step}}
            winner: null,                                      // 赢家：目前没有
            message: `⏳ 准备阶段开始！所有玩家同时为"下一个玩家"选择：先选【藏宝点】，再选【出发点】。`
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法2】canAllReachTargets(gameState, placeR, placeC) - 验证是否会封死活路
    // 目的：检测玩家放置的新障碍是否会导致某个玩家无法到达藏宝点
    // 参数：
    //   - gameState: 当前游戏状态
    //   - placeR, placeC: 准备放置的新障碍坐标
    // 返回值：
    //   - true: 所有玩家都能通过（这个障碍可以放）
    //   - false: 某个玩家被堵死（这个障碍不能放，触发"天谴"机制）
    // 实现原理：BFS路径查找 - 使用广度优先搜索检查每个玩家是否有通路到达目标
    // ═══════════════════════════════════════════════════════════════════════════════════
    canAllReachTargets(gameState, placeR, placeC) {
        // 步骤1：复制当前棋盘到临时棋盘
        const tempBoard = gameState.board.map(row => [...row]);

        // 步骤2：在临时棋盘上模拟放置新障碍(小写x代表新放置的障碍，大写X是永久障碍)
        tempBoard[placeR][placeC] = 'x';

        // 步骤3：对每个玩家进行BFS检查
        for (let p of gameState.players) {
            // 如果某人还在设定期或者无处可走，直接跳过
            if (!p.currentPos || !p.targetPos) continue; // ???

            // 调用checkPath方法检查这个玩家是否能通过
            if (!this.checkPath(tempBoard, p.currentPos, p.targetPos)) {
                // 只要有一个玩家被堵死，就返回false（这个障碍不能放）
                return false;
            }
        }

        // 所有玩家都能通过，这个障碍可以安全放置
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法3】checkPath(board, startPos, targetPos) - BFS路径查找
    // 目的：检查是否存在从起点到目标点的通路（不被障碍阻挡）
    // 参数：
    //   - board: 棋盘（已包含新放置的障碍模拟）
    //   - startPos: 起点坐标 {r, c}
    //   - targetPos: 目标坐标 {r, c}
    // 返回值：
    //   - true: 存在通路
    //   - false: 被完全堵死
    // 算法：广度优先搜索 BFS（八向移动：上下左右+四个斜方向）
    // ═══════════════════════════════════════════════════════════════════════════════════
    checkPath(board, startPos, targetPos) {
        // 步骤1：初始化BFS
        const queue = [startPos];                           // BFS队列，初始放入起点
        const visited = Array(SIZE).fill(null).map(() => Array(SIZE).fill(false));  // 访问标记数组
        visited[startPos.r][startPos.c] = true;            // 标记起点已访问

        // 步骤2：定义八个移动方向 (上、下、左、右、4个斜方向)
        const dirs = [
            [-1, 0], [1, 0],          // 上、下
            [0, -1], [0, 1],          // 左、右
            [-1, -1], [-1, 1],        // 左上、右上
            [1, -1], [1, 1]           // 左下、右下
        ];

        // 步骤3：BFS搜索主循环
        while (queue.length > 0) {
            // 取出队列前端元素
            const cur = queue.shift();

            // 检查是否到达了目标点
            if (cur.r === targetPos.r && cur.c === targetPos.c) {
                return true;  // 找到通路！返回true
            }

            // 步骤4：扩展相邻格子（八个方向）
            for (let d of dirs) {
                const nr = cur.r + d[0];  // 新行号
                const nc = cur.c + d[1];  // 新列号

                // 检查格子是否在棋盘范围内
                if (!isOutOfBounds(nr, nc)) {
                    // 检查格子是否：
                    //   1. 未被访问过
                    //   2. 不是永久障碍(大写X)
                    //   3. 不是新放置的障碍(小写x)
                    if (!visited[nr][nc] && board[nr][nc] !== 'X' && board[nr][nc] !== 'x') {
                        visited[nr][nc] = true;          // 标记为已访问
                        queue.push({ r: nr, c: nc });    // 加入队列
                    }
                }
            }
        }

        // 队列已空但未找到目标，说明无路可走
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法3b】getShortestPathLength(board, startPos, targetPos) - 计算最短路径长度
    // 目的：使用BFS计算从起点到目标点的最短路径格子数
    // 参数：
    //   - board: 棋盘
    //   - startPos: 起点坐标 {r, c}
    //   - targetPos: 目标坐标 {r, c}
    // 返回值：
    //   - 最短路径长度（包含起点）；如果无路可走，返回 Infinity
    // ═══════════════════════════════════════════════════════════════════════════════════
    getShortestPathLength(board, startPos, targetPos) {
        // 如果起点就是目标点，距离为0
        if (startPos.r === targetPos.r && startPos.c === targetPos.c) {
            return 0;
        }

        // 初始化BFS
        const queue = [{ pos: startPos, dist: 0 }];
        const visited = Array(SIZE).fill(null).map(() => Array(SIZE).fill(false));
        visited[startPos.r][startPos.c] = true;

        // 定义八个移动方向
        const dirs = [
            [-1, 0], [1, 0],
            [0, -1], [0, 1],
            [-1, -1], [-1, 1],
            [1, -1], [1, 1]
        ];

        // BFS搜索
        while (queue.length > 0) {
            const { pos: cur, dist } = queue.shift();

            // 检查是否到达目标
            if (cur.r === targetPos.r && cur.c === targetPos.c) {
                return dist;
            }

            // 扩展相邻格子
            for (let d of dirs) {
                const nr = cur.r + d[0];
                const nc = cur.c + d[1];

                if (!isOutOfBounds(nr, nc)) {
                    if (!visited[nr][nc] && board[nr][nc] !== 'X' && board[nr][nc] !== 'x') {
                        visited[nr][nc] = true;
                        queue.push({ pos: { r: nr, c: nc }, dist: dist + 1 });
                    }
                }
            }
        }

        // 无路可走，返回无穷大
        return Infinity;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法3c】isGameDeadlocked(gameState) - 检查游戏是否进入死锁状态
    // 目的：检查是否所有玩家都无法放置任何有效的障碍（无法放置任何X而不触发死门）
    // 参数：gameState - 当前游戏状态
    // 返回值：true 表示游戏已死锁，false 表示还有有效的障碍可放置
    // ═══════════════════════════════════════════════════════════════════════════════════
    isGameDeadlocked(gameState) {
        // 遍历棋盘的所有空白格子
        for (let r = 1; r < SIZE - 1; r++) {
            for (let c = 1; c < SIZE - 1; c++) {
                // 只检查空白格子，由于不能把障碍放在玩家头上，玩家占用的格子不纳入判定
                if (gameState.board[r][c] === '') {
                    const isOccupied = gameState.players.some(p => p.currentPos && p.currentPos.r === r && p.currentPos.c === c);
                    if (!isOccupied) {
                        // 检查在这个格子放置障碍是否会触发死门
                        if (this.canAllReachTargets(gameState, r, c)) {
                            // 找到至少一个有效的放置位置，游戏未死锁
                            return false;
                        }
                    }
                }
            }
        }

        // 遍历完所有格子，没有找到任何有效的放置位置
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法3d】checkWinCondition(gameState, currentPlayer) - 检查胜利条件
    // 目的：检查并处理两个胜利条件：
    //   1. 常规致胜：玩家到达自己的宝藏点
    //   2. 死锁清算：游戏进入完全死锁状态，按最短路径判胜
    // 参数：
    //   - gameState: 当前游戏状态
    //   - currentPlayer: 当前玩家对象
    // 返回值：
    //   - 返回胜利者对象（name属性），如果没有胜利者则返回 null
    // ═══════════════════════════════════════════════════════════════════════════════════
    checkWinCondition(gameState, currentPlayer) {
        // 【胜利条件1】检查是否到达宝藏点
        if (currentPlayer.currentPos.r === currentPlayer.targetPos.r &&
            currentPlayer.currentPos.c === currentPlayer.targetPos.c) {
            // 玩家赢了！返回胜利者
            return currentPlayer;
        }

        // 【胜利条件2】检查是否游戏进入死锁状态
        if (this.isGameDeadlocked(gameState)) {
            // 游戏已死锁，计算每个玩家到宝藏点的最短路径长度
            const distances = gameState.players.map(p => ({
                player: p,
                dist: this.getShortestPathLength(gameState.board, p.currentPos, p.targetPos)
            }));

            // 1. 找到最小距离
            const minDistance = Math.min(...distances.map(d => d.dist));

            // 2. 使用回合顺序进行决胜 (Tie-breaker)
            // 从当前玩家 (turnIndex) 开始查，第一个拥有最短路径的人胜出
            const playersCount = gameState.players.length;
            const startIndex = gameState.turnIndex || 0;

            for (let i = 0; i < playersCount; i++) {
                const checkIdx = (startIndex + i) % playersCount;
                const pDist = distances[checkIdx];

                if (pDist.dist === minDistance) {
                    // 找到死锁清算下的唯一赢家
                    return pDist.player;
                }
            }
        }

        // 没有胜利者
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法4】processAction(gameState, socketId, action) - 主动作处理器
    // 目的：处理玩家的每一个操作（配置、放障碍、移动等）
    // 参数：
    //   - gameState: 当前游戏状态
    //   - socketId: 执行操作的玩家ID
    //   - action: 包含 {type, payload: {r, c}} 的操作对象
    // 返回值：{success: true} 或 {error: "错误信息"}
    // 流程：根据gameState.phase分发到不同的处理方法
    // ═══════════════════════════════════════════════════════════════════════════════════
    processAction(gameState, socketId, action) {
        // 前置检查：游戏是否已结束？
        if (gameState.winner) return { error: "游戏已结束，以后再来探索吧！" };

        // 根据游戏阶段分发到对应的处理方法
        if (gameState.phase === 'SETUP_POSITIONS') {
            // 兼容前端发送的SETUP_TARGET/SETUP_START，以及新的CONFIRM_SETUP_SELECTION
            if (action.type === 'CONFIRM_SETUP_SELECTION' ||
                action.type === 'CONFIRM_TREASURE_POINT' ||
                action.type === 'CONFIRM_START_POINT') {
                return this.confirmSetupSelection(gameState, socketId, action);
            } else {
                return this.handleSetupPhase(gameState, socketId, action);
            }
        } else if (gameState.phase === 'PLACE_X') {
            return this.handlePlaceXPhase(gameState, socketId, action);
        } else if (gameState.phase === 'MOVE') {
            return this.handleMovePhase(gameState, socketId, action);
        }

        return { error: `未知的游戏阶段：${gameState.phase}` };
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法5】handleSetupPhase(gameState, socketId, action) - 处理战前准备阶段（预选阶段）
    // 作用：玩家点击格子进行预选（仅更新setupTempSelection，不保存）
    // ═══════════════════════════════════════════════════════════════════════════════════
    handleSetupPhase(gameState, socketId, action) {
        const { r, c } = action.payload;

        // 找出执行者在玩家列表中的索引
        const executorIdx = gameState.players.findIndex(p => p.id === socketId);
        if (executorIdx === -1) return { error: "你不在游戏中！" };

        // 计算下一个玩家的索引(被配置者)
        const targetIdx = (executorIdx + 1) % gameState.players.length;
        const targetPlayer = gameState.players[targetIdx];
        const executor = gameState.players[executorIdx];

        // 获取点击格子的内容
        const cellVal = gameState.board[r][c];

        // 初始化该玩家的配置计数(如果还没有)
        if (!(socketId in gameState.playerConfigCount)) {
            gameState.playerConfigCount[socketId] = 0;
        }

        // 初始化该玩家的预选状态(如果还没有)
        if (!(socketId in gameState.setupTempSelection)) {
            gameState.setupTempSelection[socketId] = null;
        }

        const configCount = gameState.playerConfigCount[socketId];

        // ═══════════════════════════════════════════════════════════════════════════════
        // 第1轮：选择藏宝点（仅预选）
        // ═══════════════════════════════════════════════════════════════════════════════
        if (configCount === 0) {
            // 验证：藏宝点只能在边缘的字母格上(A-H)
            if (cellVal.length !== 1 || cellVal === 'X' || cellVal === 'x' || cellVal === '') {
                return { error: "藏宝点只能在边缘的字母格上！" };
            }

            // 【预选】仅更新预选状态，不保存
            gameState.setupTempSelection[socketId] = { r, c };
            // gameState.message = `⏳ ${executor.name} 正在决定 ${targetPlayer.name} 的藏宝点。`;
            gameState.message = '';
            return { success: true };
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // 第2轮：选择出发点（仅预选）
        // ═══════════════════════════════════════════════════════════════════════════════
        if (configCount === 1) {
            // 验证：出发点也必须在边缘的字母格上(A-H)
            if (cellVal.length !== 1 || cellVal === 'X' || cellVal === 'x' || cellVal === '') {
                return { error: "出发点必须在边缘的字母格上！" };
            }

            // 预检查：出发点和藏宝点不能相同
            if (targetPlayer.targetPos.r === r && targetPlayer.targetPos.c === c) {
                return { error: `${targetPlayer.name} 的出发点和藏宝点不能相同！` };
            }

            // 【预选】仅更新预选状态，不保存
            gameState.setupTempSelection[socketId] = { r, c };
            // gameState.message = `⏳ ${executor.name} 正在决定 ${targetPlayer.name} 的出发点。`;
            gameState.message = '';
            return { success: true };
        }

        return { error: "玩家已完成所有配置，无需继续选择！" };
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法5b】confirmSetupSelection(gameState, socketId, action) - 确认Setup选择
    // 作用：玩家点击确认按钮时，真正保存预选的格子
    // ═══════════════════════════════════════════════════════════════════════════════════
    confirmSetupSelection(gameState, socketId, action) {
        // 找出执行者在玩家列表中的索引
        const executorIdx = gameState.players.findIndex(p => p.id === socketId);
        if (executorIdx === -1) return { error: "你不在游戏中！" };

        // 计算下一个玩家的索引(被配置者)
        const targetIdx = (executorIdx + 1) % gameState.players.length;
        const targetPlayer = gameState.players[targetIdx];
        const executor = gameState.players[executorIdx];

        // 初始化该玩家的配置计数(如果还没有)
        if (!(socketId in gameState.playerConfigCount)) {
            gameState.playerConfigCount[socketId] = 0;
        }

        // 初始化该玩家的预选状态(如果还没有)
        if (!(socketId in gameState.setupTempSelection)) {
            gameState.setupTempSelection[socketId] = null;
        }

        const configCount = gameState.playerConfigCount[socketId];
        const tempSelection = gameState.setupTempSelection[socketId];

        // 检查是否有预选
        if (!tempSelection) {
            return { error: "还没有选择格子，请先点击格子进行预选！" };
        }

        const { r, c } = tempSelection;
        const cellVal = gameState.board[r][c];

        // ═══════════════════════════════════════════════════════════════════════════════
        // 确认藏宝点
        // ═══════════════════════════════════════════════════════════════════════════════
        if (configCount === 0) {
            // 保存藏宝点
            targetPlayer.targetPos = { r, c };
            targetPlayer.targetName = cellVal;
            targetPlayer.configuredBy = executor.name;
            gameState.playerConfigCount[socketId] = 1;

            // 清除预选
            gameState.setupTempSelection[socketId] = null;

            gameState.message = `✅ ${executor.name} 已确认 ${targetPlayer.name} 的藏宝点。现在请选择出发点！`;
            return { success: true };
        }

        // ═══════════════════════════════════════════════════════════════════════════════
        // 确认出发点
        // ═══════════════════════════════════════════════════════════════════════════════
        if (configCount === 1) {
            // 验证：出发点和藏宝点不能相同
            if (targetPlayer.targetPos.r === r && targetPlayer.targetPos.c === c) {
                return { error: `${targetPlayer.name} 的出发点和藏宝点不能相同！` };
            }

            // 保存出发点
            targetPlayer.startPos = { r, c };
            targetPlayer.currentPos = { r, c };
            targetPlayer.startName = cellVal;
            gameState.playerConfigCount[socketId] = 2;

            // 清除预选
            gameState.setupTempSelection[socketId] = null;

            // 检查所有玩家是否都完成了2个配置
            const allConfigured = gameState.players.every(p =>
                gameState.playerConfigCount[p.id] === 2
            );

            if (allConfigured) {
                // 所有配置完毕，进入游戏！
                gameState.phase = 'PLACE_X';
                gameState.turnIndex = 0;
                gameState.message = `准备完毕！正式开始！请 ${gameState.players[gameState.turnIndex].name} 在空白格子放置一个路障 X！`;
            } else {
                // 未完成：计算还有谁还在配置
                gameState.message = `✅ ${executor.name} 已完成配置。等待中...`;
            }

            return { success: true };
        }

        return { error: "玩家已完成所有配置，无需继续确认！" };
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法6】handlePlaceXPhase(gameState, socketId, action) - 处理放置障碍阶段
    // 作用：当前玩家放置一个障碍，检查是否封死活路
    // ═══════════════════════════════════════════════════════════════════════════════════
    handlePlaceXPhase(gameState, socketId, action) {
        const { r, c } = action.payload;

        // 验证是否轮到这个玩家
        const currentPlayer = gameState.players[gameState.turnIndex];
        if (currentPlayer.id !== socketId) {
            return { error: "你干嘛~ 现在还不是你的回合！" };
        }

        // 验证操作类型
        if (action.type !== 'PLACE_X') {
            return { error: "现在应该放置障碍！" };
        }

        // 检查坐标是否在棋盘范围内
        if (isOutOfBounds(r, c)) {
            return { error: "放障碍的位置不在棋盘范围内！" };
        }

        // 验证：放置位置必须是空地(不是障碍、字母等)
        if (gameState.board[r][c] !== '') {
            return { error: "你只能在空白格子放置障碍！" };
        }

        // 验证：不能把障碍放在其他玩家的位置
        if (gameState.players.some(p => p.currentPos && p.currentPos.r === r && p.currentPos.c === c)) {
            return { error: "这里有玩家站着呢，不能放障碍！" };
        }

        // 【关键验证】触发死路检测：检查这个障碍是否会封死某个玩家
        if (!this.canAllReachTargets(gameState, r, c)) {
            // 【天谴机制】如果会封死活路，该玩家被惩罚
            // 惩罚：跳过移动权利，直接轮给下一个玩家放障碍
            gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
            gameState.phase = 'PLACE_X';
            gameState.message = `${currentPlayer.name} 试图封死 (${r},${c}) 触发了天谴，他前进的权利被夺走了！现在请 ${gameState.players[gameState.turnIndex].name} 行动。`;
            return { success: true };
        }

        // 通过了死路检测，放置障碍
        gameState.board[r][c] = 'x';

        // 记录最新放置的障碍位置及玩家颜色（用于前端高亮）
        gameState.latestBlock = { r, c, color: currentPlayer.color };

        // 放置成功，进入移动阶段
        gameState.phase = 'MOVE';
        gameState.message = `障碍已成功放置在 (${r}, ${c})！请 ${currentPlayer.name} 前进一格！`;
        return { success: true };
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法7】handleMovePhase(gameState, socketId, action) - 处理移动阶段
    // 作用：当前玩家移动一格，检查胜利条件，轮给下一个玩家
    // ═══════════════════════════════════════════════════════════════════════════════════
    handleMovePhase(gameState, socketId, action) {
        const { r, c } = action.payload;

        // 验证是否轮到这个玩家
        const currentPlayer = gameState.players[gameState.turnIndex];
        if (currentPlayer.id !== socketId) {
            return { error: "你干嘛~ 现在还不是你的回合！" };
        }

        // 验证操作类型
        if (action.type !== 'MOVE') {
            return { error: "现在应该移动！" };
        }

        // 计算要移动的距离
        const dr = Math.abs(r - currentPlayer.currentPos.r);
        const dc = Math.abs(c - currentPlayer.currentPos.c);

        // 验证：只能移动到相邻格子(包括8个斜方向)
        if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) {
            return { error: "只能移动到相邻的八个格子去！" };
        }

        // 验证：目标位置不能是障碍
        if (gameState.board[r][c] === 'X' || gameState.board[r][c] === 'x') {
            return { error: "前面的区域以后再来探索吧！" };
        }

        // 成功移动：更新当前位置
        currentPlayer.currentPos = { r, c };

        // 记录最新移动的位置及玩家颜色（用于前端高亮）
        gameState.latestMove = { r, c, color: currentPlayer.color };

        // 【检查胜利条件】使用checkWinCondition方法判断两个胜利条件
        const winner = this.checkWinCondition(gameState, currentPlayer);

        if (winner) {
            // 有胜利者！检查是按常规致胜还是死锁清算
            const isDeadlocked = this.isGameDeadlocked(gameState);

            gameState.winner = winner.name;

            if (!isDeadlocked) {
                // 【胜利条件1】常规致胜：到达宝藏点
                gameState.message = `🎉🎉 恭喜 ${winner.name} 率先抵达 ${winner.targetName} ，成功找到 One Piece！`;
            } else {
                // 【胜利条件2】死锁清算：按最短路径判胜
                const distances = gameState.players.map(p => ({
                    name: p.name,
                    distance: this.getShortestPathLength(gameState.board, p.currentPos, p.targetPos)
                }));
                const distanceStr = distances.map(d => `${d.name}: ${d.distance}格`).join(', ');
                gameState.message = `地图上已无法再放置障碍。按最短路径判胜：[${distanceStr}]。🏆 ${winner.name} 以 ${distances.find(d => d.name === winner.name).distance} 格路程夺得胜利！`;
            }

            return { success: true };
        }

        // 未赢：轮到下一个玩家放障碍
        const curPlayerName = gameState.players[gameState.turnIndex].name; // 当前执行移动玩家的名字
        gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
        gameState.phase = 'PLACE_X';
        gameState.message = `${curPlayerName} 已移动到 (${r}, ${c})！现在轮到 ${gameState.players[gameState.turnIndex].name} 行动。`;
        return { success: true };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// 导出游戏引擎实例
// TreasureHunt 类被实例化后导出，GameDispatcher 会通过这个实例调用 initializeGame 和 processAction
// ═══════════════════════════════════════════════════════════════════════════════════
module.exports = new TreasureHunt();

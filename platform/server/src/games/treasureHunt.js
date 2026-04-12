const SIZE = 9;

// 边缘的 8 个宝藏字母格
const LETTERS = [
    {r: 0, c: 0, n: 'A'}, {r: 0, c: 4, n: 'B'}, {r: 0, c: 8, n: 'C'},
    {r: 4, c: 0, n: 'D'}, {r: 4, c: 8, n: 'E'}, 
    {r: 8, c: 0, n: 'F'}, {r: 8, c: 4, n: 'G'}, {r: 8, c: 8, n: 'H'}
];

// 12 个不可摧毁的永久障碍X格
const PERMANENT_X = [
    {r: 0, c: 3}, {r: 0, c: 5}, {r: 2, c: 2}, {r: 2, c: 6},
    {r: 3, c: 0}, {r: 3, c: 8}, {r: 5, c: 0}, {r: 5, c: 8},
    {r: 6, c: 2}, {r: 6, c: 6}, {r: 8, c: 3}, {r: 8, c: 5}
];

// 为了不让大家都重色，准备的玩家棋子色戳
const COLORS = ['#ff3b30', '#007aff', '#34c759', '#ff9500'];

class TreasureHunt {
    
    // 初始化一盘对局！
    initializeGame(players) {
        // 造一张空白 9x9 白纸
        const board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(''));
        
        PERMANENT_X.forEach(pos => board[pos.r][pos.c] = 'X'); // 填黑大障碍
        LETTERS.forEach(pos => board[pos.r][pos.c] = pos.n);   // 填入金格字母

        // [核心MVP改动] 洗牌所有字母，强制为系统随机匹配起终点
        let available = [...LETTERS].sort(() => Math.random() - 0.5);
        
        const gamePlayers = players.map((p, index) => {
            const startNode = available.pop();
            const endNode = available.pop();
            return {
                id: p.socketId,
                name: p.name,
                color: COLORS[index % COLORS.length],
                startPos: { r: startNode.r, c: startNode.c },
                currentPos: { r: startNode.r, c: startNode.c }, // 刚生出来坐标等于起点
                targetPos: { r: endNode.r, c: endNode.c },     // 朝鲜朝圣的目标
                targetName: endNode.n
            };
        });

        return {
            board: board,
            players: gamePlayers,
            turnIndex: 0,
            phase: 'PLACE_X',
            winner: null,
            message: `游戏开始！系统已为双方选定风水宝地，请 👤${gamePlayers[0].name} 率先放置一个路障！`
        };
    }

    // BFS：如果我们把这颗 X 下去了，是不是把人逼死了？
    canAllReachTargets(gameState, placeR, placeC) {
        const tempBoard = gameState.board.map(row => [...row]);
        tempBoard[placeR][placeC] = 'x'; 

        for (let p of gameState.players) {
            if (!this.checkPath(tempBoard, p.currentPos, p.targetPos)) {
                return false; // 居然有人真被堵死了，这颗 X 大逆不道，直接宣判 false
            }
        }
        return true;
    }

    // BFS 遍历核心函数
    checkPath(board, startPos, targetPos) {
        const queue = [startPos];
        const visited = Array(SIZE).fill(null).map(() => Array(SIZE).fill(false));
        visited[startPos.r][startPos.c] = true;

        const dirs = [
            [-1, 0], [1, 0], [0, -1], [0, 1],
            [-1, -1], [-1, 1], [1, -1], [1, 1] // 八向神推
        ];

        while(queue.length > 0) {
            const cur = queue.shift();
            if (cur.r === targetPos.r && cur.c === targetPos.c) return true; // 通了！

            for (let d of dirs) {
                const nr = cur.r + d[0], nc = cur.c + d[1];
                if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
                    // 不能走原生地图大X，也不能走人为阻挠的小x
                    if (!visited[nr][nc] && board[nr][nc] !== 'X' && board[nr][nc] !== 'x') {
                        visited[nr][nc] = true;
                        queue.push({r: nr, c: nc});
                    }
                }
            }
        }
        return false; // 找遍了也无路可走
    }

    // 处理每一次传来的坐标交互事件
    processAction(gameState, socketId, action) {
        if (gameState.winner) return { error: "仗都打完了，散了吧！" };

        const currentPlayer = gameState.players[gameState.turnIndex];
        if (currentPlayer.id !== socketId) return { error: "喂外快！现在还不是你的回合！" };

        // 阶段 1：放泥巴 X
        if (gameState.phase === 'PLACE_X' && action.type === 'PLACE_X') {
            const { r, c } = action.payload;

            if (gameState.board[r][c] !== '') return { error: "这个地方地质太硬/有字母了，下不了障碍！" };
            if (gameState.players.some(p => p.currentPos.r === r && p.currentPos.c === c)) {
                return { error: "怎么能把石头砸别人脚脖子上呢！不行！" };
            }

            // 【触发天谴死路拦截】
            if (!this.canAllReachTargets(gameState, r, c)) {
                // 惩罚机制：跳过你的走路阶段，轮给下一个人
                gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
                gameState.phase = 'PLACE_X';
                gameState.message = `⚠️老天降罚！${currentPlayer.name} 试图封死活路触发了死门，天谴收走了他走路的权利！现在请 👤${gameState.players[gameState.turnIndex].name} 下障。`;
                return { success: true };
            }

            gameState.board[r][c] = 'x'; 
            gameState.phase = 'MOVE';
            gameState.message = `✅ 障碍落地！请 👤${currentPlayer.name} 执行你的移动！`;
            return { success: true };
        }

        // 阶段 2：人员位移
        if (gameState.phase === 'MOVE' && action.type === 'MOVE') {
            const { r, c } = action.payload;
            const dr = Math.abs(r - currentPlayer.currentPos.r);
            const dc = Math.abs(c - currentPlayer.currentPos.c);
            
            if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return { error: "只能瞬闪到相邻的八个格子去！" };
            if (gameState.board[r][c] === 'X' || gameState.board[r][c] === 'x') return { error: "前面有墙撞肿了头！" };

            // 成功移动
            currentPlayer.currentPos = { r, c };

            // 判断有没有到终点？
            if (currentPlayer.currentPos.r === currentPlayer.targetPos.r && 
                currentPlayer.currentPos.c === currentPlayer.targetPos.c) {
                gameState.winner = currentPlayer.name;
                gameState.message = `🎉🎉 破局狂欢！恭喜 ${currentPlayer.name} 翻山越岭，率先抵达 ${currentPlayer.targetName} 宝库拔冠！`;
                return { success: true };
            }

            // 顺利移交回合控制权
            gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
            gameState.phase = 'PLACE_X';
            gameState.message = `交棒成功！现在轮到 👤${gameState.players[gameState.turnIndex].name} 落石。`;
            return { success: true };
        }

        return { error: "现在的环境不让你做这个动作！" };
    }
}

module.exports = new TreasureHunt();

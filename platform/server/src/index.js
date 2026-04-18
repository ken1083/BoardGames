// ═══════════════════════════════════════════════════════════════════════════════════
// 游戏服务器主入口文件 - Socket.io 事件处理
// ═══════════════════════════════════════════════════════════════════════════════════
// 此文件实现了服务器端的 Socket 连接和事件处理
// 主要负责：
//   1. 房间管理(创建/加入/离开房间)
//   2. 游戏初始化和状态管理
//   3. 玩家操作事件处理
//   4. 实时状态同步到所有连接的客户端
// ═══════════════════════════════════════════════════════════════════════════════════

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// 导入房间管理器：处理房间的创建/加入/更新
const roomManager = require('./core/RoomManager');

// 导入游戏分发器：根据游戏类型路由到相应的游戏引擎
const gameDispatcher = require('./core/GameDispatcher');

// 导入验证器：验证房间ID格式等
const { isValidRoomId } = require('../../../shared/validators');

// ═══════════════════════════════════════════════════════════════════════════════════
// 初始化 Express 和 Socket.io 服务器
// ═══════════════════════════════════════════════════════════════════════════════════

const app = express();
app.use(cors());
// 提供前端静态文件(HTML/CSS/JS)
app.use(express.static(path.join(__dirname, '../public')));

// 创建 HTTP 服务器
const server = http.createServer(app);

// 创建 Socket.io 服务器实例，启用跨域支持
const io = new Server(server, {
    cors: {
        origin: '*',  // 允许所有来源(开发环境)
        methods: ['GET', 'POST']
    }
});

// ═══════════════════════════════════════════════════════════════════════════════════
// Socket 连接映射表
// ═══════════════════════════════════════════════════════════════════════════════════
// socketToRoom 用于快速查找：给定玩家的socket ID，能快速找到他所在的房间ID
// 结构：Map { socketId → roomId }
const socketToRoom = new Map();

// ═══════════════════════════════════════════════════════════════════════════════════
 // 【Socket.io 事件处理】主连接事件
 // ═══════════════════════════════════════════════════════════════════════════════════
 
 io.on('connection', (socket) => {
    // 玩家客户端连接后的处理逻辑

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】JOIN_OR_CREATE_ROOM - 玩家创建房间或加入房间
    // 流程：
    //   1. 如果 roomId 为空 → 创建新房间(当前玩家为房主)
    //   2. 如果 roomId 存在 → 加入指定房间
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('JOIN_OR_CREATE_ROOM', ({ roomId, playerName, gameType }, callback) => {
        // 标准化房间ID为大写(便于查询)
        roomId = roomId ? roomId.toUpperCase() : null;

        if (!roomId) {
            // 【创建新房间】
            // 房主为当前玩家，房间ID由系统自动生成
            const room = roomManager.createRoom(socket.id, playerName, gameType);

            // 玩家加入 Socket 房间(Socket 层的房间概念，用于广播)
            socket.join(room.id);

            // 本地映射：记录这个玩家属于哪个房间
            socketToRoom.set(socket.id, room.id);

            // 向客户端返回结果，包含房间信息
            if (callback) callback({ success: true, room });
            return;
        }

        // 【加入现有房间】
        // 验证房间ID格式
        if (!isValidRoomId(roomId)) {
            if (callback) callback({ success: false, error: '❌ 房间号必须是4个字符，仅能包含字母和数字 (A-Z, 0-9)' });
            return;
        }

        const result = roomManager.joinRoom(roomId, socket.id, playerName, gameType);
        if (result.error) {
            // 加入失败(房间已满、房间未找到等)
            if (callback) callback({ success: false, error: result.error });
            return;
        }

        // 加入成功
        socket.join(result.room.id);  // Socket 层加入房间
        socketToRoom.set(socket.id, result.room.id);  // 本地映射

        // 向房间内所有其他玩家广播：有新玩家加入，房间状态已更新
        socket.to(result.room.id).emit('ROOM_UPDATED', result.room);

        // 向新加入的玩家返回成功
        if (callback) callback({ success: true, room: result.room });
    });

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】RENAME - 玩家修改昵称
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('RENAME', (newName) => {
        const roomId = socketToRoom.get(socket.id);
        if (roomManager.renamePlayer(roomId, socket.id, newName)) {
            // 昵称修改成功，向房间内所有玩家广播新的房间状态
            io.to(roomId).emit('ROOM_UPDATED', roomManager.getRoom(roomId));
        }
    });

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】CHANGE_SETTINGS - 房主修改游戏设置
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('CHANGE_SETTINGS', (newSettings) => {
        const roomId = socketToRoom.get(socket.id);
        if (roomManager.updateSettings(roomId, socket.id, newSettings)) {
            // 设置修改成功，向房间内所有玩家广播新的房间状态
            io.to(roomId).emit('ROOM_UPDATED', roomManager.getRoom(roomId));
        }
    });

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】REORDER_PLAYERS - 房主修改玩家顺序
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('REORDER_PLAYERS', ({ playerSocketId, direction }) => {
        const roomId = socketToRoom.get(socket.id);
        if (roomManager.reorderPlayers(roomId, socket.id, playerSocketId, direction)) {
            io.to(roomId).emit('ROOM_UPDATED', roomManager.getRoom(roomId));
        }
    });


    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】START_GAME - 房主启动游戏
    // 流程：
    //   1. 验证发起者是房主
    //   2. 验证房间状态为"大厅"(lobby)
    //   3. 使用 GameDispatcher 初始化游戏
    //   4. 广播游戏开始事件到所有玩家
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('START_GAME', ({ }, callback) => {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;

        const room = roomManager.getRoom(roomId);

        // 权限检查：只有房主能启动游戏
        if (room && room.hostId === socket.id && room.status === 'lobby') {
            // 更新房间状态为"游戏中"
            room.status = 'playing';

            // 【关键调用】使用 GameDispatcher 初始化游戏
            // GameDispatcher 会根据 gameType 路由到相应的游戏引擎
            // 返回初始化后的 gameState(包含棋盘、玩家、游戏阶段等)
            room.gameState = gameDispatcher.initializeGame(room.gameType, room.players);

            // 向房间内所有玩家广播：游戏已开始，并附加初始游戏状态
            io.to(roomId).emit('GAME_STARTED', { room, gameState: room.gameState });

            // 向发起者(房主)返回成功
            if (callback) callback({ success: true });
        }
    });

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】GAME_ACTION - 玩家执行游戏动作(配置、放障碍、移动等)
    // 流程：
    //   1. 找到玩家所在房间
    //   2. 使用 GameDispatcher 处理游戏动作
    //   3. 如果出错 → 仅发送给执行者(socket.emit)
    //   4. 如果成功 → 广播新的游戏状态到房间内所有玩家(io.to)
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('GAME_ACTION', (actionData) => {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;

        const room = roomManager.getRoom(roomId);

        // 验证房间存在且游戏正在进行
        if (room && room.status === 'playing') {
            // 【关键调用】使用 GameDispatcher 处理玩家的游戏动作
            // GameDispatcher 根据 gameType 路由到相应的游戏引擎处理
            // 返回 {success: true} 或 {error: "错误信息"}
            const res = gameDispatcher.processGameAction(
                room.gameType,        // 游戏类型
                room.gameState,       // 当前游戏状态
                socket.id,            // 执行者玩家ID
                actionData            // 动作数据({type, payload})
            );

            // 如果操作出错(如不是当前玩家、位置非法等)
            if (res.error) {
                // 只发送错误给执行者(不广播，避免打扰其他玩家)
                socket.emit('GAME_ERROR', res.error);
                return;
            }

            // 操作成功，向房间内所有玩家广播更新后的游戏状态
            // 这样所有客户端都能同步看到游戏进展
            io.to(roomId).emit('GAME_STATE_UPDATED', room.gameState);
        }
    });

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】RESTART_GAME - 房主重开游戏
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('RESTART_GAME', () => {
        const roomId = socketToRoom.get(socket.id);
        const room = roomManager.getRoom(roomId);

        // 权限检查：只有房主能重开游戏，且游戏正在进行中
        if (room && room.hostId === socket.id && room.status === 'playing') {
            // 重新初始化游戏状态
            room.gameState = gameDispatcher.initializeGame(room.gameType, room.players);

            // 向房间内所有玩家广播：游戏已重开（复用 GAME_STARTED 事件）
            io.to(roomId).emit('GAME_STARTED', { room, gameState: room.gameState });

            // 发送系统消息
            io.to(roomId).emit('NEW_CHAT_MESSAGE', {
                sender: '系统',
                text: '房主重开了游戏',
                time: Date.now()
            });
        }
    });

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】END_GAME - 房主结束游戏，返回大厅
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('END_GAME', () => {
        const roomId = socketToRoom.get(socket.id);
        const room = roomManager.getRoom(roomId);

        // 权限检查：只有房主能结束游戏
        if (room && room.hostId === socket.id) {
            // 重置房间状态
            room.status = 'lobby';          // 回到大厅
            room.gameState = null;          // 清除游戏状态

            // 广播房间状态更新
            io.to(roomId).emit('ROOM_UPDATED', room);

            // 强制所有客户端返回到房间页面，并携带最新的房间数据
            io.to(roomId).emit('FORCE_BACK_TO_ROOM', room);
        }
    });

    /**
     * PLAYER_REJOINED: 玩家点击 REJOIN GAME 重新进入棋盘
     * 仅做系统广播公告
     */
    socket.on('PLAYER_REJOINED', () => {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;

        const room = roomManager.getRoom(roomId);
        if (!room) return;

        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
            io.to(roomId).emit('NEW_CHAT_MESSAGE', {
                sender: '系统',
                text: `${player.name} 已重新进入游戏`,
                time: Date.now()
            });
        }
    });

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】CHAT_MESSAGE - 玩家发送聊天消息
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('CHAT_MESSAGE', (text) => {
        const roomId = socketToRoom.get(socket.id);
        const room = roomManager.getRoom(roomId);

        // 验证房间存在且消息非空
        if (room && text.trim()) {
            // 找出发言者的玩家信息(获取昵称)
            const p = room.players.find(p => p.socketId === socket.id);
            if (p) {
                // 向房间内所有玩家广播聊天消息
                // 包含：发言者姓名、消息内容、时间戳
                io.to(roomId).emit('NEW_CHAT_MESSAGE', {
                    sender: p.name,
                    text: text.substring(0, 100),  // 限制消息长度为100字符
                    time: Date.now()
                });
            }
        }
    });

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】LEAVE_ROOM - 玩家主动离开房间
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('LEAVE_ROOM', () => {
        const roomId = socketToRoom.get(socket.id);
        if (roomId) {
            // 从房间管理器中移除该玩家
            const result = roomManager.leaveRoom(roomId, socket.id);
            // 从本地映射表移除
            socketToRoom.delete(socket.id);
            // 退出Socket.io内置房间
            socket.leave(roomId);

            // 如果房间还存在
            if (result && !result.destroyed) {
                // 广播更新
                io.to(roomId).emit('ROOM_UPDATED', result.room);
            }
        }
    });

    // ═════════════════════════════════════════════════════════════════════════════════
    // 【事件】disconnect - 玩家断开连接(掉线、关闭浏览器等)
    // ═════════════════════════════════════════════════════════════════════════════════
    socket.on('disconnect', () => {
        const roomId = socketToRoom.get(socket.id);
        if (roomId) {
            // 从房间管理器中移除该玩家
            const result = roomManager.leaveRoom(roomId, socket.id);

            // 从本地映射表移除
            socketToRoom.delete(socket.id);

            // 如果房间还存在(没有因为房主掉线而销毁)
            if (result && !result.destroyed) {
                // 向房间内其他玩家广播房间状态更新(显示该玩家已离开)
                io.to(roomId).emit('ROOM_UPDATED', result.room);
            }
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════════
// 启动服务器
// ═══════════════════════════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    await gameDispatcher.initialize();
    console.log(`Server Board Engines are FULLY LOADED on port ${PORT}`);
});

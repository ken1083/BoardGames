const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const roomManager = require('./core/RoomManager');
const gameDispatcher = require('./core/GameDispatcher');
const { isValidRoomId } = require('../../../shared/validators');

const app = express();
app.use(cors());

// 提供前端静态文件(HTML/CSS/JS) (针对 LAN 部署)
const distPath = path.join(__dirname, '../../web/dist');
app.use(express.static(distPath));

// Fallback for React Router
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// socketToSession 用于快速查找：Map { socketId → { roomId, playerId } }
const socketToSession = new Map();

io.on('connection', (socket) => {
    const { playerId } = socket.handshake.auth;
    if (!playerId) {
        console.warn('Player connected without playerId');
    }
    else {
        console.log('Player connected:', playerId);
        // 发送玩家当前参与的所有房间信息
        const playerRooms = roomManager.findRoomsByPlayerId(playerId);
        if (playerRooms.length > 0) {
            socket.emit('ACTIVE_ROOMS_INFO', playerRooms);
        }
    }

    socket.on('JOIN_OR_CREATE_ROOM', ({ roomId, playerName, gameType }, callback) => {
        roomId = roomId ? roomId.toUpperCase() : null;

        // 彻底清理：在进入新房间前，让当前 Socket 离开其它所有 Socket.io 房间
        // 这样可以防止“软离开”导致的旧房间消息仍然推送到这个 Socket
        const currentRooms = Array.from(socket.rooms);
        currentRooms.forEach(r => {
            if (r !== socket.id) socket.leave(r);
        });

        // 强制“一游一房”限制：如果在该游戏类型下已有其它房间，先离开。
        const existingRooms = roomManager.findRoomsByPlayerId(playerId);
        const sameTypeRoom = existingRooms.find(r => r.gameType === gameType && r.id !== roomId);
        if (sameTypeRoom) {
            const leaveResult = roomManager.leaveRoom(sameTypeRoom.id, playerId);
            if (leaveResult && !leaveResult.destroyed) {
                io.to(sameTypeRoom.id).emit('ROOM_UPDATED', leaveResult.room);
            }
        }

        if (!roomId) {
            // 创建新房间
            const room = roomManager.createRoom(playerId, socket.id, playerName, gameType);
            socket.join(room.id);
            socketToSession.set(socket.id, { roomId: room.id, playerId });
            if (callback) callback({ success: true, room });
            return;
        }

        if (!isValidRoomId(roomId)) {
            if (callback) callback({ success: false, error: '❌ 房间号必须是4个字符，仅能包含字母和数字 (A-Z, 0-9)' });
            return;
        }

        const result = roomManager.joinRoom(roomId, playerId, socket.id, playerName, gameType);
        if (result.error) {
            if (callback) callback({ success: false, error: result.error });
            return;
        }

        socket.join(result.room.id);
        socketToSession.set(socket.id, { roomId: result.room.id, playerId });

        // 广播
        socket.to(result.room.id).emit('ROOM_UPDATED', result.room);
        if (callback) callback({ success: true, room: result.room });
    });

    socket.on('REJOIN_ROOM', ({ roomId }) => {
        if (!roomId) return;
        const normalizedRoomId = roomId.trim().toUpperCase();

        // 先清理该 Socket 的其它房间订阅
        const currentRooms = Array.from(socket.rooms);
        currentRooms.forEach(r => {
            if (r !== socket.id && r !== normalizedRoomId) socket.leave(r);
        });

        const room = roomManager.rejoinRoom(normalizedRoomId, playerId, socket.id);
        if (room) {
            socket.join(room.id);
            socketToSession.set(socket.id, { roomId: room.id, playerId });
            socket.emit('ROOM_UPDATED', room);
            // 这里也可以发送 GAME_STARTED 如果状态是 playing
            if (room.status === 'playing') {
                socket.emit('GAME_STARTED', {
                    room,
                    gameState: room.gameState,
                    roomId: room.id
                });
            }
            socket.to(room.id).emit('ROOM_UPDATED', room);
        } else {
            console.log(`[Rejoin Failed] Player ${playerId} tried to rejoin non-existent room ${normalizedRoomId}`);
            socket.emit('REJOIN_FAILED');
        }
    });

    socket.on('RENAME', (newName) => {
        const session = socketToSession.get(socket.id);
        if (session && roomManager.renamePlayer(session.roomId, playerId, newName)) {
            io.to(session.roomId).emit('ROOM_UPDATED', roomManager.getRoom(session.roomId));
        }
    });

    socket.on('CHANGE_SETTINGS', (newSettings) => {
        const session = socketToSession.get(socket.id);
        if (session && roomManager.updateSettings(session.roomId, playerId, newSettings)) {
            io.to(session.roomId).emit('ROOM_UPDATED', roomManager.getRoom(session.roomId));
        }
    });

    socket.on('REORDER_PLAYERS', ({ playerSocketId, direction }) => {
        // the payload parameter has a bit of legacy naming "playerSocketId", but we refactored it to be targetPlayerId in the frontend
        const targetPlayerId = playerSocketId;
        const session = socketToSession.get(socket.id);
        if (session && roomManager.reorderPlayers(session.roomId, playerId, targetPlayerId, direction)) {
            io.to(session.roomId).emit('ROOM_UPDATED', roomManager.getRoom(session.roomId));
        }
    });

    socket.on('START_GAME', ({ }, callback) => {
        const session = socketToSession.get(socket.id);
        if (!session) return;
        const room = roomManager.getRoom(session.roomId);

        if (room && room.hostId === playerId && room.status === 'lobby') {
            room.status = 'playing';
            room.gameState = gameDispatcher.initializeGame(room.gameType, room.players);
            io.to(session.roomId).emit('GAME_STARTED', {
                room,
                gameState: room.gameState,
                roomId: session.roomId
            });
            if (callback) callback({ success: true });
        }
    });

    socket.on('GAME_ACTION', (actionData) => {
        const session = socketToSession.get(socket.id);
        if (!session) return;
        const room = roomManager.getRoom(session.roomId);

        if (room && room.status === 'playing') {
            const res = gameDispatcher.processGameAction(
                room.gameType,
                room.gameState,
                playerId, // Use playerId to identify who's taking action!
                actionData
            );

            if (res.error) {
                socket.emit('GAME_ERROR', res.error);
                return;
            }
            io.to(session.roomId).emit('GAME_STATE_UPDATED', {
                ...room.gameState,
                roomId: session.roomId
            });
        }
    });

    socket.on('RESTART_GAME', () => {
        const session = socketToSession.get(socket.id);
        if (!session) return;
        const room = roomManager.getRoom(session.roomId);

        if (room && room.hostId === playerId && room.status === 'playing') {
            room.gameState = gameDispatcher.initializeGame(room.gameType, room.players);
            io.to(session.roomId).emit('GAME_STARTED', {
                room,
                gameState: room.gameState,
                roomId: session.roomId
            });
            io.to(session.roomId).emit('NEW_CHAT_MESSAGE', { sender: '系统', text: '房主重开了游戏', time: Date.now() });
        }
    });

    socket.on('END_GAME', () => {
        const session = socketToSession.get(socket.id);
        if (!session) return;
        const room = roomManager.getRoom(session.roomId);

        if (room && room.hostId === playerId) {
            room.status = 'lobby';
            room.gameState = null;
            io.to(session.roomId).emit('ROOM_UPDATED', room);
            io.to(session.roomId).emit('FORCE_BACK_TO_ROOM', room);
        }
    });

    socket.on('PLAYER_REJOINED', () => {
        const session = socketToSession.get(socket.id);
        if (!session) return;
        const room = roomManager.getRoom(session.roomId);
        if (!room) return;

        const player = room.players.find(p => p.playerId === playerId);
        if (player) {
            io.to(session.roomId).emit('NEW_CHAT_MESSAGE', {
                sender: '系统',
                text: `${player.name} 已重新进入游戏`,
                time: Date.now()
            });
        }
    });

    socket.on('CHAT_MESSAGE', (text) => {
        const session = socketToSession.get(socket.id);
        if (!session) return;
        const room = roomManager.getRoom(session.roomId);

        if (room && text.trim()) {
            const p = room.players.find(p => p.playerId === playerId);
            if (p) {
                io.to(session.roomId).emit('NEW_CHAT_MESSAGE', {
                    sender: p.name,
                    text: text.substring(0, 100),
                    time: Date.now()
                });
            }
        }
    });

    socket.on('LEAVE_ROOM', () => {
        const session = socketToSession.get(socket.id);
        if (session) {
            const result = roomManager.leaveRoom(session.roomId, playerId);
            socketToSession.delete(socket.id);
            socket.leave(session.roomId);

            if (result && !result.destroyed) {
                io.to(session.roomId).emit('ROOM_UPDATED', result.room);
            }
        }
    });

    socket.on('disconnect', () => {
        const session = socketToSession.get(socket.id);
        if (session) {
            const room = roomManager.markPlayerOffline(session.roomId, playerId);
            socketToSession.delete(socket.id);

            if (room) {
                io.to(session.roomId).emit('ROOM_UPDATED', room);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    await roomManager.initialize();
    await gameDispatcher.initialize();
    console.log(`Server Board Engines are FULLY LOADED on port ${PORT}`);
});

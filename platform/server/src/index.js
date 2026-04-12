const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const roomManager = require('./core/RoomManager');
const treasureHuntLogic = require('./games/treasureHunt'); // 导入我们的游戏核！

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

const socketToRoom = new Map();

io.on('connection', (socket) => {
    socket.on('JOIN_OR_CREATE_ROOM', ({ roomId, playerName, gameType }, callback) => {
        roomId = roomId ? roomId.toUpperCase() : null; 
        
        if (!roomId) {
            const room = roomManager.createRoom(socket.id, playerName, gameType);
            socket.join(room.id);
            socketToRoom.set(socket.id, room.id);
            if (callback) callback({ success: true, room });
            return;
        }

        const result = roomManager.joinRoom(roomId, socket.id, playerName, gameType);
        if (result.error) {
            if (callback) callback({ success: false, error: result.error });
            return;
        }

        socket.join(result.room.id);
        socketToRoom.set(socket.id, result.room.id);
        
        socket.to(result.room.id).emit('ROOM_UPDATED', result.room);
        if (callback) callback({ success: true, room: result.room });
    });

    socket.on('RENAME', (newName) => {
        const roomId = socketToRoom.get(socket.id);
        if (roomManager.renamePlayer(roomId, socket.id, newName)) {
            io.to(roomId).emit('ROOM_UPDATED', roomManager.getRoom(roomId));
        }
    });

    socket.on('CHANGE_SETTINGS', (newSettings) => {
        const roomId = socketToRoom.get(socket.id);
        if (roomManager.updateSettings(roomId, socket.id, newSettings)) {
            io.to(roomId).emit('ROOM_UPDATED', roomManager.getRoom(roomId));
        }
    });

    socket.on('START_GAME', ({}, callback) => {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;
        
        const room = roomManager.getRoom(roomId);
        if (room && room.hostId === socket.id && room.status === 'lobby') {
            room.status = 'playing';
            
            // 🔥 根据不同游戏加载不同的核心引擎
            if (room.gameType === 'treasure_hunt') {
                room.gameState = treasureHuntLogic.initializeGame(room.players);
            }
            
            io.to(roomId).emit('GAME_STARTED', { room, gameState: room.gameState });
            if (callback) callback({ success: true });
        }
    });

    socket.on('GAME_ACTION', (actionData) => {
        const roomId = socketToRoom.get(socket.id);
        if (!roomId) return;
        
        const room = roomManager.getRoom(roomId);
        if (room && room.status === 'playing') {
            
            // 路由交接至具体的打榜器
            if (room.gameType === 'treasure_hunt') {
                const res = treasureHuntLogic.processAction(room.gameState, socket.id, actionData);
                
                // 错误仅弹给犯罪嫌疑人，全网就不必挂脸了
                if (res.error) {
                    socket.emit('GAME_ERROR', res.error);
                    return;
                }
                
                // 完全合规，状态有推拉，全局广播新的残局局面！
                io.to(roomId).emit('GAME_STATE_UPDATED', room.gameState);
            }

        }
    });

    socket.on('disconnect', () => {
        const roomId = socketToRoom.get(socket.id);
        if (roomId) {
            const result = roomManager.leaveRoom(roomId, socket.id);
            socketToRoom.delete(socket.id);
            if (result && !result.destroyed) io.to(roomId).emit('ROOM_UPDATED', result.room);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server Board Engines are FULLY LOADED on port ${PORT}`);
});

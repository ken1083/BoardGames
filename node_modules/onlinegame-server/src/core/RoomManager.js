class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    generateRoomId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
        let id;
        do {
            id = '';
            for (let i = 0; i < 4; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(id));
        return id;
    }

    // Support forced ID mapping
    createRoom(hostSocketId, hostName, gameType = 'treasure_hunt', forcedRoomId = null) {
        const roomId = forcedRoomId ? forcedRoomId.toUpperCase() : this.generateRoomId();
        const room = {
            id: roomId,
            gameType: gameType,
            hostId: hostSocketId,
            status: 'lobby',
            settings: { maxPlayers: 3 },
            players: [
                { socketId: hostSocketId, name: hostName.substring(0, 15), isHost: true }
            ],
            gameState: { counter: 0 } // For sync testing
        };
        this.rooms.set(roomId, room);
        return room;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    joinRoom(roomId, socketId, playerName, gameType) {
        let room = this.rooms.get(roomId);

        // 关键逻辑：如果这个房间没有，直接视为带着该房号创房！
        if (!room) {
            console.log(`[+] 连进未建立的房间 ${roomId}，现已自动开创它。`);
            room = this.createRoom(socketId, playerName, gameType || 'treasure_hunt', roomId);
            return { room, isNew: true };
        }

        const existingPlayer = room.players.find(p => p.socketId === socketId);
        if (existingPlayer) {
            return { room, isNew: false };
        }

        if (room.status !== 'lobby') return { error: '❌ 这个房间的游戏早就开始了，不可硬闯！' };
        if (room.players.length >= room.settings.maxPlayers) return { error: '❌ 房间已满（可在房主设置提高人数上限）' };

        // 重名处理
        let finalName = playerName.substring(0, 15);
        if (room.players.some(p => p.name === finalName)) {
            finalName = finalName + ' (2)';
        }

        room.players.push({ socketId, name: finalName, isHost: false });
        return { room, isNew: false };
    }

    // 改名逻辑 (约束 15 字)
    renamePlayer(roomId, socketId, newName) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const player = room.players.find(p => p.socketId === socketId);
        if (player) {
            player.name = newName.substring(0, 15);
            return true;
        }
        return false;
    }

    // 改配置逻辑
    updateSettings(roomId, socketId, newSettings) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        if (room.hostId !== socketId) return false; // 严防篡权

        room.settings = { ...room.settings, ...newSettings };
        return true;
    }

    leaveRoom(roomId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        room.players = room.players.filter(p => p.socketId !== socketId);

        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            return { destroyed: true };
        }

        if (room.hostId === socketId && room.players.length > 0) {
            room.hostId = room.players[0].socketId; // 传位给第一个还在的人
            room.players[0].isHost = true;
        }

        return { destroyed: false, room };
    }
    // 玩家排序逻辑 (仅房主)
    reorderPlayers(roomId, socketId, playerSocketId, direction) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        if (room.hostId !== socketId) return false; // 严防篡权
        if (room.status !== 'lobby') return false; // 游戏中不可重排

        const idx = room.players.findIndex(p => p.socketId === playerSocketId);
        if (idx === -1) return false;

        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= room.players.length) return false;

        // 交换位置
        const temp = room.players[idx];
        room.players[idx] = room.players[newIdx];
        room.players[newIdx] = temp;

        return true;
    }
}

module.exports = new RoomManager();


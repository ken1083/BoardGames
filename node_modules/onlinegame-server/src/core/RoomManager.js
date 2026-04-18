class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.gameRegistry = [];
    }

    async initialize() {
        try {
            const registryModule = await import('../../../../shared/game-registry.js');
            this.gameRegistry = registryModule.GAME_REGISTRY;
            console.log('✅ RoomManager registry loaded');
        } catch (error) {
            console.error('❌ RoomManager failed to load registry:', error);
        }
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

    // Support forced ID mapping and persistent playerId
    createRoom(hostPlayerId, hostSocketId, hostName, gameType = 'treasure_hunt', forcedRoomId = null) {
        const roomId = forcedRoomId ? forcedRoomId.toUpperCase() : this.generateRoomId();

        // 从注册表中获取游戏配置
        const gameDef = this.gameRegistry.find(g => g.id === gameType);
        const initialMaxPlayers = gameDef?.gamePlay?.maxPlayers || 2;

        const room = {
            id: roomId,
            gameType: gameType,
            hostId: hostPlayerId, // Using playerId instead of socketId
            status: 'lobby',
            settings: { maxPlayers: initialMaxPlayers },
            players: [
                { playerId: hostPlayerId, socketId: hostSocketId, name: hostName.substring(0, 15), isHost: true, online: true }
            ],
            gameState: { counter: 0 } // For sync testing
        };
        this.rooms.set(roomId, room);
        return room;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    findRoomsByPlayerId(playerId) {
        const playerRooms = [];
        for (const room of this.rooms.values()) {
            if (room.players.some(p => p.playerId === playerId)) {
                playerRooms.push(room);
            }
        }
        return playerRooms;
    }

    joinRoom(roomId, playerId, socketId, playerName, gameType) {
        let room = this.rooms.get(roomId);

        if (!room) {
            console.log(`[+] 连进未建立的房间 ${roomId}，现已自动开创它。`);
            room = this.createRoom(playerId, socketId, playerName, gameType || 'treasure_hunt', roomId);
            return { room, isNew: true };
        }

        // 如果玩家已经在房间中（断线重连或刷新），更新其Socket ID并恢复在线状态
        const existingPlayer = room.players.find(p => p.playerId === playerId);
        if (existingPlayer) {
            existingPlayer.socketId = socketId;
            existingPlayer.online = true;
            return { room, isNew: false, isRejoin: true };
        }

        if (room.status !== 'lobby') return { error: '❌ 这个房间的游戏早就开始了，不可硬闯！' };
        if (room.players.length >= room.settings.maxPlayers) return { error: '❌ 房间已满（可在房主设置提高人数上限）' };

        // 重名处理
        let finalName = playerName.substring(0, 15);
        if (room.players.some(p => p.name === finalName)) {
            finalName = finalName + ' (2)';
        }

        room.players.push({ playerId, socketId, name: finalName, isHost: false, online: true });
        return { room, isNew: false, isRejoin: false };
    }

    // Rejoin existing room without updating name
    rejoinRoom(roomId, playerId, socketId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        const player = room.players.find(p => p.playerId === playerId);
        if (player) {
            player.socketId = socketId;
            player.online = true;
            return room;
        }
        return null;
    }

    // 标记玩家离线 (不断开房间)
    markPlayerOffline(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        const player = room.players.find(p => p.playerId === playerId);
        if (player) {
            player.online = false;
        }
        return room;
    }

    // 改名逻辑
    renamePlayer(roomId, playerId, newName) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const player = room.players.find(p => p.playerId === playerId);
        if (player) {
            player.name = newName.substring(0, 15);
            return true;
        }
        return false;
    }

    // 改配置逻辑
    updateSettings(roomId, playerId, newSettings) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        if (room.hostId !== playerId) return false;

        room.settings = { ...room.settings, ...newSettings };
        return true;
    }

    // 主动彻底离开房间
    leaveRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        room.players = room.players.filter(p => p.playerId !== playerId);

        if (room.players.length === 0) {
            this.rooms.delete(roomId);
            return { destroyed: true };
        }

        // 房主转移
        if (room.hostId === playerId && room.players.length > 0) {
            room.hostId = room.players[0].playerId;
            room.players[0].isHost = true;
        }

        return { destroyed: false, room };
    }

    // 玩家排序逻辑 (仅房主)
    reorderPlayers(roomId, hostPlayerId, targetPlayerId, direction) {
        const room = this.rooms.get(roomId);
        if (!room) return false;
        if (room.hostId !== hostPlayerId) return false;
        if (room.status !== 'lobby') return false;

        const idx = room.players.findIndex(p => p.playerId === targetPlayerId);
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

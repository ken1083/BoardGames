/**
 * shared/constants.js
 * 前后端共享的常量定义
 */

// 游戏类型
const GAME_TYPES = {
    TREASURE_HUNT: 'treasure_hunt',
    BATTLE_LINE: 'battle_line'
};

// 房间状态
const ROOM_STATUS = {
    LOBBY: 'lobby',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

// 玩家颜色 (全局配置)
const PLAYER_COLORS = ['#ff3b30', '#007aff', '#8d30ff', '#34c759', '#5856d6', '#5ac8fa'];

// Socket.io事件名
const SOCKET_EVENTS = {
    JOIN_OR_CREATE_ROOM: 'JOIN_OR_CREATE_ROOM',
    ROOM_UPDATED: 'ROOM_UPDATED',
    START_GAME: 'START_GAME',
    GAME_STARTED: 'GAME_STARTED',
    GAME_ACTION: 'GAME_ACTION',
    GAME_STATE_UPDATED: 'GAME_STATE_UPDATED',
    GAME_ERROR: 'GAME_ERROR',
    CHAT_MESSAGE: 'CHAT_MESSAGE',
    NEW_CHAT_MESSAGE: 'NEW_CHAT_MESSAGE',
    END_GAME: 'END_GAME',
    RENAME: 'RENAME',
    CHANGE_SETTINGS: 'CHANGE_SETTINGS'
};

module.exports = {
    GAME_TYPES,
    ROOM_STATUS,
    PLAYER_COLORS,
    SOCKET_EVENTS
};

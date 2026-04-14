/**
 * shared/constants.js
 * 前后端共享的常量定义
 */

// 游戏类型
export const GAME_TYPES = {
    TREASURE_HUNT: 'treasure_hunt',
    BATTLE_LINE: 'battle_line'
};

// 房间状态
export const ROOM_STATUS = {
    LOBBY: 'lobby',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

// 游戏阶段
export const GAME_PHASES = {
    SETUP_TARGET: 'SETUP_TARGET',
    SETUP_START: 'SETUP_START',
    PLACE_X: 'PLACE_X',
    MOVE: 'MOVE'
};

// Socket.io事件名
export const SOCKET_EVENTS = {
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

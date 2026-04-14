/**
 * Socket.io错误处理工具
 */

class SocketError extends Error {
    constructor(message, code = 'SOCKET_ERROR') {
        super(message);
        this.code = code;
        this.name = 'SocketError';
    }
}

module.exports = {
    SocketError,
    ERRORS: {
        ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
        ROOM_FULL: 'ROOM_FULL',
        INVALID_MOVE: 'INVALID_MOVE',
        NOT_YOUR_TURN: 'NOT_YOUR_TURN',
        GAME_NOT_STARTED: 'GAME_NOT_STARTED'
    }
};

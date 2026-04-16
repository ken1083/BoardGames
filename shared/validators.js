/**
 * shared/validators.js (可选)
 * 通用数据验证函数
 */

/**
 * 验证房间ID格式
 * 要求：恰好4个字符，仅包含大写字母和数字 [A-Z0-9]
 */
export function isValidRoomId(roomId) {
    return /^[A-Z0-9]{4}$/.test(roomId);
}

/**
 * 验证玩家名称
 */
export function isValidPlayerName(name) {
    return typeof name === 'string' && name.length > 0 && name.length <= 15;
}

/**
 * 验证坐标是否在棋盘内
 */
export function isValidBoardPosition(r, c, boardSize = 9) {
    return r >= 0 && r < boardSize && c >= 0 && c < boardSize;
}

export default {
    isValidRoomId,
    isValidPlayerName,
    isValidBoardPosition
};

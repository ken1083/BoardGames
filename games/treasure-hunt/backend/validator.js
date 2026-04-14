/**
 * TreasureHunt游戏的游戏规则验证模块
 * 提取复用的验证逻辑，所有常量从 constants.js 导入，避免重复定义
 */

// ═══════════════════════════════════════════════════════════════════════════════════
// 导入常量 - 集中管理，避免重复定义
// ═══════════════════════════════════════════════════════════════════════════════════
const {
    TREASURE_HUNT_SIZE: SIZE,
    TREASURE_HUNT_PERMANENT_X: PERMANENT_X
} = require('./constants');

/**
 * 检查坐标是否在棋盘范围内
 */
function isOutOfBounds(r, c) {
    return r < 0 || r >= SIZE || c < 0 || c >= SIZE;
}

/**
 * 检查坐标是否为有效的空白格子
 */
function isValidEmptyCell(board, r, c) {
    if (isOutOfBounds(r, c)) return false;
    return board[r][c] === '';
}

/**
 * 检查坐标是否为字母格（边缘宝藏格）
 */
function isLetterCell(board, r, c) {
    if (isOutOfBounds(r, c)) return false;
    const val = board[r][c];
    return val.length === 1 && val !== 'X' && val !== 'x' && val !== '';
}

/**
 * 检查格子是否被阻挡（永久或临时障碍）
 */
function isBlocked(board, r, c) {
    if (isOutOfBounds(r, c)) return true;
    return board[r][c] === 'X' || board[r][c] === 'x';
}

module.exports = {
    isValidEmptyCell,
    isLetterCell,
    isBlocked,
    isOutOfBounds,
    PERMANENT_X,
    SIZE
};

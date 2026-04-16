/**
 * TreasureHunt游戏的常量定义 - 集中管理，避免重复定义
 */

const TREASURE_HUNT_SIZE = 11;

const TREASURE_HUNT_LETTERS = [
    { r: 1, c: 1, n: 'A' }, { r: 1, c: 5, n: 'B' }, { r: 1, c: 9, n: 'C' },
    { r: 5, c: 1, n: 'D' }, { r: 5, c: 9, n: 'E' },
    { r: 9, c: 1, n: 'F' }, { r: 9, c: 5, n: 'G' }, { r: 9, c: 9, n: 'H' }
];

const TREASURE_HUNT_PERMANENT_X = [
    { r: 1, c: 4 }, { r: 1, c: 6 }, { r: 3, c: 3 }, { r: 3, c: 7 },
    { r: 4, c: 1 }, { r: 4, c: 9 }, { r: 6, c: 1 }, { r: 6, c: 9 },
    { r: 7, c: 3 }, { r: 7, c: 7 }, { r: 9, c: 4 }, { r: 9, c: 6 }
];

const { PLAYER_COLORS } = require('../../../shared/constants');

// 玩家颜色 (全局统一配置)
const TREASURE_HUNT_COLORS = PLAYER_COLORS;

const GAME_PHASES = {
    SETUP_POSITIONS: 'SETUP_POSITIONS',
    PLACE_X: 'PLACE_X',
    MOVE: 'MOVE'
};

// ═══════════════════════════════════════════════════════════════════════════════════
// CommonJS 导出（Node.js 标准）
// ═══════════════════════════════════════════════════════════════════════════════════
module.exports = {
    TREASURE_HUNT_SIZE,
    TREASURE_HUNT_LETTERS,
    TREASURE_HUNT_PERMANENT_X,
    TREASURE_HUNT_COLORS,
    GAME_PHASES
};

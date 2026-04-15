/**
 * TreasureHunt游戏的常量定义 - 集中管理，避免重复定义
 */

const TREASURE_HUNT_SIZE = 9;

const TREASURE_HUNT_LETTERS = [
    { r: 0, c: 0, n: 'A' }, { r: 0, c: 4, n: 'B' }, { r: 0, c: 8, n: 'C' },
    { r: 4, c: 0, n: 'D' }, { r: 4, c: 8, n: 'E' },
    { r: 8, c: 0, n: 'F' }, { r: 8, c: 4, n: 'G' }, { r: 8, c: 8, n: 'H' }
];

const TREASURE_HUNT_PERMANENT_X = [
    { r: 0, c: 3 }, { r: 0, c: 5 }, { r: 2, c: 2 }, { r: 2, c: 6 },
    { r: 3, c: 0 }, { r: 3, c: 8 }, { r: 5, c: 0 }, { r: 5, c: 8 },
    { r: 6, c: 2 }, { r: 6, c: 6 }, { r: 8, c: 3 }, { r: 8, c: 5 }
];

const TREASURE_HUNT_COLORS = ['#ff3b30', '#007aff', '#8d30ff', '#34c759', '#5856d6', '#5ac8fa'];

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

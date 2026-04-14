/**
 * shared/types.js
 * 数据类型定义（JSDoc格式）
 */

/**
 * @typedef {Object} Player
 * @property {string} socketId - Socket连接ID
 * @property {string} name - 玩家名称
 * @property {boolean} isHost - 是否为房主
 */

/**
 * @typedef {Object} Room
 * @property {string} id - 房间ID
 * @property {string} gameType - 游戏类型
 * @property {string} hostId - 房主的socketId
 * @property {string} status - 房间状态 ('lobby' | 'playing' | 'finished')
 * @property {Array<Player>} players - 玩家列表
 * @property {Object} settings - 房间设置
 * @property {number} settings.maxPlayers - 最大玩家数
 * @property {Object} gameState - 游戏状态
 */

/**
 * @typedef {Object} GameState
 * @property {Array<Array<string>>} board - 游戏棋盘
 * @property {Array<GamePlayer>} players - 游戏中的玩家
 * @property {number} turnIndex - 当前轮次的玩家索引
 * @property {string} phase - 当前游戏阶段
 * @property {string|null} winner - 赢家名称
 * @property {string} message - 游戏消息
 */

/**
 * @typedef {Object} GamePlayer
 * @property {string} id - 玩家ID
 * @property {string} name - 玩家名称
 * @property {string} color - 玩家颜色
 * @property {Object|null} startPos - 起始位置
 * @property {Object|null} currentPos - 当前位置
 * @property {Object|null} targetPos - 目标位置
 * @property {string} targetName - 目标名称
 */

export { };

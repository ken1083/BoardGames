/**
 * 寻宝之战 前端模块导出入口
 * 
 * 这个文件统一导出该游戏的所有前端资源，使得后续可以通过动态导入获取。
 * 根据 shared/game-registry.js 中的 componentPath 加载。
 */

// 导出主游戏组件
export { default as TreasureHuntBoard } from './Board.jsx';

// 默认导出（供 lazy 导入使用）
export { default } from './Board.jsx';

// 导出游戏 hooks（供旧代码兼容）
export { useTreasureHuntGame } from './hooks.js';

// 导出单个格子组件（可选，若需要外部访问）
export { default as Cell } from './Cell.jsx';

/**
 * 游戏组件导出说明：
 * 
 * 1. 默认导出 Board 组件：
 *    import Board from './games/treasure-hunt/frontend/'
 *    const Board = (await import('./games/treasure-hunt/frontend/')).default
 * 
 * 2. 具名导出其他组件：
 *    import { Cell, useTreasureHuntGame } from './games/treasure-hunt/frontend/'
 * 
 * 3. 支持动态导入：
 *    const { default: Board } = await import('./games/treasure-hunt/frontend/')
 */
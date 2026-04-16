/**
 * constants/theme.js - 前端UI主题常量
 * 
 * 职责：
 * 定义应用的颜色和样式主题（Tailwind CSS类名集合）
 * 用于棋盘格、障碍物、宝藏等游戏元素的样式
 * 
 * 注意：游戏类型定义（GAME_TYPES）应该从shared/constants.js导入
 * 避免与后端定义重复
 */

/**
 * THEME对象：存储所有UI组件的Tailwind CSS类名
 * 好处：
 * 1. 集中管理样式：改一个地方，所有使用这些样式的组件都跟着更新
 * 2. 易于切换主题：改THEME对象就能改整个应用的配色
 * 3. 避免魔法字符串：不用在各个组件中硬编码Tailwind类名
 * 
 * 使用示例（在Board.jsx中）：
 *   <div className={THEME.cell}> 棋盘格 </div>
 *   <div className={`${THEME.cell} ${THEME.activeCell}`}> 可交互的格 </div>
 */
export const THEME = {
    // 棋盘背景色
    bg: 'bg-[#e7e1d5]',

    // 棋盘空白格的背景
    boardSpace: 'bg-[#d6cebb]',

    // 普通棋盘格（玩家可以经过的格）
    cell: 'bg-[#f4ebd8] border-[3px] border-[#e3d7c1] text-[#c9bfa5]',

    // 鼠标悬停在格子上时的样式
    activeCell: 'hover:border-[#a89574] hover:shadow-xl cursor-pointer transform hover:-translate-y-1 transition-all',

    // 临时障碍（玩家放置的X）
    obst: 'bg-[#5D4037] border-[3px] border-[#4E342E] shadow-sm',

    // 永久障碍（地图固定的障碍）
    perm: 'bg-[#5D4037] border-[3px] border-[#4E342E] shadow-sm',

    // 宝藏格（玩家的目标）
    treasure: 'bg-[#e3cb98] text-[#705020] border-[3px] border-[#cba76d] shadow-sm font-black'
};

// import { GAME_TYPES } from '../../../../shared/constants.js';
// export const GAME_TYPES = GAME_TYPES;

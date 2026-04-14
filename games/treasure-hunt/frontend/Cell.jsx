/**
 * games/treasure-hunt/Cell.jsx - 单个棋盘格子组件
 * 
 * 职责：
 * 1. 渲染一个棋盘格子（9×9棋盘中的1/81）
 * 2. 根据格子内容显示不同的样式：
 *    - 字母格（A-H）：宝藏位置
 *    - X：永久障碍（地图固定）
 *    - x：临时障碍（玩家放置）
 *    - 玩家棋子：显示玩家颜色的圆圈
 * 3. 处理格子点击事件
 * 4. 显示虫聚动画（animate-ping）表示是否可交互
 * 
 * Props说明（来自父组件Board.jsx）：
 * - r, c：格子的行列坐标（0-8）
 * - value：格子的内容（字母、X/x或空字符串）
 * - gameState：整个游戏状态对象
 * - isSetupPhase：是否在战前准备阶段
 * - isMyTurn：是否是我的回合
 * - isGameOver：游戏是否已结束
 * - onClick：格子点击回调函数
 * 
 * React概念：
 * - Props透传：从Board.jsx接收所有必要的信息
 * - 条件渲染：根据value和gameState显示不同内容
 * - 动态类名：cn()合并多个条件类名
 * - 内联样式：style={{ backgroundColor }}动态设置背景色
 */

import { cn } from '@utils/utils';
import { THEME } from '@constants/theme';

export default function Cell({
    // 坐标
    r,
    c,

    // 格子内容：单个字符（字母、X、x或空字符串）
    value,

    // 完整游戏状态对象
    gameState,

    // 阶段和玩家状态标志
    isSetupPhase,
    isMyTurn,
    isGameOver,

    // 预选坐标（本玩家的选中格子）
    myTempSelection,

    // 点击回调
    onClick,

    // 允许该格子显示为目标的拥有者ID
    visibleTargetId
}) {
    // ═══════════════════════════════════════════════════════════════════════════════
    // 根据格子content确定样式和显示内容
    // ═══════════════════════════════════════════════════════════════════════════════

    let content = '';          // 格子内显示的文本（如字母A）
    let cellStyle = THEME.cell;  // 格子的CSS类名
    let interactive = false;
    if (!isGameOver) {
        if (isSetupPhase) {
            // 在战前准备阶段，所有带字母的空格都允许点击
            if (value.length === 1 && value !== 'X' && value !== 'x' && value !== '') {
                interactive = true;
            }
        } else {
            interactive = isMyTurn;
        }
    }

    /**
     * 条件判断：根据value确定格子样式
     * value是一个字符串：
     *   - 单个字母（A-H）：宝藏位置，显示字母，用treasure样式
     *   - 'X'：永久障碍，用perm样式
     *   - 'x'：临时障碍（玩家放置），用obst样式
     *   - ''：空格子，用普通cell样式
     */
    if (value.length === 1 && value !== 'X' && value !== 'x') {
        // 字母格：显示字母内容，用宝藏样式渲染
        content = value;
        cellStyle = cn(THEME.cell, THEME.treasure);
    } else if (value === 'X') {
        // 永久障碍
        cellStyle = THEME.perm;
    } else if (value === 'x') {
        // 临时障碍
        cellStyle = THEME.obst;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 检测格子上是否有玩家棋子
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * filter()：获取所有位于此格子的玩家
     */
    const occupants = !isSetupPhase
        ? gameState.players.filter(p => p.currentPos && p.currentPos.r === r && p.currentPos.c === c)
        : [];

    // ═══════════════════════════════════════════════════════════════════════════════
    // 检测这个格子是否是某个玩家的目标（宝藏位置）
    // ═══════════════════════════════════════════════════════════════════════════════

    // Collect ALL treasures pointing to this cell that are visible to current player
    // visibleTargetId是我配置的下一个玩家的ID，只有该玩家的藏宝点才对我可见
    const visibleTreasures = !isSetupPhase && gameState.phase && visibleTargetId
        ? gameState.players.filter(p => p.targetPos && p.targetPos.r === r && p.targetPos.c === c && p.id === visibleTargetId)
        : [];

    // Check if this cell is currently the one pre-selected by the player
    const isTempSelected = myTempSelection && myTempSelection.r === r && myTempSelection.c === c;

    // ═══════════════════════════════════════════════════════════════════════════════
    // JSX渲染
    // ═══════════════════════════════════════════════════════════════════════════════

    return (
        <div
            onClick={() => onClick(r, c)}
            // cn()函数合并多个类名，处理冲突
            className={cn(
                "aspect-square w-full rounded-md flex items-center justify-center font-bold text-xl sm:text-2xl relative box-border",
                cellStyle,  // 基础样式（THEME.cell/THEME.perm/THEME.obst）
                interactive ? THEME.activeCell : "",  // 如果可交互则添加悬停效果
                isTempSelected ? "border-[3px] sm:border-4 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]" : ""
            )}
        >
            {/* 背景内容：字母（A-H） */}
            {/* 如果格子里有字母内容且没有玩家棋子，则显示字母 */}
            {content && occupants.length === 0 && <span>{content}</span>}

            {/* 宝藏标记（多个彩色点，防止重叠） */}
            {visibleTreasures.length > 0 && (
                <div
                    className="absolute top-1 right-1 w-3 h-3 z-10 rounded-full border-2 border-white shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                    style={{ backgroundColor: visibleTreasures[0].color }}
                    title={`${visibleTreasures[0].name}的藏宝点`}
                ></div>
            )}

            {/* 玩家棋子（如果此格子有玩家） */}
            {occupants.length > 0 && (
                <div className="absolute inset-[8px] sm:inset-[10px] rounded-full overflow-hidden flex shadow-md ring-2 ring-white/10">
                    {occupants.map(occ => (
                        <div
                            key={occ.id}
                            className="flex-1 h-full flex justify-center items-center relative"
                            style={{ backgroundColor: occ.color }}
                            title={occ.name}
                        >
                            {/* 棋子内部给细微的光泽效果或ping标志，为防止重叠，缩小ping点尺寸 */}
                            <div className="w-[4px] h-[4px] bg-white rounded-full animate-ping opacity-60"></div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

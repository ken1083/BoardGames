/**
 * games/treasure-hunt/Board.jsx - 寻宝之战游戏主界面
 * 
 * 职责（复杂度：高 ⚠️）：
 * 1. 显示9×9的游戏棋盘
 * 2. 处理游戏的两个阶段：SETUP_POSITIONS（战前准备）和MOVE_PHASE（游戏进行中）
 * 3. 监听Socket事件：游戏状态更新、游戏错误、聊天消息
 * 4. 显示胜利画面、玩家信息、错误提示
 * 5. 右侧边栏：聊天面板和玩家列表
 * 
 * 重要概念：
 * - Game State（游戏状态）：包含棋盘、玩家、当前阶段、消息等
 * - Socket实时更新：通过GAME_STATE_UPDATED事件实时同步游戏状态
 * - Turn System（回合制）：gameState.turnIndex指示当前玩家
 * - UI分条件渲染：根据phase、winner、isMyTurn显示不同内容
 * 
 * 代码结构：
 * 1. 状态管理（useState）
 * 2. Socket事件注册（useEffect）
 * 3. 加载状态检查
 * 4. 错误状态检查
 * 5. 事件处理函数（handleCellClick、handleEndGame、sendChat）
 * 6. JSX渲染（棋盘、导航、侧栏等）
 */

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from '@services/socket';
import { cn } from '@utils/utils';
import { THEME } from './theme';
import { Trophy, AlertTriangle, Info, Home, XCircle, Send, MessageSquare, LogOut, RotateCcw } from 'lucide-react';
import { useIdentity } from '../../../platform/web/src/hooks/useIdentity'
import { useDialog } from '../../../platform/web/src/core/contexts/DialogContext';
import Cell from './Cell';

export default function TreasureHuntBoard({ gameDef, initialRoomData, initialGameState, onBackToLobby, onBackToRoom }) {
    const { roomId } = useParams();
    // ═══════════════════════════════════════════════════════════════════════════════
    // 状态管理
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * 游戏状态
     * 包含：board、players、phase、turnIndex、winner、playerConfigCount、message等
     */
    const { showToast, confirm } = useDialog();
    const playerId = useIdentity();
    const [gameState, setGameState] = useState(initialGameState);

    /**
     * 错误消息（显示在页面顶端，3秒后自动消失）
     */
    const [errorMsg, setErrorMsg] = useState('');

    /**
     * 聊天日志：[{ playerName, message, timestamp }, ...]
     */
    const [chatLog, setChatLog] = useState([]);

    /**
     * 聊天输入框当前内容
     */
    const [chatInput, setChatInput] = useState('');

    /**
     * 聊天窗口的容器ref，用于自动滚动到最新消息
     */
    const chatContainerRef = useRef(null);

    // ═══════════════════════════════════════════════════════════════════════════════
    // Socket事件监听（useEffect）
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        /**
         * GAME_STATE_UPDATED：服务器派发的游戏状态更新
         * 每当有玩家操作时都会触发，用于实时同步所有客户端的游戏状态
         */
        const handleUpdate = (state) => {
            // 校验房间 ID，防止旧房间消息干扰
            if (state.roomId && state.roomId !== roomId) return;

            setGameState(state);
            setErrorMsg('');  // 新状态到达时清除旧错误消息
        };

        /**
         * GAME_ERROR：游戏操作失败（如非法移动、死门判定等）
         * msg：错误描述文本
         */
        const handleError = (msg) => {
            setErrorMsg(msg);
            // 4秒后自动消除错误提示
            setTimeout(() => setErrorMsg(''), 4000);
        };

        /**
         * NEW_CHAT_MESSAGE：新聊天消息到达
         * msgObj：{ playerName, message, timestamp }
         */
        const handleChat = (msgObj) => {
            setChatLog(prev => [...prev, msgObj]);
            // 使用 direct scroll 替代 scrollIntoView 以防止浏览器窗口跳转
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            }, 100);
        };

        /**
         * GAME_STARTED：服务器派发游戏重开
         */
        const handleGameRestart = ({ gameState: newState, roomId: incomingRoomId }) => {
            if (incomingRoomId && incomingRoomId !== roomId) return;

            setGameState(newState);
            setInGameSelection(null);   // 清空当前预选
            setErrorMsg('');            // 清空错误信息
        };

        /**
         * FORCE_BACK_TO_ROOM：游戏被强制终止（如房主结束游戏）
         */
        const handleForceBack = (room) => {
            if (room && room.id !== roomId) return;

            if (onBackToRoom) {
                onBackToRoom(room);
            } else {
                onBackToLobby();
            }
        };

        // 注册所有socket事件监听器
        socket.on('GAME_STATE_UPDATED', handleUpdate);
        socket.on('GAME_STARTED', handleGameRestart);
        socket.on('GAME_ERROR', handleError);
        socket.on('NEW_CHAT_MESSAGE', handleChat);
        socket.on('FORCE_BACK_TO_ROOM', handleForceBack);

        // cleanup函数：组件卸载时移除监听，防止内存泄漏
        return () => {
            socket.off('GAME_STATE_UPDATED', handleUpdate);
            socket.off('GAME_STARTED', handleGameRestart);
            socket.off('GAME_ERROR', handleError);
            socket.off('NEW_CHAT_MESSAGE', handleChat);
            socket.off('FORCE_BACK_TO_ROOM', handleForceBack);
        };
    }, [onBackToLobby]);

    /**
     * 将服务器的系统消息注入到聊天室中
     */
    useEffect(() => {
        if (gameState?.message) {
            setChatLog(prev => {
                // 避免重复连续推送相同的系统消息
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isSystem && lastMsg.text === gameState.message) {
                    return prev;
                }
                return [...prev, {
                    sender: '系统',
                    text: gameState.message,
                    time: Date.now(),
                    isSystem: true
                }];
            });
            setTimeout(() => {
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [gameState?.message]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 加载状态检查  
    // ═══════════════════════════════════════════════════════════════════════════════

    // 如果游戏状态还在加载中，显示加载界面
    if (!gameState) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-100">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
                    <p className="text-2xl font-bold text-neutral-900">⏳ Loading game...</p>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 错误状态检查
    // ═══════════════════════════════════════════════════════════════════════════════

    // 如果游戏状态不完整（缺少棋盘或玩家），显示错误
    if (!gameState.board || !gameState.players) {
        console.error('Invalid game state:', gameState);
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-100">
                <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
                    <p className="text-2xl font-bold text-red-600">❌ Game Error</p>
                    <p className="mt-2 text-neutral-600">Invalid game state received</p>
                    <button
                        onClick={onBackToLobby}
                        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                    >
                        Back to Lobby
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // 计算辅助变量
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * 判断当前是否在战前准备阶段
     * SETUP_POSITIONS：所有玩家配置各自的出发点和藏宝点
     * MOVE_PHASE：游戏正式进行，轮流放置障碍和移动
     */
    const isSetupPhase = gameState.phase === 'SETUP_POSITIONS';

    /**
     * 获取当前回合的玩家
     * turnIndex是当前玩家在players数组中的索引
     */
    const currentPlayer = gameState.turnIndex !== undefined && gameState.turnIndex !== null
        ? gameState.players[gameState.turnIndex]
        : null;

    /**
     * 条件渲染：非战前准备阶段 且 currentPlayer的ID等于当前 playerId
     */
    const isMyTurn = !isSetupPhase && currentPlayer && currentPlayer.id === playerId;

    /**
     * 判断是否是房间主持人
     * 只有主持人有权强制终止游戏
     */
    const isHost = initialRoomData?.hostId === playerId;

    /**
     * inGameSelection：记录玩家在游戏进行阶段预选的格子
     * 格式：{r, c}
     */
    const [inGameSelection, setInGameSelection] = useState(null);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 事件处理函数
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * 处理棋盘格子点击事件
     * @param {number} r - 行号（0-8）
     * @param {number} c - 列号（0-8）
     */
    const handleCellClick = (r, c) => {
        // 游戏已结束，禁止操作
        if (gameState.winner) return;

        // 战前准备阶段：预选操作由服务器或前端状态处理
        if (isSetupPhase) {
            socket.emit('GAME_ACTION', {
                payload: { r, c }
            });
            return;
        }

        // 游戏阶段：只有当前玩家能执行操作
        if (!isMyTurn) {
            setErrorMsg("不要着急，目前尚未轮到你的回合！");
            setTimeout(() => setErrorMsg(''), 3000);
            return;
        }

        // 游戏进行阶段：仅在本地记录预选的格子，不直接发送给服务器
        setInGameSelection({ r, c });
    };

    /**
     * 确认游戏进行中的操作（放置障碍/移动）
     */
    const handleConfirmInGameAction = () => {
        if (!inGameSelection) return;

        socket.emit('GAME_ACTION', {
            type: gameState.phase,
            payload: inGameSelection
        });

        // 确认后清空预选状态
        setInGameSelection(null);
    };

    /**
     * 处理游戏结束（房主权限）
     * 强制结束游戏并让所有玩家返回房间
     */
    const handleEndGame = async () => {
        // 确认对话框：防止误点
        if (await confirm("确定要终止游戏吗？")) {
            socket.emit('END_GAME');
        }
    };

    /**
     * 处理重开游戏（房主权限）
     * 即刻重置游戏状态并开始新的一局
     */
    const handleRestartGame = async () => {
        if (await confirm("确定要重开吗？当前游戏进度将丢失。")) {
            socket.emit('RESTART_GAME');
        }
    };

    /**
     * 处理聊天消息发送
     * @param {Event} e - 表单提交事件
     */
    const sendChat = (e) => {
        e.preventDefault();  // 防止表单提交的默认行为（页面刷新）
        if (chatInput.trim()) {  // 如果输入不为空
            socket.emit('CHAT_MESSAGE', chatInput);
            setChatInput('');  // 清空输入框
        }
    };

    return (
        <div className={`min-h-screen ${THEME.bg} p-4 md:p-8 font-sans transition-colors duration-500 min900px]`}>
            {/* 错误提示 */}
            {errorMsg && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-900 border border-neutral-700 shadow-2xl text-white px-6 py-3 rounded-[2rem] font-bold">
                    <AlertTriangle className="text-red-400" size={20} />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* 顶部导航 */}
            <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center bg-white/60 backdrop-blur-md px-6 py-4 rounded-[2rem] shadow-sm border border-[#e3d7c1]">
                <div className="flex items-center gap-4">
                    <span className="text-4xl">{gameDef?.icon || '🎮'}</span>
                    <div>
                        <h1 className="text-xl font-black text-[#5D4037] tracking-tight leading-none mb-1">
                            {gameDef?.name_ch || 'In Game'} {gameDef?.name_en || ''}
                        </h1>
                        <p className="text-xs text-[#8d7c67] font-bold tracking-widest uppercase">
                            Room // {initialRoomData?.id}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* 重开一局 / 终止游戏 */}
                    {isHost && (
                        <div className="flex items-center gap-2">
                            <button onClick={handleRestartGame} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl font-bold text-sm transition-colors border border-emerald-200">
                                <RotateCcw size={16} /> <span className="hidden sm:inline">重开一局</span>
                            </button>
                            <button onClick={handleEndGame} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-sm transition-colors border border-red-200">
                                <XCircle size={16} /> <span className="hidden sm:inline">终止游戏</span>
                            </button>
                        </div>
                    )}

                    {/* 回到大厅 */}
                    <button onClick={async () => {
                        if (await confirm("确定要回到大厅吗？（游戏不会停止）")) {
                            onBackToLobby();
                        }
                    }} className="p-2 text-[#a89574] hover:text-[#5D4037] transition-colors bg-[#f4ebd8] rounded-xl border border-[#e3d7c1]" title="返回大厅">
                        <Home size={22} />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
                {/* 左侧：游戏板面 */}
                <div className="flex-1 w-full flex flex-col items-center">
                    {/* Setup Phase or Game Phase Instructions directly above the board */}
                    <div className="w-full max-w-[700px] text-center mb-4 min-h-[40px] flex items-center justify-center">
                        {gameState.winner ? (
                            <div className="inline-block bg-yellow-400 text-yellow-900 px-8 py-3 rounded-2xl font-black text-xl shadow-lg">
                                👑 {gameState.winner} 成为了海贼王！ 👑
                            </div>
                        ) : isSetupPhase ? (
                            <div className="text-sm font-bold text-neutral-500 bg-white px-6 py-2 rounded-xl shadow-sm border border-neutral-100">
                                {(() => {
                                    const myIdx = gameState.players.findIndex(p => p.id === playerId);
                                    const targetPlayer = myIdx !== -1 ? gameState.players[(myIdx + 1) % gameState.players.length] : null;
                                    const targetName = targetPlayer ? targetPlayer.name : '未知玩家';

                                    const myConfig = (gameState.playerConfigCount && gameState.playerConfigCount[playerId]) ?? 0;
                                    if (myConfig === 0) return `👉 请点击棋盘上的字母格预选 ${targetName} 的藏宝点`;
                                    if (myConfig === 1) return `👉 请点击另一个字母格预选 ${targetName} 的出发点`;
                                    return "等待其他玩家完成配置...";
                                })()}
                            </div>
                        ) : isMyTurn ? (
                            <div className="text-sm font-bold text-green-700 bg-green-50 px-6 py-2 rounded-xl shadow-sm border border-green-200 animate-pulse">
                                👉 {currentPlayer?.name}，请选择{gameState.phase === 'PLACE_X' ? '要放置障碍的格子' : '要移动的目标'}
                            </div>
                        ) : null}
                    </div>

                    <div className="w-full max-w-[700px] aspect-square flex justify-center border-box">
                        <div className={`w-full h-full aspect-square grid grid-cols-11 gap-[2px] sm:gap-[3px] p-2 sm:p-0 overflow-hidden rounded-2xl sm:rounded-3xl ${THEME.boardSpace} shadow-inner`}>
                            {(() => {
                                const myIdx = gameState.players.findIndex(p => p.id === playerId);
                                const playerIConfigured = myIdx !== -1 ? gameState.players[(myIdx + 1) % gameState.players.length] : null;
                                const visibleTargetId = playerIConfigured?.id;

                                return gameState.board.map((row, r) =>
                                    row.map((cellValue, c) => (
                                        <Cell
                                            key={`${r}-${c}`}
                                            r={r}
                                            c={c}
                                            value={cellValue}
                                            gameState={gameState}
                                            isSetupPhase={isSetupPhase}
                                            isMyTurn={isMyTurn}
                                            isGameOver={!!gameState.winner}
                                            myTempSelection={isSetupPhase ? (gameState.setupTempSelection && gameState.setupTempSelection[playerId]) : inGameSelection}
                                            visibleTargetId={visibleTargetId}
                                            onClick={handleCellClick}
                                        />
                                    ))
                                );
                            })()}
                        </div>
                    </div>

                    {/* Confirm Button Area below board */}
                    <div className="w-full max-w-[700px] h-[60px] flex items-center justify-center mt-4">
                        {isMyTurn && inGameSelection && !isSetupPhase && !gameState.winner && (
                            <button
                                onClick={handleConfirmInGameAction}
                                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all flex items-center gap-2 animate-bounce cursor-pointer border-2 border-emerald-400"
                            >
                                ✅ 确认{gameState.phase === 'PLACE_X' ? '放障碍' : '移动'}
                            </button>
                        )}
                    </div>
                </div>

                {/* 右侧：玩家信息 & 通讯频道 */}
                <div className="w-full lg:w-[340px] flex flex-col gap-6 shrink-0 lg:h-[calc(100vh-120px)] lg:sticky lg:top-6">
                    {/* 准备阶段：简洁占位符 */}
                    {isSetupPhase && (
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-neutral-100 shrink-0">
                            <h2 className="text-xl font-extrabold text-neutral-900 mb-5">⏳ 准备中</h2>
                            <div className="space-y-3 text-sm text-neutral-600">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="font-bold text-blue-900">配置进度</p>
                                    <div className="mt-1 text-junior space-y-3">
                                        <p>
                                            {(() => {
                                                const myIdx = gameState.players.findIndex(p => p.id === playerId);
                                                const targetPlayer = myIdx !== -1 ? gameState.players[(myIdx + 1) % gameState.players.length] : null;
                                                const targetName = targetPlayer ? targetPlayer.name : '玩家';

                                                const myConfig = (gameState.playerConfigCount && gameState.playerConfigCount[playerId]) ?? 0;
                                                if (myConfig === 0) return `👉 请为 ${targetName} 预选【藏宝点】`;
                                                if (myConfig === 1) return `👉 请为 ${targetName} 预选【出发点】`;
                                                if (myConfig == 2) return "✅ 已完成，等待其他玩家...";
                                                else return "❌ 异常状态：myConfig=" + myConfig;
                                            })()}
                                        </p>

                                        {/* 只要还没有配置完成，就始终显示确认按钮 */}
                                        {((gameState.playerConfigCount && gameState.playerConfigCount[playerId]) ?? 0) < 2 && (
                                            <button
                                                onClick={() => {
                                                    const myTempSel = gameState.setupTempSelection && gameState.setupTempSelection[playerId];
                                                    const myConfig = (gameState.playerConfigCount && gameState.playerConfigCount[playerId]) ?? 0;

                                                    if (!myTempSel) {
                                                        const pIdx = gameState.players.findIndex(p => p.id === playerId);
                                                        const targetName = gameState.players[(pIdx + 1) % gameState.players.length].name;
                                                        const typeName = myConfig === 0 ? "藏宝点" : "出发点";
                                                        showToast(`请选择一个字母格作为 ${targetName} 的${typeName}！`, "warning");
                                                        return;
                                                    }

                                                    socket.emit('GAME_ACTION', { type: 'CONFIRM_SETUP_SELECTION', payload: {} });
                                                }}
                                                className={cn(
                                                    "w-full py-2.5 rounded-xl font-bold transition-all shadow-sm text-center block",
                                                    (gameState.setupTempSelection && gameState.setupTempSelection[playerId])
                                                        ? "bg-green-500 hover:bg-green-600 text-white shadow-[0_4px_14px_rgba(34,197,94,0.39)]"
                                                        : "bg-neutral-200 text-neutral-500 hover:bg-neutral-300"
                                                )}
                                            >
                                                确认选择
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* 战前准备阶段：显示已保存的配置日志 */}
                                {(() => {
                                    const myConfig = (gameState.playerConfigCount && gameState.playerConfigCount[playerId]) ?? 0;
                                    if (myConfig === 0) return null;

                                    const pIdx = gameState.players.findIndex(p => p.id === playerId);
                                    if (pIdx === -1) return null;
                                    const targetP = gameState.players[(pIdx + 1) % gameState.players.length];

                                    return (
                                        <div className="space-y-2 pt-2 border-t border-neutral-100">
                                            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">已保存的配置</h4>

                                            {myConfig >= 1 && (
                                                <div className="flex items-start gap-2 text-xs font-bold text-blue-800 bg-blue-50/80 p-2.5 rounded-lg border border-blue-100">
                                                    <span className="text-blue-500 mt-0.5">✅</span>
                                                    <span>你已为 {targetP.name} 确认字母 {targetP.targetName} 作为藏宝点</span>
                                                </div>
                                            )}

                                            {myConfig >= 2 && targetP.startPos && (
                                                <div className="flex items-start gap-2 text-xs font-bold text-blue-800 bg-blue-50/80 p-2.5 rounded-lg border border-blue-100">
                                                    <span className="text-blue-500 mt-0.5">✅</span>
                                                    <span>你已为 {targetP.name} 确认字母 {gameState.board[targetP.startPos.r][targetP.startPos.c]} 作为出发点</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <p className="text-xs text-neutral-400 italic">
                                    ℹ️ 等待所有玩家完成选择...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 游戏中：完整Player Intel */}
                    {!isSetupPhase && (
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-neutral-100 shrink-0">
                            <h2 className="text-lg font-extrabold text-neutral-900 mb-4">Player Intel</h2>
                            <div className="space-y-3">
                                {gameState.players.map((p, idx) => {
                                    // 游戏中：显示当前轮玩家、所有出发点、自己为下一位选的藏宝点
                                    const isMyNext = idx === ((gameState.players.findIndex(pl => pl.id === playerId) + 1) % gameState.players.length);

                                    return (
                                        <div key={p.id} className={cn(
                                            "p-3 rounded-2xl border-2 transition-all relative",
                                            gameState.turnIndex === idx
                                                ? "border-blue-500 bg-blue-50/50 shadow-[0_0_15px_rgba(37,99,235,0.1)]"
                                                : "border-neutral-100 bg-neutral-50/50"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.color }}></div>
                                                <span className="font-bold text-sm text-neutral-800 truncate">{p.name}</span>
                                                {p.id === playerId && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">You</span>}
                                                {p.id === initialRoomData?.hostId && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Host</span>}
                                            </div>
                                            <div className="mt-2 text-[11px] sm:text-xs font-bold grid grid-cols-2 gap-y-1">
                                                {p.startPos ? (
                                                    <div className="text-neutral-500">出发: {p.startName}</div>
                                                ) : <div />}

                                                {(isMyNext || gameState.winner) ? (
                                                    <div className="text-blue-600 text-right">藏宝: {p.targetName}</div>
                                                ) : (
                                                    <div className="text-neutral-400 text-right">藏宝: ???</div>
                                                )}

                                                {p.currentPos && (
                                                    <div className="text-emerald-600 col-span-2">当前: [{p.currentPos.r},{p.currentPos.c}]</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 通讯频道 (Chat) */}
                    <div className="bg-white flex-1 p-5 rounded-[2rem] shadow-sm border border-neutral-100 flex flex-col min-h-[300px] max-h-[375px]">
                        <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <MessageSquare size={14} /> 通讯频道
                        </h3>
                        <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-2" ref={chatContainerRef}>
                            {chatLog.length === 0 && (
                                <div className="h-full flex items-center justify-center text-xs text-neutral-300 text-center">
                                    暂无通讯
                                </div>
                            )}
                            {chatLog.map((msg, i) => (
                                <div key={i} className="text-sm">
                                    {msg.isSystem ? (
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 my-1.5 text-start shadow-sm">
                                            <span className="text-blue-600 font-extrabold text-xs">{msg.sender}：</span>
                                            <span className="text-blue-800 text-sm font-base leading-relaxed">{msg.text}</span>
                                        </div>
                                    ) : (
                                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-3">
                                            <div className="text-xs font-bold text-neutral-500">{msg.sender}</div>
                                            <div className="text-neutral-700 text-sm mt-1 leading-relaxed">{msg.text}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendChat} className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="输入消息..."
                                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                            />
                            <button type="submit" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

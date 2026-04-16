/**
 * Room.jsx - 房间大厅：等待游戏开始的页面
 * 
 * 职责：
 * 1. 显示房间中的所有玩家列表
 * 2. 显示和修改房间设置（max players、game mode）
 * 3. 监听Socket事件：房间更新、游戏开始
 * 4. 主持人可以启动游戏；普通玩家只能查看和改昵称
 * 
 * React概念说明：
 * - useEffect：在组件挂载时注册Socket事件监听器，卸载时清除监听
 * - 依赖数组[]：指定useEffect仅在组件首次挂载时运行
 * - cleanup函数(return中的函数)：防止内存泄漏和重复监听
 * - Socket事件监听与状态同步
 * - 条件渲染：根据isMe、isMeHost等条件显示/隐藏功能
 */

import { useState, useEffect } from 'react';
import { socket } from '../core/services/socket';
import { cn } from '../lib/utils';
import { Crown, Users, Settings, Play, Pencil, Home, LogOut, ChevronUp, ChevronDown, ArrowLeft } from 'lucide-react';
import { useDialog } from '../core/contexts/DialogContext';

export default function Room({ gameDef, initialRoomData, onGameReady, onBackToLobby, onLeaveRoom, onBackToGameMenu }) {
    // ═══════════════════════════════════════════════════════════════════════════════
    // 状态管理
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * 房间数据：包含players数组、settings等
     * 初始值来自App.jsx传来的initialRoomData
     */
    const [room, setRoom] = useState(initialRoomData);
    const { showToast } = useDialog();

    /**
     * 重命名模式开关：true时显示输入框，false时显示昵称
     */
    const [isRenaming, setIsRenaming] = useState(false);


    /**
     * 新昵称输入框的值
     */
    const [newName, setNewName] = useState('');

    /**
     * 重命名错误消息：为空时显示
     */
    const [renameError, setRenameError] = useState('');

    // ═══════════════════════════════════════════════════════════════════════════════
    // useEffect：初始化Socket事件监听
    // ═══════════════════════════════════════════════════════════════════════════════

    useEffect(() => {
        // Socket事件处理函数1：房间信息更新
        const handleRoomUpdated = (updatedRoom) => setRoom(updatedRoom);

        // Socket事件处理函数2：游戏启动通知
        const handleGameStarted = (data) => onGameReady(data.gameState);

        // 服务器发送'ROOM_UPDATED'事件时，调用handleRoomUpdated处理
        socket.on('ROOM_UPDATED', handleRoomUpdated);

        // 服务器发送'GAME_STARTED'事件时，调用handleGameStarted处理
        socket.on('GAME_STARTED', handleGameStarted);

        return () => {
            // 移除事件监听器
            socket.off('ROOM_UPDATED', handleRoomUpdated);
            socket.off('GAME_STARTED', handleGameStarted);
        };
    }, [onGameReady]);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 辅助状态计算
    // ═══════════════════════════════════════════════════════════════════════════════

    const isMeHost = room.hostId === socket.id;

    // ═══════════════════════════════════════════════════════════════════════════════
    // 事件处理函数
    // ═══════════════════════════════════════════════════════════════════════════════

    const handleStartGame = () => {
        socket.emit('START_GAME', {}, (res) => {
            if (!res.success) showToast("Failed to start game.", "error");
        });
    };

    const handleReorder = (playerSocketId, direction) => {
        socket.emit('REORDER_PLAYERS', { playerSocketId, direction });
    };

    const handleRename = () => {
        if (!newName.trim()) {
            setRenameError('❌ 昵称不能为空');
            return;
        }
        setRenameError('');
        socket.emit('RENAME', newName.trim());
        setIsRenaming(false);
        setNewName('');
    };

    const changeMaxPlayers = (maxPlayers) => {
        if (isMeHost) {
            socket.emit('CHANGE_SETTINGS', { maxPlayers: parseInt(maxPlayers) });
        }
    };

    const handleLeaveToLobby = () => {
        // Soft leave: don't tell the server to abandon the room
        onBackToLobby();
    };

    const handleHardLeaveRoom = () => {
        // Hard leave
        socket.emit('LEAVE_ROOM');
        if (onLeaveRoom) onLeaveRoom();
    };

    return (
        <div className="min-h-screen bg-neutral-100 p-4 sm:p-6 md:p-12 font-sans">
            <div className="w-full max-w-4xl mx-auto flex flex-col">
                {/* 页面头部：标题和房间号 */}
                <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-8">
                            {gameDef ? gameDef.icon : <Play size={24} />} {gameDef ? gameDef.name_ch : '等待大厅'} {gameDef ? gameDef.name_en : 'Waiting Room'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* 退出房间按钮 (Hard Leave) */}
                        <button
                            onClick={handleHardLeaveRoom}
                            title="Leave Room"
                            className="flex items-center gap-2 text-sm font-bold justify-center text-red-500 hover:text-red-700 bg-white border border-red-200 hover:border-red-400 hover:shadow-sm px-4 h-11 rounded-xl transition-all"
                        >
                            <LogOut size={20} />
                            <span className="hidden sm:inline">Leave</span>
                        </button>
                        {/* 返回主大厅按钮 (Soft Leave) */}
                        <button
                            onClick={handleLeaveToLobby}
                            title="Back to Lobby"
                            className="flex items-center gap-2 text-sm font-bold justify-center text-neutral-500 hover:text-neutral-900 bg-white border border-neutral-200 hover:border-neutral-400 hover:shadow-sm px-4 h-11 rounded-xl transition-all"
                        >
                            <Home size={20} />
                            Lobby
                        </button>
                        {/* 房间号展示卡片 */}
                        <div className="bg-white px-5 h-11 flex items-center rounded-xl shadow-sm border border-neutral-200 ml-2">
                            <span className="text-sm font-semibold text-neutral-400">ROOM: </span>
                            <span className="ml-2 text-xl font-black text-blue-600 tracking-widest">{room.id}</span>
                        </div>
                    </div>
                </header>

                {/* 两栏布局：左侧玩家列表 + 右侧房间设置 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* ═══════════════════════════════════════════════════════════════════════════ */}
                    {/* 左侧2/3：玩家列表 */}
                    {/* ═══════════════════════════════════════════════════════════════════════════ */}
                    <div className="md:col-span-2 space-y-4">
                        {/* 玩家列表标题 */}
                        <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-800">
                            <Users size={20} className="text-neutral-400" />
                            Players ({room.players.length}/{room.settings.maxPlayers || 3})
                        </h2>

                        {/* 玩家卡片列表容器 */}
                        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-4 border border-neutral-100">
                            {/*
              map()函数遍历room.players数组
              每个玩家对象包含：socketId, name, isHost等属性
            */}
                            <ul className="space-y-3">
                                {room.players.map((p, idx) => {
                                    // 判断当前遍历的玩家是否是自己
                                    const isMe = p.socketId === socket.id;

                                    return (
                                        // 每个玩家卡片
                                        <li
                                            key={p.socketId}
                                            // 三元运算符：自己的卡片用蓝色背景高亮
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-2xl transition-all",
                                                isMe ? "bg-blue-50/50 border border-blue-100" : "bg-neutral-50"
                                            )}
                                        >
                                            {/* 左侧：玩家头像和信息 */}
                                            <div className="flex items-center gap-3">
                                                {/* 房主可见的排序按钮 */}
                                                {isMeHost && (
                                                    <div className="flex flex-col gap-0.5">
                                                        <button
                                                            disabled={idx === 0}
                                                            onClick={() => handleReorder(p.socketId, -1)}
                                                            className="p-0.5 text-neutral-400 hover:text-blue-600 disabled:opacity-20 transition-colors"
                                                        >
                                                            <ChevronUp size={16} />
                                                        </button>
                                                        <button
                                                            disabled={idx === room.players.length - 1}
                                                            onClick={() => handleReorder(p.socketId, 1)}
                                                            className="p-0.5 text-neutral-400 hover:text-blue-600 disabled:opacity-20 transition-colors"
                                                        >
                                                            <ChevronDown size={16} />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* 玩家头像圆圈：初始字母 */}
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md",
                                                    isMe ? "bg-blue-600" : "bg-neutral-300"
                                                )}>
                                                    {p.name.substring(0, 1).toUpperCase()}
                                                </div>

                                                {/* 玩家名称和角色标签 */}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-neutral-900">{p.name}</span>
                                                        {/*
                                                            条件渲染 &&：只有主持人才显示HOST标签
                                                            p.isHost ? 显示标签 : 不显示
                                                          */}
                                                        {p.isHost && (
                                                            <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                                                                <Crown size={12} /> HOST
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* 玩家身份提示 */}
                                                    <div className="text-xs font-medium text-neutral-400 mt-0.5">
                                                        {isMe ? 'This is you' : 'Other player'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 右侧：修改昵称功能（仅自己可用） */}
                                            {isMe && (
                                                <div>
                                                    {/*
                                                          三元运算符：根据isRenaming状态显示不同的UI
                                                          true: 显示输入框和保存按钮
                                                          false: 显示编辑按钮（铅笔icon）
                                                        */}
                                                    {isRenaming ? (
                                                        // 编辑模式：输入框 + 保存按钮
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    maxLength={15}
                                                                    autoFocus  // 自动获得焦点，方便用户立即开始输入
                                                                    value={newName}
                                                                    onChange={(e) => {
                                                                        setNewName(e.target.value);
                                                                        if (e.target.value.trim()) setRenameError('');  // 用户开始输入后清除错误
                                                                    }}
                                                                    className={cn(
                                                                        "px-3 py-1.5 bg-white border rounded-lg text-sm focus:outline-none focus:ring-2 w-28",
                                                                        renameError ? "border-red-400 focus:ring-red-500" : "border-neutral-300 focus:ring-blue-500"
                                                                    )}
                                                                    placeholder={p.name}
                                                                />
                                                                <button
                                                                    onClick={handleRename}
                                                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700"
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                            {/* 错误提示 */}
                                                            {renameError && (
                                                                <p className="text-xs text-red-500 font-semibold">{renameError}</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        // 查看模式：编辑按钮
                                                        <button
                                                            onClick={() => {
                                                                setIsRenaming(true);
                                                                setNewName('');  // 打开编辑时清空输入框
                                                                setRenameError('');  // 清除之前的错误提示
                                                            }}
                                                            className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}

                            </ul>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════════════════ */}
                    {/* 右侧1/3：房间设置 */}
                    {/* ═══════════════════════════════════════════════════════════════════════════ */}
                    <div className="space-y-4">
                        {/* 设置区标题 */}
                        <h2 className="text-lg font-bold flex items-center gap-2 text-neutral-800">
                            <Settings size={20} className="text-neutral-400" />
                            Settings
                        </h2>

                        {/* 设置卡片 */}
                        <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 border border-neutral-100 space-y-6">

                            {/* 玩家人数设置（仅适用于寻宝游戏：2或3人） */}
                            <div>
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Required Players</label>
                                <p className="text-xs text-neutral-500 mb-2">房间内的实际玩家数必须与设定值相同</p>
                                <select
                                    disabled={!isMeHost}  // 只有主持人可以修改
                                    value={room.settings.maxPlayers || 2}
                                    onChange={(e) => changeMaxPlayers(e.target.value)}
                                    className="w-full bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium appearance-none disabled:opacity-60"
                                >
                                    <option value={2}>2 Players</option>
                                    <option value={3}>3 Players</option>
                                </select>
                            </div>

                            {/* 游戏模式选择 */}
                            <div>
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Game Mode</label>
                                <select
                                    disabled={!isMeHost}  // 只有主持人可以修改
                                    className="w-full bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium appearance-none disabled:opacity-60"
                                >
                                    <option value="normal">Treasure Hunt Classic</option>
                                </select>
                            </div>

                            {/* 启动游戏按钮 */}
                            <div className="pt-4 border-t border-neutral-100">
                                {room.status === 'playing' ? (
                                    <button
                                        onClick={() => onGameReady(room.gameState)}
                                        className="w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 animate-pulse"
                                    >
                                        <Play size={20} className="fill-white" />
                                        REJOIN GAME
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleStartGame}
                                            // 禁用条件：不是主持人 或 实际人数不等于设定人数
                                            disabled={!isMeHost || room.players.length !== room.settings.maxPlayers}
                                            className={cn(
                                                "w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all",
                                                isMeHost && room.players.length === room.settings.maxPlayers
                                                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                                                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                                            )}
                                        >
                                            <Play size={20} className={isMeHost && room.players.length === room.settings.maxPlayers ? "fill-white" : "fill-neutral-400"} />
                                            START GAME
                                        </button>

                                        {/* 非主持人提示 */}
                                        {!isMeHost && (
                                            <p className="text-center text-xs font-semibold text-neutral-400 mt-3">You are not the Host.</p>
                                        )}

                                        {/* 人数不符提示 */}
                                        {isMeHost && room.players.length !== room.settings.maxPlayers && (
                                            <p className="text-center text-xs font-semibold text-amber-500 mt-3">
                                                需要 {room.settings.maxPlayers} 人（当前 {room.players.length} 人）
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
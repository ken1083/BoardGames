/**
 * GameMenu.jsx - 加入/创建房间页面
 * 
 * 职责：
 * 1. 显示游戏详情和规则
 * 2. 提供玩家输入表单（昵称、房间号）
 * 3. 处理加入/创建房间的Socket通讯
 * 4. 处理错误状态和加载状态
 * 
 * React概念说明：
 * - 监听受控输入：name和roomCode通过value={xxx}和onChange={(e) => setState(e.target.value)}实现React的"受控组件"
 * - 表单处理：onSubmit触发handleJoin，通过e.preventDefault()阻止默认表单提交
 * - Socket.io异步通讯：socket.emit()发送请求，回调函数处理响应
 * - 条件渲染：三元运算符和&&操作符
 * - 条件样式：disabled状态和按钮文本根据roomCode长度动态变化
 */

import { useState } from 'react';
import { socket } from '../services/socket';
import { cn } from '../lib/utils';
import { User, Hash, ArrowLeft, BookOpen } from 'lucide-react';

export default function GameMenu({ gameDef, onJoined, onBack }) {
    // ═══════════════════════════════════════════════════════════════════════════════
    // 状态管理：表单输入和加载状态
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * name状态：玩家输入的昵称
     * React受控组件原理：value={name}和onChange={(e) => setName(e.target.value)}
     * - input的值来自React state（不是DOM决定值）
     * - 用户每次打字都触发onChange，更新state，React重新渲染input的value
     */
    const [name, setName] = useState('');

    /**
     * roomCode状态：房间号
     * maxLength=4表示最多输入4个字符
     */
    const [roomCode, setRoomCode] = useState('');

    /**
     * error状态：错误消息（比如房间不存在、名称重复等）
     */
    const [error, setError] = useState('');

    /**
     * isLoading状态：是否正在等待Socket响应
     * 用于禁用提交按钮，防止重复提交
     */
    const [isLoading, setIsLoading] = useState(false);

    // ═══════════════════════════════════════════════════════════════════════════════
    // 事件处理：表单提交
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * 处理表单提交事件
     * @param {Event} e 表单事件
     */
    const handleJoin = (e) => {
        // e.preventDefault()：阻止浏览器默认的表单提交行为（POST请求）
        // 我们使用Socket.io替代传统HTTP请求
        e.preventDefault();

        setError('');
        setIsLoading(true);

        // 如果玩家未输入昵称，则自动生成一个
        const finalName = name.trim() || `Player ${Math.floor(Math.random() * 99)}`;

        /**
         * Socket.io异步通讯模式
         * socket.emit(事件名, 数据, 回调函数)
         * 后端收到'JOIN_OR_CREATE_ROOM'事件，处理后调用回调函数返回结果
         */
        socket.emit(
            'JOIN_OR_CREATE_ROOM',
            {
                roomId: roomCode.trim(),        // 留空则服务器自动生成新房间
                playerName: finalName,
                gameType: gameDef.id            // 游戏类型ID
            },
            // 这是一个回调函数，服务器会用响应数据调用它
            (res) => {
                setIsLoading(false);

                // 如果成功，调用父组件(App.jsx)传来的onJoined回调
                if (res.success) {
                    onJoined(res.room);
                } else {
                    // 否则显示错误消息
                    setError(res.error || 'Failed to join room');
                }
            }
        );
    };

    // 从注册表中获取当前游戏的规则定义
    const rules = gameDef.rules;

    return (
        // Flex布局：左侧1/3 + 右侧2/3的两栏设计
        <div className="flex flex-col md:flex-row h-screen overflow-hidden font-sans max-w-[1400px] mx-auto">

            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {/* 左侧1/3：返回按钮 + 游戏信息 + 加入/创建房间表单 */}
            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            <div className="w-full md:w-1/3 bg-white px-14 py-12 flex flex-col border-r border-neutral-100 overflow-y-auto">
                {/* 返回按钮：调用父组件(App.jsx)传来的onBack回调 */}
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-neutral-900 transition-colors self-start mb-12"
                >
                    <ArrowLeft size={16} />
                    返回
                </button>

                {/* 游戏信息区 */}
                <header className="mb-10">
                    <div className="text-5xl mb-4 text-center">{gameDef.icon}</div>
                    <h1 className="text-3xl font-bold text-neutral-900 text-center">{gameDef.name_ch}</h1>
                    <h1 className="text-3xl font-bold text-neutral-900 text-center">{gameDef.name_en}</h1>
                    {/*
            条件渲染 &&：只有当rules存在且有brief属性时才渲染
            rules?.brief是可选链操作符，意思是如果rules为null/undefined则rules?.brief为undefined
          */}
                    {rules?.brief && (
                        <p className="text-sm text-neutral-500 leading-relaxed text-justify mt-3">{rules.brief}</p>
                    )}
                </header>

                <h2 className="text-center text-2xl font-bold text-neutral-900 mt-4 mb-3">房间通行证</h2>

                {/*
          表单元素：form标签
          onSubmit={(e) => handleJoin(e) 在用户点击提交按钮或按Enter时触发
        */}
                <form onSubmit={handleJoin} className="space-y-5">
                    {/* 玩家昵称输入字段 */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-neutral-700 ml-1">您的名称 (Nickname)</label>
                        <div className="relative">
                            {/* lucide-react icon：用户头像icon */}
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                            {/*
                受控输入（Controlled Input）解释：
                1. value={name} - input的值始终等于name state
                2. onChange={(e) => setName(e.target.value)} - 用户输入时更新state
                3. React会根据新state重新渲染input
                
                这形成了一个"单向数据流"：用户输入 → onChange触发 → setName更新state → React重新渲染input
                
                maxLength={15}：限制最多15个字符
              */}
                            <input
                                type="text"
                                maxLength={15}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="不填则随机生成"
                                className="w-full pl-10 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-neutral-900 placeholder:text-neutral-400"
                            />
                        </div>
                    </div>

                    {/* 房间号码输入字段 */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-neutral-700 ml-1">房间号码 (Room Code)</label>
                        <div className="relative">
                            {/* lucide-react icon：# 符号 */}
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                            {/*
                受控输入：与name类似
                maxLength={4}：最多4个字符
                onChange中调用.toUpperCase()：确保输入的房间号码是大写
                
                注意：不能直接在JSX中修改e.target.value，必须通过setRoomCode更新state
                错误 ❌：e.target.value = e.target.value.toUpperCase()
                正确 ✅：setRoomCode(e.target.value.toUpperCase())
              */}
                            <input
                                type="text"
                                maxLength={4}
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                placeholder="留空即为创建新房间"
                                className="w-full pl-10 pr-4 py-3.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-neutral-900 placeholder:text-neutral-400 uppercase tracking-widest"
                            />
                        </div>
                    </div>

                    {/*
            错误消息显示：条件渲染 &&
            只有当error不为空字符串时才显示
          */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm font-semibold rounded-xl text-center">
                            {error}
                        </div>
                    )}

                    {/*
            提交按钮：form类型
            type="submit"会触发form的onSubmit事件处理器
            disabled={isLoading}：等待响应时禁用按钮，防止重复提交
          */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-neutral-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 mt-4"
                    >
                        {/*
              三元运算符：根据roomCode长度显示不同文案
              roomCode.length > 0 ? "进入房间" : "创建房间"
            */}
                        {roomCode.length > 0 ? "进入房间" : "创建房间"}
                    </button>
                </form>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {/* 右侧2/3：游戏规则展示区 */}
            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            <div className="w-full md:w-2/3 bg-neutral-50 px-14 py-12 flex flex-col overflow-y-auto">
                {/* 规则区标题 */}
                <h2 className="flex items-center gap-2 text-neutral-800 font-bold text-lg mb-8 pb-4 border-b border-neutral-200">
                    <BookOpen size={20} className="text-blue-600" />
                    游戏介绍 / 规则
                </h2>

                {/*
          条件渲染：检查rules是否存在且有sections
          rules?.sections?.length > 0 ? (显示规则) : (显示"暂无")
          
          可选链操作符 ?.：
          - rules?.sections：如果rules为null/undefined，则整个表达式返回undefined
          - rules?.sections?.length：如果sections为null/undefined，则返回undefined
          这避免了"TypeError: Cannot read property of null"的错误
        */}
                {rules?.sections?.length > 0 ? (
                    <div className="space-y-5">
                        {/*
              map()函数：遍历rules.sections数组，为每个step创建一个规则卡片
              (step, i) => (...) 其中i是索引
              key={i}：使用索引作为key（注意：这不是最佳实践，理想情况下应有唯一的id）
            */}
                        {rules.sections.map((step, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-neutral-100 p-6 flex gap-5 shadow-sm">
                                {/* 规则emoji图标 */}
                                <div className="shrink-0 w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-2xl">
                                    {step.emoji}
                                </div>

                                {/* 规则文本内容 */}
                                <div className="text-sm text-neutral-600 leading-relaxed">
                                    {/* 步骤标签：如"第1步"、"规则" */}
                                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">{step.label}</p>

                                    {/* 步骤标题 */}
                                    <p className="font-bold text-neutral-800 text-base mb-1.5">{step.title}</p>

                                    {/* 步骤详细描述 */}
                                    <p>{step.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // 如果没有规则，显示提示文本
                    <p className="text-sm text-neutral-400">暂无介绍。</p>
                )}
            </div>

        </div>
    );
}
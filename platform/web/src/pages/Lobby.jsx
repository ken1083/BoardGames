/**
 * Lobby.jsx - 游戏大厅：游戏选择页面（使用动态注册表版本）
 * 
 * 职责：
 * 1. 从 game-registry 导入所有可用游戏
 * 2. 显示启用的游戏卡片
 * 3. 处理用户的游戏选择
 * 
 * 改进说明：
 * - 从 shared/game-registry.js 动态获取游戏列表
 * - 新游戏只需在 game-registry 中注册，自动显示在大厅
 * - 无需修改此文件即可添加新游戏
 * 
 * React概念说明：
 * - map()：将游戏数组转换为卡片 JSX
 * - onClick：卡片点击时触发 onSelectGame 回调
 * - cn()：条件类名合并
 */

import { cn } from '@utils/utils';
import { getEnabledGames, GAME_REGISTRY } from '@shared/game-registry';
import { Gamepad2, ArrowRight, Lock, LucideDoorOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Lobby() {
    const navigate = useNavigate();
    // 从 game-registry 动态获取已启用的游戏列表
    const enabledGames = getEnabledGames();
    // 获取注册表中的所有游戏
    const allGames = GAME_REGISTRY;

    return (
        <div className="flex flex-col min-h-screen bg-neutral-100 p-4 sm:p-8 font-sans">
            <div className="w-full max-w-2xl mx-auto flex flex-col">
                {/* 页面头部 */}
                <header className="mb-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 mb-4">
                        <Gamepad2 size={50} />
                    </div>
                    <h1 className="text-4xl font-extrabold text-neutral-900 mb-3">游戏大厅</h1>
                    <p className="text-neutral-500 font-medium">Ken's Board Games · 选择一款你想玩的游戏</p>
                </header>

                {/* 游戏卡片网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allGames.map((game) => {
                        const isEnabled = enabledGames.some(g => g.id === game.id);

                        return (
                            <div
                                key={game.id}
                                onClick={() => {
                                    if (isEnabled) {
                                        navigate(`/${game.id}`);
                                    }
                                }}
                                className={cn(
                                    "px-5 py-4 rounded-2xl border-2 transition-all group flex items-center justify-between gap-4",
                                    isEnabled
                                        ? "border-neutral-200 bg-white hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
                                        : "border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed"
                                )}
                            >
                                {/* 卡片左侧：图标和信息 */}
                                <div className="flex gap-4 items-center">
                                    <span className="text-4xl">{game.icon}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-xl text-neutral-900">{game.name_ch}</h3>
                                            {!isEnabled && (
                                                <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-neutral-300 text-neutral-600">
                                                    <Lock size={12} />
                                                    待开放
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-md font-medium text-neutral-500 mb-2">{game.name_en}</p>
                                        <p className="text-sm text-neutral-600">{game.description}</p>
                                    </div>
                                </div>

                                {/* 卡片右侧：箭头图标 */}
                                {isEnabled && (
                                    <div className="flex items-center gap-2 text-neutral-500 group-hover:text-blue-500">
                                        <ArrowRight size={20} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
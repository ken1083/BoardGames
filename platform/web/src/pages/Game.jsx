/**
 * Game.jsx - 游戏内容路由器（动态加载版本）
 * 
 * 职责：
 * 根据gameDef.id（游戏类型）从game-registry中动态加载对应的游戏组件
 * 
 * 改进说明：
 * - 使用 React.lazy() 动态导入游戏组件，避免启动时加载所有游戏
 * - 使用 Suspense 显示加载状态
 * - 从 shared/game-registry.js 获取游戏配置，无需硬编码
 * - 完全支持新游戏自动加载，无需修改此文件
 * 
 * React概念说明：
 * - React.lazy() + Suspense：代码分割，按需加载组件
 * - 动态导入：import() 函数返回 Promise
 * - ErrorBoundary：捕获加载失败的错误
 */

import { Suspense, lazy } from 'react';
import { getGameRegistry } from '@shared/game-registry';

const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-neutral-600 font-medium">游戏加载中...</p>
        </div>
    </div>
);

const ErrorScreen = ({ onBackToLobby }) => (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-neutral-900 mb-4">⚠️ 游戏加载失败</h1>
            <p className="text-neutral-600 mb-6">该游戏暂时无法加载，请返回大厅重试</p>
            <button
                onClick={onBackToLobby}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
            >
                返回大厅
            </button>
        </div>
    </div>
);

export default function Game({ gameDef, initialRoomData, initialGameState, onBackToLobby, onBackToRoom }) {
    // 1. 验证游戏定义是否存在
    if (!gameDef) {
        return <ErrorScreen onBackToLobby={onBackToLobby} />;
    }

    // 2. 从注册表获取游戏配置
    const gameRegistry = getGameRegistry(gameDef.id);
    if (!gameRegistry || !gameRegistry.enabled) {
        return <ErrorScreen onBackToLobby={onBackToLobby} />;
    }

    // 3. 动态导入游戏组件
    // componentPath() 返回 Promise<{ default: Component }>
    const GameComponent = lazy(() => gameRegistry.frontend.componentPath());

    // 4. 使用 Suspense 包装，提供加载和错误界面
    return (
        <Suspense fallback={<LoadingScreen />}>
            <GameComponent
                gameDef={gameDef}
                initialRoomData={initialRoomData}
                initialGameState={initialGameState}
                onBackToLobby={onBackToLobby}
                onBackToRoom={onBackToRoom}
            />
        </Suspense>
    );
}

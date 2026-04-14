// ═══════════════════════════════════════════════════════════════════════════════════
// GameDispatcher - 游戏路由转发器
// ═══════════════════════════════════════════════════════════════════════════════════
// 目的：根据游戏类型(gameType)路由到相应的游戏引擎
// 设计模式：策略模式(Strategy Pattern)
// 优点：
//   1. 支持多种游戏类型，易于扩展
//   2. 解耦Socket层和游戏引擎层
//   3. 封装游戏调用逻辑
// ═══════════════════════════════════════════════════════════════════════════════════

const path = require('path');

class GameDispatcher {
    // 构造函数：初始化游戏引擎映射表
    constructor() {
        this.engines = {};
    }
    
    async initialize() {
        try {
            // 自动从 ESM 注册表中扫描并加载已启用的游戏引擎
            const registryModule = await import('../../../../shared/game-registry.js');
            const GAME_REGISTRY = registryModule.GAME_REGISTRY;
            
            GAME_REGISTRY.forEach(game => {
                if (game.enabled && game.backend && game.backend.enginePath) {
                    try {
                        // enginePath 是相对于 shared/ 目录的，用拼装路径解析
                        const sharedDir = path.resolve(__dirname, '../../../../shared');
                        const fullPath = path.resolve(sharedDir, game.backend.enginePath);
                        const engine = require(fullPath);
                        this.engines[game.id] = engine;
                        console.log(`✅ 已加载游戏引擎: ${game.id}`);
                    } catch (error) {
                        console.error(`❌ 加载游戏引擎失败: ${game.id}`, error);
                    }
                }
            });
        } catch (err) {
            console.error('❌ 无法读取注册表', err);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法1】getGameEngine(gameType) - 获取游戏引擎
    // 目的：根据游戏类型获取对应的引擎实例
    // 参数：gameType - 游戏类型(如'treasure_hunt')
    // 返回值：引擎实例 或 null(如果游戏类型不存在)
    // ═══════════════════════════════════════════════════════════════════════════════════
    getGameEngine(gameType) {
        return this.engines[gameType] || null;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法2】initializeGame(gameType, players) - 初始化游戏
    // 目的：调用对应游戏引擎的初始化方法
    // 参数：
    //   - gameType: 游戏类型
    //   - players: 参与游戏的玩家数组
    // 返回值：gameState - 游戏状态对象
    // ═══════════════════════════════════════════════════════════════════════════════════
    initializeGame(gameType, players) {
        const engine = this.getGameEngine(gameType);
        if (!engine) {
            throw new Error(`Unknown game type: ${gameType}`);
        }
        // 调用引擎的 initializeGame 方法，返回初始化后的游戏状态
        return engine.initializeGame(players);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法3】processGameAction(gameType, gameState, playerId, actionData) - 处理游戏动作
    // 目的：调用对应游戏引擎处理玩家的操作
    // 参数：
    //   - gameType: 游戏类型
    //   - gameState: 当前游戏状态
    //   - playerId: 执行动作的玩家ID
    //   - actionData: 动作数据({type, payload})
    // 返回值：{success: true} 或 {error: "错误信息"}
    // ═══════════════════════════════════════════════════════════════════════════════════
    processGameAction(gameType, gameState, playerId, actionData) {
        const engine = this.getGameEngine(gameType);
        if (!engine) {
            return { error: `Unknown game type: ${gameType}` };
        }
        // 调用引擎的 processAction 方法处理玩家动作
        return engine.processAction(gameState, playerId, actionData);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // 【方法4】registerGameEngine(gameType, engine) - 注册新游戏引擎(未来扩展)
    // 目的：动态注册新的游戏引擎，支持游戏插件化
    // 参数：
    //   - gameType: 新游戏的类型标识符
    //   - engine: 游戏引擎实例
    // 用途：未来添加新游戏时，可以在运行时注册而不需要修改此文件
    // ═══════════════════════════════════════════════════════════════════════════════════
    registerGameEngine(gameType, engine) {
        this.engines[gameType] = engine;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// 导出 GameDispatcher 的单例实例
// 整个应用共享一个 GameDispatcher 实例用于路由所有游戏请求
// ═══════════════════════════════════════════════════════════════════════════════════
module.exports = new GameDispatcher();

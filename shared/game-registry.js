import treasureHuntSpec from '../games/treasure-hunt/gameSpec.json' with { type: 'json' };
import { rules as treasureHuntRules } from '../games/treasure-hunt/shared/rules.js';

import battleLineSpec from '../games/battle-line/gameSpec.json' with { type: 'json' };
import { rules as battleLineRules } from '../games/battle-line/shared/rules.js';

export const GAME_REGISTRY = [
    {
        // 展开基础信息与参数
        ...treasureHuntSpec,
        enabled: true,

        backend: {
            enginePath: '../games/treasure-hunt/backend/engine.js'
        },

        frontend: {
            componentPath: () => import('../games/treasure-hunt/frontend/index.js')
        },

        rules: treasureHuntRules
    },
    {
        ...battleLineSpec,
        enabled: true,
        rules: battleLineRules
    }
];

export function getGameRegistry(gameId) {
    return GAME_REGISTRY.find(g => g.id === gameId);
}

export function getEnabledGames() {
    return GAME_REGISTRY.filter(g => g.enabled);
}

export function isGameEnabled(gameId) {
    const game = getGameRegistry(gameId);
    return game ? game.enabled : false;
}
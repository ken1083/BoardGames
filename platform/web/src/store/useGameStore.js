/**
 * store/useGameStore.js
 * 全局游戏状态管理 (使用简单的React hooks，可后期迁移到zustand)
 */

import { create } from 'zustand';

// 如果zustand还未安装，使用简单的Context替代
// 这里先定义结构，实际使用时可以用zustand或redux

const useGameStore = (set) => ({
    currentGame: null,
    gameState: null,
    players: [],

    setCurrentGame: (game) => set({ currentGame: game }),
    setGameState: (state) => set({ gameState: state }),
    setPlayers: (players) => set({ players })
});

export default useGameStore;

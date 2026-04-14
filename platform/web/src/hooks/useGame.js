/**
 * 前端共享hooks： useGame
 * 管理游戏状态
 */

import { useState, useCallback } from 'react';
import { socket } from '../services/socket';

export function useGame(initialGameState) {
    const [gameState, setGameState] = useState(initialGameState);
    const [error, setError] = useState(null);

    const updateGameState = useCallback((updatedState) => {
        setGameState(updatedState);
    }, []);

    const sendGameAction = useCallback((actionData) => {
        socket.emit('GAME_ACTION', actionData);
    }, []);

    const endGame = useCallback(() => {
        socket.emit('END_GAME');
    }, []);

    const sendChatMessage = useCallback((text) => {
        socket.emit('CHAT_MESSAGE', text);
    }, []);

    return {
        gameState,
        error,
        updateGameState,
        setError,
        sendGameAction,
        endGame,
        sendChatMessage
    };
}

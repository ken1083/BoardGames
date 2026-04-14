/**
 * games/treasure-hunt/hooks.js
 * 寻宝之战游戏特定的hooks
 */

import { useState, useCallback } from 'react';
import { socket } from '@services/socket';

export function useTreasureHuntGame(initialGameState) {
    const [gameState, setGameState] = useState(initialGameState);
    const [error, setError] = useState(null);
    const [chatLog, setChatLog] = useState([]);

    const updateGameState = useCallback((updatedState) => {
        setGameState(updatedState);
    }, []);

    const placePiece = useCallback((r, c) => {
        socket.emit('GAME_ACTION', { type: 'PLACE_X', payload: { r, c } });
    }, []);

    const movePlayer = useCallback((r, c) => {
        socket.emit('GAME_ACTION', { type: 'MOVE', payload: { r, c } });
    }, []);

    const setupTarget = useCallback((r, c) => {
        socket.emit('GAME_ACTION', { type: 'SETUP_TARGET', payload: { r, c } });
    }, []);

    const setupStart = useCallback((r, c) => {
        socket.emit('GAME_ACTION', { type: 'SETUP_START', payload: { r, c } });
    }, []);

    const addChatMessage = useCallback((msg) => {
        setChatLog(prev => [...prev, msg]);
    }, []);

    return {
        gameState,
        error,
        setError,
        chatLog,
        updateGameState,
        placePiece,
        movePlayer,
        setupTarget,
        setupStart,
        addChatMessage
    };
}

/**
 * 前端共享hooks： useRoom
 * 管理房间状态
 */

import { useState, useCallback } from 'react';
import { socket } from '../core/services/socket';

export function useRoom(initialRoom) {
    const [room, setRoom] = useState(initialRoom);

    const updateRoom = useCallback((updatedRoom) => {
        setRoom(updatedRoom);
    }, []);

    const renamePlayer = useCallback((newName) => {
        socket.emit('RENAME', newName);
    }, []);

    const updateSettings = useCallback((newSettings) => {
        socket.emit('CHANGE_SETTINGS', newSettings);
    }, []);

    const startGame = useCallback(() => {
        socket.emit('START_GAME', {});
    }, []);

    const leaveRoom = useCallback(() => {
        socket.emit('LEAVE_ROOM');
    }, []);

    return {
        room,
        updateRoom,
        renamePlayer,
        updateSettings,
        startGame,
        leaveRoom
    };
}

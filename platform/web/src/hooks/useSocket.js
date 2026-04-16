/**
 * 前端共享hooks： useSocket
 * 管理Socket连接状态
 */

import { useEffect, useState } from 'react';
import { socket } from '../core/services/socket';

export function useSocket() {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [lastError, setLastError] = useState(null);

    useEffect(() => {
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);
        const onError = (error) => setLastError(error);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('connect_error', onError);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onError);
        };
    }, []);

    return { isConnected, lastError, socket };
}

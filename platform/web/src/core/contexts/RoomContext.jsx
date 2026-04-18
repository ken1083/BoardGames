import React, { createContext, useContext, useState, useEffect } from 'react';
import { socket } from '../services/socket';

const RoomContext = createContext();

export const useRoom = () => {
    const context = useContext(RoomContext);
    if (!context) {
        throw new Error('useRoom must be used within a RoomProvider');
    }
    return context;
};

export const RoomProvider = ({ children }) => {
    const [activeRooms, setActiveRooms] = useState([]);

    useEffect(() => {
        // Listen for initial room info from server
        socket.on('ACTIVE_ROOMS_INFO', (rooms) => {
            setActiveRooms(rooms);
        });

        // Listen for room updates
        socket.on('ROOM_UPDATED', (updatedRoom) => {
            setActiveRooms(prev => {
                const index = prev.findIndex(r => r.id === updatedRoom.id);
                if (index !== -1) {
                    const newList = [...prev];
                    newList[index] = updatedRoom;
                    return newList;
                } else {
                    return [...prev, updatedRoom];
                }
            });
        });

        // Handle case where room is destroyed or player leaves
        // (Note: We might need a specific 'ROOM_LEFT' or similar if leave isn't captured by ROOM_UPDATED)
        
        return () => {
            socket.off('ACTIVE_ROOMS_INFO');
            socket.off('ROOM_UPDATED');
        };
    }, []);

    const getActiveRoomByGame = (gameId) => {
        return activeRooms.find(r => r.gameType === gameId);
    };

    const removeActiveRoom = (roomId) => {
        setActiveRooms(prev => prev.filter(r => r.id !== roomId));
    };

    const updateActiveRoom = (updatedRoom) => {
        setActiveRooms(prev => {
            const index = prev.findIndex(r => r.id === updatedRoom.id);
            if (index !== -1) {
                const newList = [...prev];
                newList[index] = updatedRoom;
                return newList;
            } else {
                return [...prev, updatedRoom];
            }
        });
    };

    const value = {
        activeRooms,
        setActiveRooms,
        getActiveRoomByGame,
        removeActiveRoom,
        updateActiveRoom
    };

    return (
        <RoomContext.Provider value={value}>
            {children}
        </RoomContext.Provider>
    );
};

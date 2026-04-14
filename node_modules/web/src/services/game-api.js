/**
 * game-api.js - 游戏API封装
 * 
 * 职责：
 * 将所有Socket.io事件发送封装成方法调用，提供统一的API接口
 * 使代码更易读、易测试、易维护
 * 
 * 设计模式：
 * - 外观模式（Facade）：隐藏Socket.io的复杂细节
 * - 一些方法用Promise包装，使异步操作更易使用
 * 
 * React概念：
 * - Promise：异步操作的标准化表示，.then() 处理成功，.catch() 处理失败
 * - async/await（更现代的方式）：const result = await gameApi.joinOrCreateRoom(...)
 */

import { socket } from './socket';

export const gameApi = {
    /**
     * 加入或创建房间
     * 如果roomId为空，服务器自动创建新房间
     * 
     * @param {string} roomId - 房间号（留空则创建新房间）
     * @param {string} playerName - 玩家昵称
     * @param {string} gameType - 游戏类型ID（如'treasure_hunt'）
     * @returns {Promise} 解析为房间数据对象
     * 
     * 使用示例：
     *   const room = await gameApi.joinOrCreateRoom('', 'Alice', 'treasure_hunt');
     *   console.log(room.id);  // 房间号
     *   console.log(room.players);  // 玩家列表
     */
    joinOrCreateRoom: (roomId, playerName, gameType) => {
        // Promise包装:
        // new Promise((resolve, reject) => {...})
        // - resolve(值)：异步操作成功，返回值
        // - reject(错误)：异步操作失败，返回错误
        return new Promise((resolve, reject) => {
            // 发送JOIN_OR_CREATE_ROOM事件到服务器
            // 第三个参数是回调函数，服务器处理完后调用
            socket.emit('JOIN_OR_CREATE_ROOM',
                { roomId, playerName, gameType },
                (res) => {
                    // 服务器响应
                    if (res.success) {
                        // 成功：调用resolve，Promise状态变为完成
                        resolve(res.room);
                    } else {
                        // 失败：调用reject，Promise状态变为拒绝
                        reject(new Error(res.error));
                    }
                }
            );
        });
    },

    /**
     * 修改玩家昵称
     * @param {string} newName - 新昵称
     */
    renamePlayer: (newName) => {
        socket.emit('RENAME', newName);
    },

    /**
     * 更新房间设置
     * @param {Object} newSettings - 新设置对象（如 { maxPlayers: 3 }）
     */
    updateSettings: (newSettings) => {
        socket.emit('CHANGE_SETTINGS', newSettings);
    },

    /**
     * 开始游戏
     * 只有房间主持人可以调用此方法
     * @returns {Promise} 解析为undefined（只表示成功）
     */
    startGame: () => {
        return new Promise((resolve, reject) => {
            socket.emit('START_GAME', {}, (res) => {
                if (res.success) {
                    resolve();
                } else {
                    reject(new Error('Failed to start game'));
                }
            });
        });
    },

    /**
     * 发送游戏操作
     * 游戏过程中发送的各种操作（放置障碍、移动等）
     * @param {Object} actionData - 操作数据（具体格式由游戏定义）
     */
    sendGameAction: (actionData) => {
        socket.emit('GAME_ACTION', actionData);
    },

    /**
     * 结束游戏
     */
    endGame: () => {
        socket.emit('END_GAME');
    },

    /**
     * 发送聊天消息
     * @param {string} text - 聊天内容
     */
    sendChatMessage: (text) => {
        socket.emit('CHAT_MESSAGE', text);
    }
};

export default gameApi;

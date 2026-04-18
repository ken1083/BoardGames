/**
 * socket.js - Socket.io 客户端配置和初始化
 * 
 * 职责：
 * 1. 创建Socket.io客户端实例
 * 2. 配置服务器连接地址（开发environment vs 生产environment）
 * 3. 导出socket实例供整个应用使用
 * 
 * Socket.io是什么？
 * Socket.io提供实时双向通讯（WebSocket）
 * 允许服务器主动推送数据给客户端（而HTTP只能客户端拉取）
 * 两个关键方法：
 *   - socket.emit(事件名, 数据)：发送事件給服务器
 *   - socket.on(事件名, 回调)：监听服务器发来的事件
 */

import { io } from 'socket.io-client';
import { getPlayerId } from '@hooks/useIdentity';

/**
 * 智能部署策略:
 * 
 * 1. 本地开发 (localhost): 连接到本地开发服务器
 * 2. 跨设备 LAN (Host IP): SERVER_URL 为空字符串，Socket 自动连接到浏览器访问的源 (当前物理IP:PORT)
 * 3. 线上云端部署 (Vercel/Railway): VITE_SOCKET_URL 配置为远程服务器地址并生效
 */
const isLocalDev = import.meta.env.DEV && window.location.hostname === 'localhost';
const SERVER_URL = import.meta.env.VITE_SOCKET_URL || (isLocalDev ? 'http://localhost:3000' : '');

export const socket = io(SERVER_URL, {
  autoConnect: true,
  auth: { playerId: getPlayerId() }
});

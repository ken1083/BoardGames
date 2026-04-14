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

/**
 * 服务器URL配置
 * 
 * import.meta.env.DEV 是Vite提供的环境变量
 * 表示当前是否在开发模式
 * 
 * 开发模式（DEV=true）：
 *   - 指向 localhost:3000（本地后端服务器）
 *   - 利于快速开发和调试
 * 
 * 生产模式（DEV=false）：
 *   - 指向 '/'（同域名）
 *   - 假设前后端部署在同一域名
 */
const SERVER_URL = import.meta.env.DEV ? 'http://localhost:3000' : '/';

/**
 * 创建Socket.io客户端实例
 * 
 * io()函数参数：
 *   - 第一个参数：服务器地址
 *   - 第二个参数：配置对象
 *     * autoConnect: true - 自动连接（无需手动调用socket.connect()）
 * 
 * 返回值：socket对象
 * 这个对象可以用来：
 *   - socket.emit() - 发送事件
 *   - socket.on() - 监听事件
 *   - socket.off() - 移除事件监听
 */
export const socket = io(SERVER_URL, {
  autoConnect: true,
});

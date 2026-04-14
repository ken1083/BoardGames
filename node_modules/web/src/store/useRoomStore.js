/**
 * store/useRoomStore.js - 全局状态管理（基于Zustand库）
 * 
 * 职责（当前未使用）：
 * 这个文件为使用Zustand全局状态管理库准备，可以集中管理房间相关的状态
 * 
 * 为何当前未使用？
 * 现在应用使用以下方式管理房间状态：
 * 1. React useState()：局部组件状态（Room.jsx中）
 * 2. Socket.io事件监听：实时状态同步（Room.jsx中使用useEffect）
 * 3. Props drilling：从App.jsx传递状态给子组件
 * 这个方式简单、易调试，适合现在的应用规模
 * 
 * Zustand是什么？
 * Zustand是一个轻量级的全局状态管理库（类似Redux但更简洁）
 * 适用场景：应用变得复杂、状态嵌套太深、props drilling过多
 * 
 * 迁移指南（如果未来需要）：
 * 1. npm install zustand
 * 2. 完成useRoomStore的Zustand配置
 * 3. 在Room.jsx中使用：const { currentRoom, setCurrentRoom } = useRoomStore();
 * 4. 删除props drilling，直接从store读取和更新状态
 * 
 * 当前应该继续使用useState + Socket.io的方式
 */

/**
 * 房间状态store定义
 * 注意：这是Zustand store的"创建函数"格式
 * 实际使用需要先配置完整的Zustand setup
 * 
 * @param {Function} set - Zustand提供的state更新函数
 * @returns {Object} store对象，包含状态和方法
 */
const useRoomStore = (set) => ({
    /**
     * 状态字段
     */

    // 当前房间数据
    currentRoom: null,

    // 房间中的玩家列表
    players: [],

    // Socket连接状态
    isConnected: false,

    /**
     * 状态更新方法
     */

    // 更新当前房间
    setCurrentRoom: (room) => set({ currentRoom: room }),

    // 更新玩家列表
    setPlayers: (players) => set({ players }),

    // 更新连接状态
    setConnected: (connected) => set({ isConnected: connected })
});

export default useRoomStore;

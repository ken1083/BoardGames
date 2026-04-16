/**
 * App.jsx - 全局应用路由器
 * 
 * 职责：
 * 1. 管理应用的4个主要视图状态（HOME_LOBBY → GAME_MENU → ROOM → IN_GAME）
 * 2. 维护跨页面的核心数据（游戏定义、房间信息、游戏状态）
 * 3. 根据状态条件渲染对应的页面组件
 * 4. 处理页面间的状态转移
 * 
 * 核心状态：
 * - currentView: 当前显示的视图（HOME_LOBBY、GAME_MENU、ROOM、IN_GAME）
 * - selectedGame: 用户选择的游戏定义对象（包含id、name_ch、name_en、brief、icon）
 * - roomData: 房间信息（包含房间号、玩家列表、主机ID、设置）
 * - gameState: 游戏状态（包含棋盘、玩家、阶段、消息等）
 * 
 * 用户流程：
 * HOME_LOBBY[选择游戏] → GAME_MENU[加入房间] → ROOM[等待] → IN_GAME[游戏]
 */

import { useState } from 'react';
import { DialogProvider } from './core/contexts/DialogContext';

// 导入4个主要页面组件
import Lobby from './pages/Lobby';           // 游戏列表页面
import GameMenu from './pages/GameMenu';     // 游戏加入/创建房间页面
import Room from './pages/Room';             // 房间大厅
import Game from './pages/Game';             // 游戏容器

function App() {
  // ═══════════════════════════════════════════════════════════════════════════════
  // 状态管理：应用的4个主要视图
  // ═══════════════════════════════════════════════════════════════════════════════

  // 当前显示的视图状态
  // 四个可能的值：
  // - HOME_LOBBY: 游戏列表页
  // - GAME_MENU: 游戏加入/创建房间页面
  // - ROOM: 房间大厅（等待其他玩家）
  // - IN_GAME: 游戏进行中
  const [currentView, setCurrentView] = useState('HOME_LOBBY');

  // 用户选择的游戏定义对象
  // 结构: { id, name_ch, name_en, brief, icon, disabled? }
  const [selectedGame, setSelectedGame] = useState(null);

  // 加入/创建的房间信息
  // 结构: { id, gameType, hostId, players, settings, ... }
  const [roomData, setRoomData] = useState(null);

  // 游戏状态（只在游戏进行时使用）
  // 结构: { board, players, phase, turnIndex, winner, message, ... }
  const [gameState, setGameState] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 事件处理：管理页面状态转移
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 处理游戏选择事件（来自Lobby组件）
   * 从 HOME_LOBBY 跳转到 GAME_MENU 视图
   */
  const handleSelectGame = (gameDef) => {
    setSelectedGame(gameDef);
    setCurrentView('GAME_MENU');
  };

  /**
   * 处理房间加入事件（来自GameMenu组件）
   * 从 GAME_MENU 跳转到 ROOM 视图
   */
  const handleJoinedRoom = (room) => {
    setRoomData(room);
    setCurrentView('ROOM');
  };

  /**
   * 处理游戏启动事件（来自Room组件）
   * 从 ROOM 跳转到 IN_GAME 视图
   */
  const handleGameReady = (state) => {
    console.log('📱 handleGameReady called with state:', state);
    setGameState(state);
    setCurrentView('IN_GAME');
  };

  /**
   * 处理返回大厅事件（软离开：保留在后台）
   */
  const handleBackToLobby = () => {
    setCurrentView('HOME_LOBBY');
  };

  /**
   * 处理彻底离开房间并返回游戏菜单
   */
  const handleLeaveRoom = () => {
    setRoomData(null);
    setGameState(null);
    setCurrentView('GAME_MENU');
  };

  /**
   * 处理返回游戏菜单事件
   */
  const handleBackToGameMenu = () => {
    setRoomData(null);
    setGameState(null);
    setCurrentView('GAME_MENU');
  };

  /**
   * 处理返回房间事件（如游戏被终止）
   * 仅清空游戏状态，返回 ROOM 视图，并更新最新的房间数据
   */
  const handleBackToRoom = (latestRoomData) => {
    if (latestRoomData) {
      setRoomData(latestRoomData);
    }
    setGameState(null);
    setCurrentView('ROOM');
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 条件渲染：根据currentView显示不同的页面
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <DialogProvider>
      {/* 视图1: HOME_LOBBY - 游戏列表页面 */}
      {currentView === 'HOME_LOBBY' && (
        <Lobby onSelectGame={handleSelectGame} />
      )}

      {/* 视图2: GAME_MENU - 加入/创建房间页面 */}
      {currentView === 'GAME_MENU' && (
        <GameMenu
          gameDef={selectedGame}                    // 传入选中的游戏
          activeRoomData={roomData}                 // 传入存在的活动房间
          onJoined={handleJoinedRoom}               // 加入房间成功的回调
          onBack={handleBackToLobby}                // 返回按钮的回调
        />
      )}

      {/* 视图3: ROOM - 房间大厅 */}
      {currentView === 'ROOM' && (
        <Room
          gameDef={selectedGame}                    // 游戏定义
          initialRoomData={roomData}                // 房间信息
          onGameReady={handleGameReady}             // 游戏启动时的回调
          onBackToLobby={handleBackToLobby}         // 暂时挂起回大厅
          onLeaveRoom={handleLeaveRoom}             // 彻底退出房间
          onBackToGameMenu={handleBackToGameMenu}   // 离开房间回到游戏菜单
        />
      )}

      {/* 视图4: IN_GAME - 游戏进行中 */}
      {currentView === 'IN_GAME' && (
        <Game
          gameDef={selectedGame}                    // 游戏定义
          initialRoomData={roomData}                // 房间信息
          initialGameState={gameState}              // 初始游戏状态
          onBackToLobby={handleBackToLobby}         // 离开房间返回大厅
          onBackToRoom={handleBackToRoom}           // 游戏结束返回房间
        />
      )}
    </DialogProvider>
  );
}


export default App;

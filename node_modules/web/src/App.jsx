/**
 * App.jsx - 全局应用路由器
 * 
 * 职责：
 * 1. 管理应用的路由
 * 2. 提供全局上下文
 */

import { Routes, Route } from 'react-router-dom';
import { DialogProvider } from './core/contexts/DialogContext';
import { RoomProvider } from './core/contexts/RoomContext';

import Lobby from './pages/Lobby';
import GameMenu from './pages/GameMenu';
import Room from './pages/Room';
import Game from './pages/Game';

function App() {
  return (
    <DialogProvider>
      <RoomProvider>
        <Routes>
          {/* 视图1: HOME_LOBBY - 游戏列表页面 */}
          <Route path="/" element={<Lobby />} />

          {/* 视图2: GAME_MENU - 加入/创建房间页面 */}
          <Route path="/:gameId" element={<GameMenu />} />

          {/* 视图3: ROOM - 房间大厅 */}
          <Route path="/:gameId/:roomId" element={<Room />} />

          {/* 视图4: IN_GAME - 游戏进行中 */}
          <Route path="/:gameId/:roomId/play" element={<Game />} />
        </Routes>
      </RoomProvider>
    </DialogProvider>
  );
}

export default App;

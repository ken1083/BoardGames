# Treasure Hunt Game Layout Specification

This document summarizes the current "Full-Page Seamless Dashboard" layout architecture implemented for the Treasure Hunt game.

## 1. Visual Architecture (Desktop)

The interface is structured as a **Single-Viewport Dashboard** (`100vh`) with three primary vertical columns and synchronized headers.

```text
+-------------------------------------------------------------+
| [ COLUMN 1: INTEL ] | [ COLUMN 2: MAIN ] | [ COLUMN 3: HUB ]|
|                     |                    |                  |
| Header (80px)       | Header (80px)      | Header (80px)    |
| [Info Icons]        | [Game Nav/Btns]    | [Chat/Rules Tabs]|
|---------------------|--------------------|------------------|
|                     |                    |                  |
| Intel Content       | Hint / Operation   | Utility Content  |
| (Scrollable)        |--------------------| (Scrollable)     |
|                     |                    |                  |
|                     |   Game Board       |                  |
|                     |   (Auto-scaling)   |                  |
|                     |                    |                  |
|                     |--------------------|                  |
|                     |   Confirm Button   |                  |
|                     |                    |                  |
+-------------------------------------------------------------+
```

## 2. Technical Specifications

### Grid System
- **Wrapper**: `h-screen overflow-hidden flex flex-col`
- **Main Grid**: `grid-cols-[280px_1fr_360px]`
  - **Left (280px)**: Dedicated to player identity and real-time status.
  - **Middle (Flexible)**: Priority zone for tactical gameplay.
  - **Right (360px)**: Expanded utility area for communication and documentation.

### Header Synchronization
- **Fixed Height**: All three column headers are locked to `h-20` (80px).
- **Alignment**: This creates a continuous horizontal visual line across the top of the interface, preventing visual "jumping" between sections.

### Seamless Aesthetics
- **Borders**: Vertical dividers between columns have been removed for a "seamless" feel.
- **Backgrounds**: Spatial separation is handled via background contrast:
  - **Sidebars**: `bg-white/50` with glassmorphism effects.
  - **Main Game**: `bg-neutral-50/50` for a focused, tactical backdrop.

## 3. Component Breakdown

### Left Sidebar: Player Intel
- **Phase-aware**: Switches between "Setup Progress" and "In-Game Intel".
- **Visual Cues**: Highlights the active player with a blue focal indicator.
- **Scroll Behavior**: Independent scrolling for high-player-count games.

### Middle: Main Game Stage
- **Navigation**: Contains game metadata (Room ID, Icons) and host controls (Restart/End).
- **Game Phase Info**: Centralized hint bar that updates based on the current turn.
- **Action Hub**: Large, prominent "Confirm" button anchored at the bottom of the stage.

### Right Sidebar: Utility Hub
- **Tabbed Interface**: Segments interaction into "Communication" (Chat) and "Rules".
- **Integrated Rules**: Renders `shared/rules.js` as formatted "mini-cards" for rapid skimming.
- **Chat Logs**: Auto-scrolling message container with distinct system/player message styles.

## 4. Mobile Responsiveness

- **Stacking**: Sidebars are hidden (`hidden lg:flex`).
- **FAB**: A Floating Action Button (Book icon) provides mobile access to rules.
- **Modal View**: Rules open in a full-screen blurred modal with an "X" dismissal.
- **Overlay**: Key setup actions appear as anchored semi-transparent overlays at the bottom of the board.

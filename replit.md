# GestureBoard - Air Writing Educational Platform

## Overview
A React + TypeScript + Vite frontend application that provides a gesture-based air writing whiteboard. Users can draw on a canvas using hand gestures tracked via their camera.

## Architecture
- **Frontend only** — pure React SPA, no backend server
- **Framework**: React 18 + TypeScript
- **Build tool**: Vite 5
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router v6
- **State**: React local state + TanStack Query

## Key Components
- `src/pages/Index.tsx` — main layout: camera panel, whiteboard canvas, toolbar
- `src/components/CameraPanel.tsx` — camera feed and gesture tracking toggle
- `src/components/WhiteboardCanvas.tsx` — canvas drawing surface
- `src/components/ToolbarPanel.tsx` — color picker, brush size, undo/clear/save
- `src/lib/gestureClassifier.ts` — hand gesture recognition logic
- `src/lib/strokeSmoother.ts` — stroke smoothing utilities

## Running the App
The app runs on port 5000 via `npm run dev`.

## Migration Notes (Lovable → Replit)
- Removed `lovable-tagger` dependency from `vite.config.ts`
- Updated Vite server to `host: "0.0.0.0"` and `allowedHosts: true` for Replit proxy compatibility
- Changed dev server port to 5000 (required for Replit webview)
- Fixed CSS `@import` ordering in `src/index.css` (must precede `@tailwind` directives)
- Workflow configured: `npm run dev` on port 5000 with webview output

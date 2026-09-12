# QOTA (AI Quota Monitor)

A sleek, glassmorphic desktop Menu Bar (macOS) and System Tray (Windows) application for tracking remaining quotas and limits on **Google Antigravity**, **Claude Code**, and **OpenAI Codex** in real time.

![QOTA Preview](assets/icon.png)

---

## Features

- **Redesigned Floating Window HUD**:
  - Top header displaying your active model (e.g., `Gemini 3.8 Flash (High)`, `Claude Opus 4.6 (Thinking)`).
  - Straight progress rail for 5-hour limit percentage.
  - Optional toggleable straight progress rail for 7-day weekly limit.
  - Hover-to-reveal expand button (`[↗]`) that smoothly appears on mouse hover and fades out on hover-out.
  - Draggable anywhere on your desktop with floating window persistence.
- **Always-on Color-Coded Menu Bar Monitor (`NSStatusItem` / Tray)**:
  - Color-coded indicator from green (&ge; 50%) &rarr; yellow/orange (20% to 49%) &rarr; red (&lt; 20%).
  - Live unit counter directly in the macOS menu bar (e.g. ` 250u`).
  - Clicking opens the full dashboard with session, weekly, and per-project workspace breakdowns.
- **Service Status Alerts (Public Statuspage.io Monitoring)**:
  - Orange-red warning banner automatically appears when Claude API, Claude Code, or Codex / OpenAI API has degraded performance or an outage.
  - Read solely from official public Statuspage endpoints (`status.claude.com`, `status.openai.com`); never calls LLM usage APIs.
- **Context Nudges & Notifications**:
  - Live tracking of conversation context window fullness.
  - At &ge; 70% capacity (or rapid fills), displays a status nudge: `Context at 74% — Run /compact or /clear to prevent token waste`.
  - Opt-in native system notifications when limits or thresholds are crossed.
- **Prompt Cache Health**:
  - Monitors Claude Code prompt cache hit rate with a live 5-minute TTL countdown to cache expiry.
- **One-Click Section Visibility**:
  - Single-click toggles in Settings to show or hide sections (Antigravity, Claude Code, Codex, Grok CLI).
- **Strict Minimalist Monochrome Aesthetics**:
  - Three ultra-clean themes: Obsidian (Dark), Paper (Light), and Titanium (Slate).
  - Zero emojis throughout the codebase and interface.

---

## Getting Started

### 1. Launching the App (Development Mode)
```bash
npm start
```
The app will launch and dock itself into your Menu Bar (macOS) or System Tray (Windows). Click the icon to view your quota gauges and countdown timers.

### 2. Running Unit Tests
```bash
npm test
```
Validates the QuotaService engine, multipliers, and reset schedules.

---

## Building Executables for macOS & Windows

### Package for macOS (.dmg and .app)
```bash
npm run build:mac
```
Generates a signed, standalone `.app` and `.dmg` in the `dist/` directory for Apple Silicon (`arm64`) and Intel (`x64`).

### Package for Windows (.exe installer & portable)
```bash
npm run build:win
```
Generates an installer (`.exe`) and portable standalone executable in the `dist/` directory.

---

## Architecture

- **`main.js`**: Electron main process managing tray lifecycle, positioning mathematics for both OSes, background polling, and native notifications.
- **`preload.js`**: Context isolation bridge exposing type-safe IPC methods.
- **`src/quota-service.js`**: Core quota engine tracking sprint/weekly limits, countdown timestamps, and model multipliers.
- **`src/index.html` & `src/styles.css`**: Spatial glassmorphism interface adhering to Antigravity design guidelines.
- **`src/renderer.js`**: DOM controller with a 1-second ticker for smooth countdown timers.

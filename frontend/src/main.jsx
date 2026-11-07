// ============================================================
// src/main.jsx — THE REACT ENTRY POINT
// ============================================================
//
// WHAT IS THIS FILE?
// This is where React "boots up". It connects React to the HTML page.
// It runs ONCE when the browser loads your app.
//
// HOW REACT WORKS (big picture):
// Traditional websites: browser reads HTML → displays it directly.
// React apps: browser loads an empty HTML shell (index.html with <div id="root">)
//             → JavaScript runs → React builds the whole UI from components
//             → React "renders" (injects) that UI into <div id="root">
//
// This is called a Single Page Application (SPA):
// - Only ONE HTML page is ever loaded from the server.
// - React handles all navigation client-side (no full page reloads).
// ============================================================

// IMPORT STATEMENTS
// ES Modules syntax (modern JavaScript). This is how we pull in code from:
// - npm packages (installed in node_modules/)
// - Our own files (relative paths like './App.jsx')

import { StrictMode } from 'react'
// StrictMode is a React development tool (doesn't affect production).
// It intentionally renders your components TWICE to help catch bugs like:
// - Side effects in the wrong lifecycle phase
// - Deprecated API usage
// - Unexpected state mutation
// It only runs in development, not production builds.

import { createRoot } from 'react-dom/client'
// react-dom is the bridge between React and the actual browser DOM.
// React itself is platform-agnostic (it can target web, native, VR, etc.)
// react-dom is the web-specific part that knows how to talk to the browser.
//
// createRoot() is the modern React 18+ API (replaces the old ReactDOM.render()).
// It enables "Concurrent Mode" features like automatic batching and transitions.

import './index.css'
// Importing CSS here makes it a dependency of this JS module.
// Vite processes this import and injects the CSS into the page.
// This is NOT standard HTML — Vite's bundler handles the CSS import syntax.

import App from './App.jsx'
// Imports our root App component (defined in App.jsx).
// The "default export" from App.jsx is the App function/component.
// We can name it anything when importing a default export, but "App" is conventional.

// ── MOUNTING THE APP ──────────────────────────────────────────
// Step 1: Find the <div id="root"> in index.html
const rootElement = document.getElementById('root')

// Step 2: Tell React to "take over" that DOM element
//         createRoot() returns a React root object — a special React-managed container
const root = createRoot(rootElement)

// Step 3: Render our App component INTO that root
//         root.render(<App />) means: "Build the App component tree and inject it into <div id="root">"
//
// JSX NOTE: <App /> looks like HTML but it's JSX (JavaScript XML).
// Vite/Babel compiles this to: React.createElement(App, null)
// Which returns a React element (a plain JavaScript object describing the UI).
root.render(
  <StrictMode>
    {/*
      Wrapping App in StrictMode gives us extra warnings in the console during development.
      StrictMode renders as nothing in the DOM — it's invisible but very useful.
    */}
    <App />
  </StrictMode>,
)

// ============================================================
// src/App.jsx — THE ROOT COMPONENT & ROUTER
// ============================================================
//
// WHAT IS A COMPONENT?
// A React component is a JavaScript function that:
//   1. Optionally receives input data ("props")
//   2. Returns JSX — a description of what to show on screen
//
// Convention: component names MUST start with a capital letter.
// - <App />   → React treats this as a component (calls the function)
// - <app />   → React treats this as an HTML element (like <div>)
//
// WHAT DOES THIS FILE DO?
// App.jsx is the "layout shell" of the entire application. It:
//   1. Sets up CLIENT-SIDE ROUTING (React Router) — decides which
//      page component to show based on the URL in the browser bar.
//   2. Defines the PERSISTENT LAYOUT: the Sidebar and Topbar appear
//      on every page, so we render them here once — not in each page.
// ============================================================

// REACT ROUTER v6 IMPORTS
// React Router lets you build a Single Page Application with multiple "pages"
// without ever doing a full browser reload. It intercepts link clicks and
// swaps components in and out instead of loading new HTML pages.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
//  BrowserRouter  → wraps your app; listens to browser URL changes
//                   Uses the HTML5 History API (pushState) — URLs look clean: /parcels/new
//  Routes         → a container for all your Route definitions
//  Route          → maps a URL path to a component
//  Navigate       → programmatically redirects (like <a href> but in JSX)

// PAGE COMPONENTS — each represents one full screen
import ParcelSelectionPage    from './pages/ParcelSelectionPage'
import AnalysisDashboardPage  from './pages/AnalysisDashboardPage'
import SpatialReportPage      from './pages/SpatialReportPage'

// LAYOUT COMPONENTS — always visible regardless of the current page
import Sidebar from './components/Sidebar'
import Topbar  from './components/Topbar'

// STYLES — scoped CSS module for the App layout
import styles from './App.module.css'

// ── THE APP COMPONENT ─────────────────────────────────────────
// This is a "function component" — the modern way to write React components.
// It takes no props (it's the top-level component).
// It returns JSX which describes the complete UI structure.
function App() {
  return (
    // BrowserRouter MUST wrap everything that uses routing features.
    // It provides the "router context" — a shared object that all
    // child components (Link, NavLink, useNavigate, etc.) read from.
    <BrowserRouter>
      {/*
        The outer wrapper is our persistent app shell:
        ┌──────────────────────────────────────────┐
        │ SIDEBAR │ TOPBAR                          │
        │         ├─────────────────────────────────│
        │         │ PAGE CONTENT (changes per route)│
        └──────────────────────────────────────────┘
      */}
      <div className={styles.appShell}>
        {/* SIDEBAR: always visible on the left */}
        <Sidebar />

        {/* MAIN AREA: right side of sidebar */}
        <div className={styles.mainArea}>
          {/* TOPBAR: always visible at the top of the main area */}
          <Topbar />

          {/* PAGE CONTENT: this is the only part that CHANGES per route */}
          <main className={styles.pageContent}>
            {/*
              Routes: React Router looks at the current URL and renders
              the FIRST Route whose path matches.

              Think of it like a switch statement for URLs:
                /            → redirect to /parcels/new
                /parcels/new → show ParcelSelectionPage
                /analysis    → show AnalysisDashboardPage
                /report      → show SpatialReportPage
            */}
            <Routes>
              {/*
                Default route: when the user visits "/", redirect them to "/parcels/new"
                Navigate with replace={true} replaces the history entry (back button won't loop)
              */}
              <Route path="/" element={<Navigate to="/parcels/new" replace />} />

              {/* Parcel Selection: the map + setup panel screen */}
              <Route path="/parcels/new" element={<ParcelSelectionPage />} />

              {/*
                Analysis Dashboard: :id is a URL parameter (dynamic segment).
                /analysis/olive-grove-a → id = "olive-grove-a"
                /analysis/sector-g12   → id = "sector-g12"
                Components can read this with the useParams() hook.
                We also add a static route without :id for easy navigation.
              */}
              <Route path="/analysis/:id" element={<AnalysisDashboardPage />} />
              <Route path="/analysis"     element={<AnalysisDashboardPage />} />

              {/* Spatial Report Preview */}
              <Route path="/report/:id" element={<SpatialReportPage />} />
              <Route path="/report"     element={<SpatialReportPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}

// DEFAULT EXPORT
// Every file should have one "main thing" to export — that's the default export.
// Other files can import this with: import App from './App'
// (No curly braces needed for default imports)
export default App

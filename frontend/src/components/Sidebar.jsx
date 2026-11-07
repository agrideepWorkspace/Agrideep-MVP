// ============================================================
// src/components/Sidebar.jsx — LEFT NAVIGATION SIDEBAR
// ============================================================
//
// COMPONENT TYPE: Presentational / Layout component
//
// WHAT IT DOES:
// Renders the dark-green left sidebar with:
//   - AgriDeep logo at the top
//   - Navigation links: Parcels, Analyses, Reports, Settings
//   - User profile card at the bottom
//
// REACT CONCEPTS IN THIS FILE:
//   ✅ Functional component
//   ✅ Named exports vs default exports
//   ✅ NavLink (React Router) — special link that knows if it's "active"
//   ✅ Props — receiving data from parent (App.jsx passes nothing here,
//      but the MOCK_USER data is imported directly)
//   ✅ CSS Modules — scoped class names
// ============================================================

import { NavLink } from 'react-router-dom'
// NavLink is like <a href> but React-Router-aware.
// It automatically adds an "active" class when its href matches the current URL.
// This lets us highlight the currently selected nav item without any manual state.
// Regular <Link> also works but doesn't give you the active styling hook.

import { MOCK_USER } from '../data/mockData'
// We import user data directly. In a real app, this would come from
// an authentication context (e.g., const user = useAuth())

import styles from './Sidebar.module.css'

// ── SVG ICON COMPONENTS ───────────────────────────────────────
// We define tiny inline SVG icons as React components.
// Advantages over icon libraries:
//   ✅ Zero extra dependencies
//   ✅ Full control over size, color, stroke
//   ✅ They receive `size` as a prop — demonstrating basic prop passing

// PROPS: { size } — how big to render the icon (in pixels)
// This is "prop destructuring" — instead of (props) → props.size,
// we directly unpack { size } from the props object.
function IconLeaf({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
    </svg>
  )
}

function IconGrid({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}

function IconBarChart({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  )
}

function IconFile({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}

function IconSettings({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
    </svg>
  )
}

function IconLogout({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

// ── NAV ITEMS ARRAY ───────────────────────────────────────────
// Storing nav config as data (not JSX) is a common React pattern.
// It avoids repeating JSX for each item — just map() over the array.
// If you need to add/remove a nav item, you change ONE array entry.
const NAV_ITEMS = [
  { to: '/parcels/new', label: 'Parcels',   Icon: IconGrid },
  { to: '/analysis',   label: 'Analyses',   Icon: IconBarChart },
  { to: '/report',     label: 'Reports',    Icon: IconFile },
]

// ── THE SIDEBAR COMPONENT ─────────────────────────────────────
function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      {/* LOGO SECTION */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <IconLeaf size={20} />
        </div>
        <span className={styles.logoText}>AgriDeep</span>
      </div>

      {/* NAVIGATION */}
      <nav className={styles.nav}>
        {/*
          .map() is how React renders lists.
          For each item in NAV_ITEMS, we return a JSX element.

          KEY PROP: { key } is REQUIRED on list items.
          React uses it to efficiently update only the changed items
          when the list changes. Use a unique identifier (here: item.to URL).
          Never use array INDEX as key if the list can change order.

          NavLink className prop accepts a FUNCTION (not a string).
          React Router calls it with { isActive: true/false }.
          We return different class names based on that.
        */}
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
            }
          >
            {/* Icon is a component stored in a variable — capitalize it! */}
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* BOTTOM SECTION: Settings + User Profile */}
      <div className={styles.bottom}>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
          }
        >
          <IconSettings size={18} />
          <span>Settings</span>
        </NavLink>

        {/* USER PROFILE CARD */}
        <div className={styles.userCard}>
          {/* Avatar circle with initials */}
          <div className={styles.avatar}>
            {MOCK_USER.avatarInitials}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{MOCK_USER.name}</p>
            <p className={styles.userTitle}>{MOCK_USER.title}</p>
          </div>
          {/* Logout icon button */}
          <button className={styles.logoutBtn} title="Sign out">
            <IconLogout size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

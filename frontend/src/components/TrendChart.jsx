// ============================================================
// src/components/TrendChart.jsx — NDVI/NDMI LINE CHART
// ============================================================
//
// WHAT IT DOES: Renders the bi-weekly vegetation & moisture
// trend chart using the Recharts library.
//
// REACT CONCEPTS:
//   ✅ Using a third-party component library (Recharts)
//   ✅ Props: receiving `data` array from parent
//   ✅ Responsive container — adapts to parent width
// ============================================================

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
// Recharts exports many small components you compose together.
// Think of it like LEGO: ResponsiveContainer wraps LineChart,
// which contains XAxis, YAxis, Line pieces, etc.

import styles from './TrendChart.module.css'

// Custom tooltip that appears when you hover over a data point
function CustomTooltip({ active, payload, label }) {
  // `active` = true when mouse is hovering over a point
  // `payload` = array of the data values at that point
  // `label`   = the X-axis value (date string)
  if (!active || !payload || !payload.length) return null

  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipDate}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className={styles.tooltipRow}>
          <span className={styles.tooltipLabel}>{entry.name.toUpperCase()}</span>
          <span className={styles.tooltipValue}>{entry.value.toFixed(2)}</span>
        </p>
      ))}
    </div>
  )
}

// PROPS:
//   data → array of { date, ndvi, ndmi } objects from mockData
function TrendChart({ data = [] }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Vegetation &amp; Moisture Trends</h3>
          <p className={styles.subtitle}>Bi-weekly progression of health indices</p>
        </div>
      </div>

      {/*
        ResponsiveContainer makes the chart fill its parent's width.
        width="100%" means take full parent width.
        height={280} is a fixed pixel height.
        Without this, Recharts charts need explicit pixel widths.
      */}
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>

          {/* Dashed grid lines in the background */}
          <CartesianGrid strokeDasharray="4 4" stroke="#E5E7EB" vertical={false} />

          {/* X axis: shows the date strings */}
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
          />

          {/* Y axis: shows 0.1 to 0.5 range */}
          <YAxis
            domain={[0.1, 0.55]}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
            tickCount={5}
          />

          {/* Tooltip on hover */}
          <Tooltip content={<CustomTooltip />} />

          {/* Legend below or above the chart */}
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
          />

          {/* NDVI line — green */}
          <Line
            type="monotone"
            dataKey="ndvi"
            name="NDVI"
            stroke="#2D6A4F"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#2D6A4F', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#2D6A4F' }}
          />

          {/* NDMI line — blue */}
          <Line
            type="monotone"
            dataKey="ndmi"
            name="NDMI"
            stroke="#60A5FA"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#60A5FA', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#60A5FA' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default TrendChart

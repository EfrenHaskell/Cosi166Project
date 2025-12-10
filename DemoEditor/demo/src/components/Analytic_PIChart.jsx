import React from "react";

export default function Analytic_PIChart({ data, size = 280 }) {
  const palette = [
    "#4caf50",
    "#ff9800",
    "#f44336",
    "#9c27b0",
    "#2196f3",
    "#ffc107",
  ];

  function transformResponse(resp, { asPercent = false } = {}) {
    const skills = resp?.categorized_skills || {};
    const entries = Object.entries(skills);
    if (!entries.length) return [];

    const totalCount = entries.reduce((s, [, v]) => s + (v || 0), 0) || 1;

    return entries.map(([label, val], i) => {
      const value = asPercent
        ? Math.round(((val || 0) / totalCount) * 100)
        : val || 0;
      return { label, value, color: palette[i % palette.length] };
    });
  }

  // Usage:
  const resp = {
    status: "success",
    categorized_skills: {
      "String data type": 2,
      "Built-in Functions": 1,
      "Basic Syntax": 3,
    },
    total_students: 4,
  };

  console.log(transformResponse(resp)); // counts array
  console.log(transformResponse(resp, { asPercent: true })); // percentages array

  const dataset = data && data.length ? data : sample;
  const total = dataset.reduce((s, d) => s + (d.value || 0), 0) || 1;

  // build simple arcs for SVG pie
  let cumulative = 0;
  const radius = size / 2;
  const center = size / 2;

  return (
    <div style={{ display: "flex", gap: 19, alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {dataset.map((d, i) => {
          const value = d.value || 0;
          const start = (cumulative / total) * 2 * Math.PI;
          cumulative += value;
          const end = (cumulative / total) * 2 * Math.PI;

          const largeArc = end - start > Math.PI ? 1 : 0;
          const x1 = center + radius * Math.cos(start - Math.PI / 2);
          const y1 = center + radius * Math.sin(start - Math.PI / 2);
          const x2 = center + radius * Math.cos(end - Math.PI / 2);
          const y2 = center + radius * Math.sin(end - Math.PI / 2);

          const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          return <path key={i} d={path} fill={d.color || "#ccc"} />;
        })}
        <circle cx={center} cy={center} r={radius * 0.45} fill="#fff" />
      </svg>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {dataset.map((d, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                background: d.color || "#ccc",
                borderRadius: 3,
              }}
            />
            <div style={{ fontSize: 13, color: "#222" }}>
              {d.label}: {d.value} ({Math.round(((d.value || 0) / total) * 100)}
              %)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

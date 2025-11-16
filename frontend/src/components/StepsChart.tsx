// src/components/StepsChart.tsx

type StepsChartProps = {
  weeklySteps: number[]; // expected length 7, but we'll be defensive
};

const LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function StepsChart({ weeklySteps }: StepsChartProps) {
  // Normalize input to exactly 7 points
  const data =
    weeklySteps && weeklySteps.length === 7
      ? weeklySteps
      : Array.from({ length: 7 }, (_, i) => weeklySteps?.[i] ?? 0);

  const max = Math.max(...data, 1); // avoid division by zero

  // Build polyline points for SVG
  const points = data
    .map((value, idx) => {
      const x =
        (idx / (data.length - 1)) * 100; // 0 -> 100 horizontally across
      const normalized = value / max; // 0..1
      // y = 80 (bottom) to 10 (top) in SVG coordinates
      const y = 80 - normalized * 60;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Weekly steps</h3>

      <div
        style={{
          width: "100%",
          height: 220,
          position: "relative",
        }}
      >
        {/* Chart area */}
        <svg
          viewBox="0 0 100 90"
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 8,
          }}
        >
          {/* Optional background grid line */}
          <line
            x1={0}
            y1={80}
            x2={100}
            y2={80}
            stroke="#283144"
            strokeWidth={0.5}
          />

          {/* Line graph */}
          <polyline
            points={points}
            fill="none"
            stroke="#4ea4ff"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Small dots at each point */}
          {data.map((value, idx) => {
            const x =
              (idx / (data.length - 1)) * 100;
            const normalized = value / max;
            const y = 80 - normalized * 60;
            return (
              <circle
                key={`pt-${idx}`}
                cx={x}
                cy={y}
                r={1.2}
                fill="#4ea4ff"
              />
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "space-between",
            padding: "0 8px",
            fontSize: 12,
            color: "#9aa3c0",
          }}
        >
          {LABELS.map((label, idx) => (
            <span key={`${label}-${idx}`}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

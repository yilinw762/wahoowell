// src/components/TopPanel.tsx

type TopPanelProps = {
  stepsToday: number;
  caloriesToday: number;
  sleepHoursToday: number;
};

export default function TopPanel({
  stepsToday,
  caloriesToday,
  sleepHoursToday,
}: TopPanelProps) {
  return (
    <div className="row" style={{ marginTop: 24, gap: 16 }}>
      <div className="col-4">
        <div className="card">
          <div style={{ fontSize: 28, fontWeight: 600 }}>
            {stepsToday.toLocaleString()}
          </div>
          <div style={{ color: "#9aa3c0" }}>Steps (today)</div>
        </div>
      </div>

      <div className="col-4">
        <div className="card">
          <div style={{ fontSize: 28, fontWeight: 600 }}>
            {caloriesToday.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </div>
          <div style={{ color: "#9aa3c0" }}>Calories burned (today)</div>
        </div>
      </div>

      <div className="col-4">
        <div className="card">
          <div style={{ fontSize: 28, fontWeight: 600 }}>
            {sleepHoursToday.toFixed(1)}
          </div>
          <div style={{ color: "#9aa3c0" }}>Sleep hours (today)</div>
        </div>
      </div>
    </div>
  );
}

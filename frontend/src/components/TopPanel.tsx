export default function TopPanel() {
  return (
    <div className="row">
      <div className="col-4">
        <div className="card">
          <div className="kpi">8,412</div>
          <div className="kpi-sub">Steps (today)</div>
        </div>
      </div>
      <div className="col-4">
        <div className="card">
          <div className="kpi">2,031</div>
          <div className="kpi-sub">Calories burned</div>
        </div>
      </div>
      <div className="col-4">
        <div className="card">
          <div className="kpi">Low</div>
          <div className="kpi-sub">Stress level</div>
        </div>
      </div>
    </div>
  );
}

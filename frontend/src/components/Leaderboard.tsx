export default function Leaderboard() {
  const rows = [
    { user: "Maya", steps: 70542 },
    { user: "Chris", steps: 68912 },
    { user: "Alex", steps: 66450 },
    { user: "Taylor", steps: 61230 },
    { user: "Sam", steps: 60310 },
  ];

  return (
    <div className="card">
      <h3 style={{marginTop:0}}>Top 5 – Steps This Week</h3>
      <hr className="sep" />
      <div style={{display:"grid", gap:8}}>
        {rows.map((r, i) => (
          <div key={i} style={{
            display:"flex", justifyContent:"space-between",
            padding:"8px 10px", borderRadius:10, background:"#0f1520",
            border:"1px solid #1a2433"
          }}>
            <span>#{i+1} {r.user}</span>
            <span style={{color:"var(--muted)"}}>{r.steps.toLocaleString()} steps</span>
          </div>
        ))}
      </div>
    </div>
  );
}

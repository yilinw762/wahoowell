export default function CommunityFeed() {
  const posts = [
    { user: "Maya", text: "Hit 10k steps three days in a row!", likes: 12, comments: 3 },
    { user: "Alex", text: "Morning run + yoga. Feeling great.", likes: 7, comments: 1 },
    { user: "Chris", text: "Closed all rings today 🔥", likes: 21, comments: 6 },
  ];

  return (
    <div className="feed">
      {posts.map((p, i) => (
        <div key={i} className="post">
          <strong>{p.user}</strong>
          <p style={{margin:"6px 0 8px"}}>{p.text}</p>
          <div style={{display:"flex", gap:12, fontSize:13, color:"var(--muted)"}}>
            <span>👍 {p.likes}</span>
            <span>💬 {p.comments}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

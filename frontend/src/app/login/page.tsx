"use client";

import Link from "next/link";

export default function LoginPage() {
  const onGoogle = () => alert("TODO: hook up Google OAuth");
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Pretend we logged in!");
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="card" style={{maxWidth:520, margin:"0 auto"}}>
          <h1 style={{marginTop:0}}>Login</h1>

          <button className="button" onClick={onGoogle} style={{marginBottom:12}}>
            Continue with Google
          </button>

          <div style={{textAlign:"center", color:"var(--muted)", fontSize:13, margin:"8px 0"}}>or</div>

          <form onSubmit={onSubmit}>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com" required />
            <div style={{height:12}} />
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="••••••••" required />
            <div style={{height:16}} />
            <button className="button" type="submit">Login</button>
          </form>

          <p style={{marginTop:12, fontSize:14}}>
            New here? <Link href="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

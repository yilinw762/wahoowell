"use client";

import Link from "next/link";

export default function RegisterPage() {
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Pretend we created your account!");
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="card" style={{maxWidth:520, margin:"0 auto"}}>
          <h1 style={{marginTop:0}}>Create Account</h1>
          <form onSubmit={onSubmit}>
            <label className="label">Email</label>
            <input className="input" type="email" required />
            <div style={{height:12}} />
            <label className="label">Password</label>
            <input className="input" type="password" required />
            <div style={{height:12}} />
            <label className="label">Confirm Password</label>
            <input className="input" type="password" required />
            <div style={{height:16}} />
            <button className="button" type="submit">Register</button>
          </form>
          <p style={{marginTop:12, fontSize:14}}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

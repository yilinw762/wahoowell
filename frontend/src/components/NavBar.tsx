"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/data-entry", label: "Data Entry" },
  { href: "/community", label: "Community" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)",
      borderBottom: "1px solid #1a2433", background: "rgba(11,15,20,0.6)"
    }}>
      <div className="container" style={{display:"flex", alignItems:"center", gap:16, justifyContent:"space-between"}}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <div style={{fontWeight:800}}>Wahoo<span style={{color:"var(--accent)"}}>Well</span></div>
          <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
            {links.map(l => (
              <Link key={l.href} href={l.href}>
                <span style={{
                  padding:"8px 12px",
                  borderRadius:10,
                  background: pathname === l.href ? "#121821" : "transparent",
                  border: pathname === l.href ? "1px solid #1a2433" : "1px solid transparent"
                }}>{l.label}</span>
              </Link>
            ))}
            <Link href="/followers">
              <span style={{
                padding:"8px 12px",
                borderRadius:10,
                background: pathname === "/followers" ? "#121821" : "transparent",
                border: pathname === "/followers" ? "1px solid #1a2433" : "1px solid transparent"
              }}>Followers</span>
            </Link>
            {!session?.user && (
              <>
                <Link href="/login">
                  <span style={{
                    padding:"8px 12px",
                    borderRadius:10,
                    background: pathname === "/login" ? "#121821" : "transparent",
                    border: pathname === "/login" ? "1px solid #1a2433" : "1px solid transparent"
                  }}>Login</span>
                </Link>
                <Link href="/register">
                  <span style={{
                    padding:"8px 12px",
                    borderRadius:10,
                    background: pathname === "/register" ? "#121821" : "transparent",
                    border: pathname === "/register" ? "1px solid #1a2433" : "1px solid transparent"
                  }}>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          {session?.user ? (
            <>
              <span>Hello, {session.user.name || session.user.username || session.user.email}!</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Log out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
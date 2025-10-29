"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/data-entry", label: "Data Entry" },
  { href: "/community", label: "Community" },
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)",
      borderBottom: "1px solid #1a2433", background: "rgba(11,15,20,0.6)"
    }}>
      <div className="container" style={{display:"flex", alignItems:"center", gap:16}}>
        <div style={{fontWeight:800}}>Health<span style={{color:"var(--accent)"}}>Tracker</span></div>
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
        </div>
      </div>
    </nav>
  );
}

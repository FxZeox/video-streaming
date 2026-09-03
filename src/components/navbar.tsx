"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
// icons not needed in simplified navbar
import { siteConfig } from "@/lib/site";

const links = [
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className={`site-header ${scrolled || open ? "is-scrolled" : ""}`}>
      <div className="nav-shell">
        <Link href="/" className="wordmark" aria-label={`${siteConfig.name} home`} onClick={() => setOpen(false)}>
          <span className="mark" aria-hidden="true"><i /><i /></span>{siteConfig.name}
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
              {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <span aria-hidden="true" />
      </div>
      {/* Mobile uses the desktop nav directly now */}
    </header>
  );
}

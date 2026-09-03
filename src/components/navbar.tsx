"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Close, Menu } from "@/components/icons";
import { siteConfig } from "@/lib/site";

const links = [
  { label: "Work", href: "/work" },
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
        <button className="menu-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <Close /> : <Menu />}
        </button>
      </div>
      <div id="mobile-menu" className={`mobile-menu ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <nav aria-label="Mobile navigation">
          {links.map((link, index) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}><span>0{index + 1}</span>{link.label}</Link>)}
        </nav>
      </div>
    </header>
  );
}

import Link from "next/link";
import { ArrowUpRight } from "@/components/icons";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div>
          <Link href="/" className="wordmark"><span className="mark" aria-hidden="true"><i /><i /></span>{siteConfig.name}</Link>
          <p>{siteConfig.description}</p>
        </div>
        <div className="footer-links">
          <div><span className="micro-label">Explore</span><Link href="/work">Work</Link><Link href="/services">Services</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link></div>
          <div><span className="micro-label">Connect</span>{siteConfig.socials.map((item) => <a key={item.label} href={item.href}>{item.label} <ArrowUpRight /></a>)}</div>
        </div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} {siteConfig.name}</span><span>Independent video editor · Available worldwide</span></div>
    </footer>
  );
}

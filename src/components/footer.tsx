import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div>
          <Link href="/" className="wordmark"><span className="mark" aria-hidden="true"><i /><i /></span>{siteConfig.name}</Link>
          <p>{siteConfig.description}</p>
        </div>
        <div className="footer-links" aria-label="Footer navigation">
          <div className="footer-link-group footer-link-group-top">
            <span className="micro-label">Explore</span>
            <div className="footer-link-row">
              <Link href="/work">Work</Link>
              <Link href="/services">Services</Link>
              <Link href="/about">About</Link>
            </div>
          </div>
          <div className="footer-link-group footer-link-group-bottom">
            <span className="micro-label">Social</span>
            <div className="footer-link-row">
              {siteConfig.socials.map((social) => (
                <a key={social.href} href={social.href} target="_blank" rel="noreferrer">{social.label}</a>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} {siteConfig.name}</span><span> Available worldwide</span></div>
    </footer>
  );
}

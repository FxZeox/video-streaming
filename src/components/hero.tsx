import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "@/components/icons";

export function Hero() {
  return (
    <section className="hero">
      <Image className="hero-image" src="/images/edit-suite.webp" alt="Professional editor working in a dark post-production studio" fill priority sizes="100vw" />
      <div className="hero-overlay" />
      <div className="hero-grain" />
      <div className="container hero-content">
        <p className="kicker reveal">Video editor · Storyteller · Post production</p>
        <h1 className="reveal reveal-delay-1">Films that make<br />people <em>feel.</em></h1>
        <div className="hero-lower reveal reveal-delay-2">
          <p>Professional video editing for creators, brands, and businesses that care about every frame.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/work">View my work <ArrowRight /></Link></div>
        </div>
        <Link className="showreel-chip" href="/work/after-the-summit"><span className="mini-play"><Play /></span><span><small>Featured project</small>Watch the cut</span></Link>
      </div>
      <div className="hero-index"><span>PLAY</span><i /><span>STORY</span><i /><span>FEELING</span></div>
    </section>
  );
}

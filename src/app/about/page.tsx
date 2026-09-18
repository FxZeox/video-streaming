import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/sections";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "About", description: "About the editor and the philosophy behind every cut.", alternates: { canonical: "/about" } };

const tools = ["Adobe Premiere Pro", "After Effects", "DaVinci Resolve", "Photoshop", "Adobe Audition"];

export default function AboutPage() {
  return (
    <main id="main">
      <PageHero
        eyebrow="About · The editor"
        title={<>Behind every cut<br />is an intention.</>}
        copy="I help good footage become a clear, memorable story—through rhythm, restraint, and an obsession with the details that viewers may never consciously notice."
      />

      <section className="section about-story">
        <div className="container about-story-grid">
          <div className="about-portrait">
            {siteConfig.profileImageUrl ? (
              <Image src={siteConfig.profileImageUrl} alt="Evol Visuals portrait" fill sizes="(max-width: 768px) 100vw, 42vw" />
            ) : null}
            <span className="image-note">Evol Visuals</span>
          </div>

          <div className="story-copy">
            <p className="kicker">A note from the editor</p>
            <h2>Hi, I&apos;m {siteConfig.editorName}.</h2>

            <p>
              I&apos;m a video editor and visual creator who enjoys turning raw footage into videos that feel
              natural, engaging, and easy to watch. I care about the little things - timing, pacing, music,
              transitions, and how everything comes together.
            </p>

            <p>
              I also design YouTube thumbnails with CTR and clickability in mind. For me, a thumbnail isn&apos;t
              just about looking good, it should catch attention, create curiosity, and make someone want to click.
            </p>

            <p>
              Whether I&apos;m editing a video or designing a thumbnail, I always try to make the final result
              feel clear, engaging, and worth watching.
            </p>

            <div className="availability">
              <i />
              <span>Currently available for selected projects</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section principles">
        <div className="container">
          <div className="principles-grid">
            <p className="kicker">Editing philosophy</p>
            <div>
              <article>
                <span>01</span>
                <h3>Story before style.</h3>
                <p>Every creative decision should serve what the piece is trying to say.</p>
              </article>

              <article>
                <span>02</span>
                <h3>Rhythm creates feeling.</h3>
                <p>Pacing is more than speed. It shapes attention, tension, and emotion.</p>
              </article>

              <article>
                <span>03</span>
                <h3>Details build trust.</h3>
                <p>Clean sound, considered transitions, and consistent color make the whole film feel inevitable.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="section tools-section">
        <div className="container">
          <p className="kicker">Tools of the trade</p>
          <div className="tools-list">
            {tools.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

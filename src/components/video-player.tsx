"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Expand, Pause, Play, Volume, VolumeOff } from "@/components/icons";
import type { VideoSource } from "@/data/projects";

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function VideoPlayer({ poster, sources, title }: { poster: string; sources: VideoSource[]; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const start = async () => {
    setActivated(true); setLoading(true); setError(false);
    requestAnimationFrame(() => videoRef.current?.play().catch(() => setError(true)));
  };

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play(); else video.pause();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!activated || !videoRef.current) return;
      if (event.code === "Space" && document.activeElement?.closest(".video-player")) { event.preventDefault(); toggle(); }
      if (event.key.toLowerCase() === "m") setMuted((value) => !value);
      if (event.key === "ArrowRight") videoRef.current.currentTime += 5;
      if (event.key === "ArrowLeft") videoRef.current.currentTime -= 5;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activated]);

  return (
    <div ref={shellRef} className="video-player" tabIndex={0} aria-label={`${title} video player`}>
      {!activated && <><Image src={poster} alt={`${title} video poster`} fill priority sizes="100vw" unoptimized={poster.startsWith("http")} /><span className="player-shade" /><button className="player-launch" onClick={start} aria-label={`Play ${title}`}><Play /><span>Play film</span></button></>}
      {activated && <video ref={videoRef} playsInline preload="metadata" poster={poster} muted={muted} onPlay={() => { setPlaying(true); setLoading(false); }} onPause={() => setPlaying(false)} onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)} onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)} onDurationChange={(event) => setDuration(event.currentTarget.duration)} onError={() => { setError(true); setLoading(false); }} onClick={toggle}>{sources.map((source) => <source key={source.src} src={source.src} type={source.type} />)}</video>}
      {loading && <div className="player-status"><span className="loader" />Loading film…</div>}
      {error && <div className="player-error"><strong>Preview video isn&apos;t connected yet.</strong><span>The player is ready for your local or self-hosted URL.</span><button onClick={() => { setActivated(false); setError(false); }}>Return to poster</button></div>}
      {activated && !error && <div className="player-controls">
        <button onClick={toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause /> : <Play />}</button>
        <span>{formatTime(current)}</span>
        <input aria-label="Video progress" type="range" min="0" max={duration || 0} step="0.1" value={current} onChange={(event) => { if (videoRef.current) videoRef.current.currentTime = Number(event.target.value); }} />
        <span>{formatTime(duration)}</span>
        <button onClick={() => setMuted((value) => !value)} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeOff /> : <Volume />}</button>
        <select aria-label="Playback speed" value={speed} onChange={(event) => { const value = Number(event.target.value); setSpeed(value); if (videoRef.current) videoRef.current.playbackRate = value; }}><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>
        <button onClick={() => shellRef.current?.requestFullscreen()} aria-label="Enter fullscreen"><Expand /></button>
      </div>}
    </div>
  );
}

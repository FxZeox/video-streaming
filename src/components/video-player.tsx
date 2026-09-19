"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Expand, Pause, Play, SeekBackward, SeekForward, Volume, VolumeOff } from "@/components/icons";
import type { VideoSource } from "@/data/projects";
import { getYouTubeVideoId } from "@/lib/project-validation";

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

type VideoPlayerProps = { poster: string; sources: VideoSource[]; title: string };

export function VideoPlayer(props: VideoPlayerProps) {
  const youtubeId = getYouTubeVideoId(props.sources.find((source) => source.src)?.src ?? "");
  return youtubeId ? <YouTubePlayer key={youtubeId} {...props} videoId={youtubeId} /> : <NativeVideoPlayer {...props} />;
}

function YouTubePlayer({ poster, title, videoId }: VideoPlayerProps & { videoId: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [activated, setActivated] = useState(false);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const embedParams = new URLSearchParams({
    autoplay: "0",
    controls: "0",
    disablekb: "1",
    enablejsapi: "1",
    fs: "0",
    iv_load_policy: "3",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
  });
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?${embedParams.toString()}`;

  const sendPlayerCommand = (func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
      event: "command",
      func,
      args,
    }), "https://www.youtube-nocookie.com");
  };

  const connectPlayer = () => {
    setReady(true);
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
      event: "listening",
      id: "portfolio-player",
      channel: "portfolio-player",
    }), "https://www.youtube-nocookie.com");
    sendPlayerCommand("addEventListener", ["onStateChange"]);
  };

  useEffect(() => {
    const receivePlayerUpdate = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.origin !== "https://www.youtube-nocookie.com" && event.origin !== "https://www.youtube.com") return;

      let message: { event?: string; info?: unknown };
      try {
        message = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (message.event === "onStateChange" && typeof message.info === "number") {
        setPlaying(message.info === 1);
        if (message.info === 0) setCurrent(duration);
        return;
      }

      if (message.event !== "infoDelivery" || !message.info || typeof message.info !== "object") return;
      const info = message.info as { currentTime?: unknown; duration?: unknown; playerState?: unknown; muted?: unknown };
      if (typeof info.currentTime === "number") setCurrent(info.currentTime);
      if (typeof info.duration === "number") setDuration(info.duration);
      if (typeof info.playerState === "number") setPlaying(info.playerState === 1);
      if (typeof info.muted === "boolean") setMuted(info.muted);
    };

    window.addEventListener("message", receivePlayerUpdate);
    return () => window.removeEventListener("message", receivePlayerUpdate);
  }, [duration]);

  const startYouTube = () => {
    if (!ready) return;
    sendPlayerCommand("playVideo");
    setActivated(true);
    setPlaying(true);
  };

  const togglePlayback = () => {
    const nextPlaying = !playing;
    sendPlayerCommand(nextPlaying ? "playVideo" : "pauseVideo");
    setPlaying(nextPlaying);
  };

  const toggleMute = () => {
    const nextMuted = !muted;
    sendPlayerCommand(nextMuted ? "mute" : "unMute");
    setMuted(nextMuted);
  };

  const seekTo = (value: number) => {
    const nextTime = Math.max(0, Math.min(duration || value, value));
    sendPlayerCommand("seekTo", [nextTime, true]);
    setCurrent(nextTime);
  };

  return <div ref={shellRef} className="video-player youtube-player" aria-label={`${title} video player`}>
    <iframe
      ref={iframeRef}
      src={embedUrl}
      title={title}
      allow="autoplay; encrypted-media; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      tabIndex={-1}
      onLoad={connectPlayer}
    />
    {!activated ? <>
      <Image src={poster} alt={`${title} video poster`} fill priority sizes="100vw" unoptimized />
      <span className="player-shade" />
      <button className="player-launch" disabled={!ready} onClick={startYouTube} aria-label={ready ? `Play ${title}` : `Loading ${title}`}><Play /><span>{ready ? "Play film" : "Loading player…"}</span></button>
    </> : <>
      <div className="player-controls youtube-controls">
        <button onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>{playing ? <Pause /> : <Play />}</button>
        <button onClick={() => seekTo(current - 10)} aria-label="Go back 10 seconds"><SeekBackward /></button>
        <span>{formatTime(current)}</span>
        <input aria-label="Video progress" type="range" min="0" max={duration || 0} step="0.1" value={Math.min(current, duration || 0)} onChange={(event) => seekTo(Number(event.target.value))} />
        <span>{formatTime(duration)}</span>
        <button onClick={() => seekTo(current + 10)} aria-label="Go forward 10 seconds"><SeekForward /></button>
        <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeOff /> : <Volume />}</button>
        <button onClick={() => shellRef.current?.requestFullscreen()} aria-label="Enter fullscreen"><Expand /></button>
      </div>
    </>}
  </div>;
}

function NativeVideoPlayer({ poster, sources, title }: VideoPlayerProps) {
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

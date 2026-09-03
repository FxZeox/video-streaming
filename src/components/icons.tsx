import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export function ArrowUpRight(props: IconProps) { return <svg {...base} {...props}><path d="M7 17 17 7M7 7h10v10" /></svg>; }
export function ArrowRight(props: IconProps) { return <svg {...base} {...props}><path d="M5 12h14M14 7l5 5-5 5" /></svg>; }
export function Play(props: IconProps) { return <svg {...base} {...props} fill="currentColor" stroke="none"><path d="m9 7 8 5-8 5V7Z" /></svg>; }
export function Pause(props: IconProps) { return <svg {...base} {...props} fill="currentColor" stroke="none"><path d="M7 6h3v12H7zM14 6h3v12h-3z" /></svg>; }
export function Volume(props: IconProps) { return <svg {...base} {...props}><path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12" /></svg>; }
export function VolumeOff(props: IconProps) { return <svg {...base} {...props}><path d="m11 5-5 4H3v6h3l5 4V5ZM16 10l5 5M21 10l-5 5" /></svg>; }
export function Expand(props: IconProps) { return <svg {...base} {...props}><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>; }
export function Menu(props: IconProps) { return <svg {...base} {...props}><path d="M4 8h16M4 16h16" /></svg>; }
export function Close(props: IconProps) { return <svg {...base} {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>; }
export function Check(props: IconProps) { return <svg {...base} {...props}><path d="m5 12 4 4L19 6" /></svg>; }
export function Eye(props: IconProps) { return <svg {...base} {...props}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>; }
export function EyeOff(props: IconProps) { return <svg {...base} {...props}><path d="m3 3 18 18M10.6 6.1A9 9 0 0 1 12 6c6 0 9.5 6 9.5 6a14 14 0 0 1-2.1 2.8M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9.2 9.2 0 0 0 3.4-.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>; }
export function Spark(props: IconProps) { return <svg {...base} {...props}><path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3ZM18.5 15l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" /></svg>; }

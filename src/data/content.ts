export const services = [
  { number: "01", title: "Video Editing", description: "Story-led edits with considered pacing, structure, and a polished finish." },
  { number: "02", title: "Motion Graphics", description: "Purposeful titles, graphics, and animation that feel native to your story." },
  { number: "03", title: "Short-form Content", description: "Fast, platform-aware edits designed to earn and hold attention." },
  { number: "04", title: "Color Correction", description: "Clean, consistent images and a distinctive grade that supports the mood." },
  { number: "05", title: "Sound Design", description: "Detailed sound, music, and mix choices that make every cut land." },
  { number: "06", title: "Content Repurposing", description: "Thoughtful new cuts from existing footage for every useful format." },
] as const;

export const processSteps = [
  { number: "01", title: "Tell me about it", description: "We align on the story, audience, references, scope, and deadline." },
  { number: "02", title: "Share your footage", description: "You send the source files through your preferred transfer method." },
  { number: "03", title: "Edit & refine", description: "I build the cut, share a review link, and shape it with your feedback." },
  { number: "04", title: "Final delivery", description: "You receive polished masters, exports, and any agreed cutdowns." },
] as const;

// Testimonials removed — content managed via admin projects. Kept minimal.

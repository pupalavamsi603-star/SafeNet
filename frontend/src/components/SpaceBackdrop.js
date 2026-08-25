import { StarField } from "./StarField";

/**
 * Deep-space hero backdrop: a planet rising from the bottom with a lit rim,
 * atmospheric glow above the horizon, and a twinkling starfield.
 *
 * Everything is CSS gradients + the existing canvas starfield — no images, so
 * it stays sharp at any size and costs nothing to download.
 */
export function SpaceBackdrop({ className = "" }) {
  return (
    <div className={`absolute inset-0 overflow-hidden bg-[#04060f] ${className}`} aria-hidden="true">
      {/* faint nebula wash so the black isn't flat */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 105%, rgba(29,78,216,0.30) 0%, rgba(12,20,52,0.18) 35%, rgba(4,6,15,0) 70%)",
        }}
      />

      {/* twinkling stars (parallax + cursor aura) */}
      <StarField density={150} color="255, 255, 255" />

      {/* atmospheric halo sitting just above the horizon */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[150%] h-[70%] pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(56,189,248,0.28) 0%, rgba(37,99,235,0.14) 40%, rgba(4,6,15,0) 72%)",
        }}
      />

      {/* The planet. Sized in vw and anchored by its top edge so the horizon
          always sits a fixed distance below the navbar, whatever the viewport
          height. A very wide circle keeps the curve shallow, the way a real
          horizon reads, instead of arcing down into the headline. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{
          width: "300vw",
          height: "300vw",
          top: "clamp(96px, 15vh, 150px)",
          background: "linear-gradient(to bottom, #0b1436 0%, #050814 14%, #04060f 30%)",
          boxShadow:
            "0 -1px 0 1px rgba(147,197,253,0.55), 0 -14px 50px rgba(56,189,248,0.40), 0 -50px 130px rgba(37,99,235,0.26)",
        }}
      />

      {/* narrow bright crest along the very top of the planet */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none mix-blend-screen"
        style={{
          width: "300vw",
          height: "300vw",
          top: "clamp(96px, 15vh, 150px)",
          background:
            "radial-gradient(38% 4% at 50% 0%, rgba(224,242,254,0.9) 0%, rgba(125,211,252,0.38) 45%, rgba(56,189,248,0) 100%)",
        }}
      />

      {/* vignette to keep focus on the headline */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(100% 70% at 50% 30%, rgba(4,6,15,0) 40%, rgba(4,6,15,0.55) 100%)",
        }}
      />
    </div>
  );
}

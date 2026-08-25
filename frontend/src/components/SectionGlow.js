import { StarField } from "./StarField";

/**
 * Section backdrop that echoes the hero: concentric arcs rippling out from the
 * top centre, a soft glow behind the heading, and a sparse starfield.
 *
 * Deliberately theme-agnostic — it tints whatever background sits behind it
 * rather than forcing its own, so it works in light and dark.
 */
export function SectionGlow({ rings = 5, stars = true, className = "" }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {/* glow pooled behind the section heading */}
      <div
        className="absolute inset-x-0 top-0 h-[420px]"
        style={{
          background:
            "radial-gradient(50% 100% at 50% 0%, rgba(56,189,248,0.12) 0%, rgba(37,99,235,0.06) 45%, rgba(0,0,0,0) 75%)",
        }}
      />

      {/* concentric arcs, centred just above the section so only the lower
          curve of each ring reads as a ripple behind the heading */}
      {Array.from({ length: rings }, (_, i) => {
        const size = 420 + i * 230;
        return (
          <div
            key={size}
            className="absolute left-1/2 top-0 rounded-full border"
            style={{
              width: size,
              height: size,
              transform: "translate(-50%, -58%)",
              borderColor: `rgba(125,211,252,${Math.max(0.03, 0.11 - i * 0.018).toFixed(3)})`,
            }}
          />
        );
      })}

      {stars && (
        <div className="absolute inset-x-0 top-0 h-[520px]">
          <StarField density={70} color="125, 211, 252" />
        </div>
      )}

      {/* fade the whole thing out before the cards so nothing cuts hard */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0) 45%, var(--section-glow-fade, transparent) 100%)",
        }}
      />
    </div>
  );
}

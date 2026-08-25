import { StarField } from "./StarField";

/**
 * A single contained ripple that sits behind a centred section heading.
 *
 * Deliberately bounded and masked: the arcs fade out well before the section
 * edges, so neighbouring sections never look like one continuous pattern.
 * Use it only on sections that actually have a centred heading — repeating it
 * down the page is what makes sections bleed into each other.
 */
export function SectionGlow({ stars = true, className = "" }) {
  // Fades the whole thing out towards the edges instead of letting the section
  // boundary slice through the arcs.
  const fade = "radial-gradient(58% 62% at 50% 22%, #000 0%, rgba(0,0,0,0.55) 55%, transparent 78%)";

  return (
    <div className={`absolute inset-x-0 top-0 h-[440px] overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-[880px] max-w-[130vw] h-[440px]"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {/* soft pool of light behind the heading */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(46% 62% at 50% 12%, rgba(56,189,248,0.10) 0%, rgba(37,99,235,0.05) 45%, rgba(0,0,0,0) 74%)",
          }}
        />

        {/* concentric arcs, kept small and faint */}
        {[300, 440, 580, 720].map((size, i) => (
          <div
            key={size}
            className="absolute left-1/2 top-0 rounded-full border"
            style={{
              width: size,
              height: size,
              transform: "translate(-50%, -46%)",
              borderColor: `rgba(125,211,252,${(0.07 - i * 0.013).toFixed(3)})`,
            }}
          />
        ))}

        {stars && <StarField density={45} color="148, 197, 245" />}
      </div>
    </div>
  );
}

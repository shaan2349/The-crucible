/**
 * The loading screen: a temple drawing itself in lamplight on a hill. The
 * same picture is in index.html, so the hand-off from the first paint to
 * the app is seamless. Its styles live in index.html too (.cl …).
 */
export function LampLoading({ line = 'The lamps are being lit…', fixed = true }: { line?: string; fixed?: boolean }) {
  return (
    <div className="cl" role="status" style={fixed ? undefined : { position: 'absolute' }}>
      <svg className="cl-art" viewBox="0 0 240 120" aria-hidden="true">
        <defs>
          <radialGradient id="clGlowR">
            <stop offset="0" stopColor="#FFC877" stopOpacity=".55" />
            <stop offset="1" stopColor="#FFC877" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="cl-glow" cx="120" cy="52" r="46" fill="url(#clGlowR)" />
        <path d="M0 112 C 50 96, 80 70, 120 66 C 160 70, 190 96, 240 112" fill="none" stroke="#C2A15E" strokeOpacity=".5" strokeWidth="1" />
        <g fill="none" stroke="#E9D5A6" strokeWidth="1.1" strokeLinejoin="round">
          <path className="cl-draw" d="M92 64 H148 M95 60 H145 M97 34 L120 22 L143 34 Z M96 38 H144 M101 40 V58 M110 40 V58 M130 40 V58 M139 40 V58" />
        </g>
        <path className="cl-flame" d="M120 56 C 117.5 53, 118.5 49.5, 120 46 C 121.5 49.5, 122.5 53, 120 56 Z" fill="#FFC877" />
      </svg>
      <p className="cl-name">THE CRUCIBLE</p>
      <p className="cl-line">{line}</p>
    </div>
  )
}

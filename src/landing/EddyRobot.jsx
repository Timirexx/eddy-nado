import { useEffect, useRef } from 'react';

/**
 * The Eddy robot, rigged so the cursor moves the whole character rather than
 * just its eyes.
 *
 * Layered depth is what sells it. Each group rotates by a different amount
 * around a different origin, so the parts appear to turn relative to one
 * another instead of sliding as one flat sheet:
 *
 *   podium  — barely moves; it is the anchor the viewer reads position against
 *   body    — the base turn, pivoting near the hips
 *   arms    — trail the torso slightly, so they swing rather than being welded on
 *   head    — turns further than the body, pivoting at the neck
 *   face    — shifts inside the visor, the last few degrees of "looking"
 *
 * Motion is driven by a rAF loop writing CSS variables directly, never React
 * state: a mousemove-driven re-render of an SVG this size drops frames badly.
 * Each layer eases toward the target at its own rate, which produces the slight
 * lag between body and head that makes the turn look physical.
 */

// How far each layer travels. Tuned so the sum reads as one character turning,
// not as parts sliding apart.
const RIG = {
  body: { rx: 5, ry: 13, tx: 10, ease: 0.055 },
  arms: { rx: 2, ry: 7, tx: 5, ease: 0.04 },
  head: { rx: 9, ry: 17, tx: 8, ease: 0.085 },
  face: { tx: 8, ty: 5, ease: 0.11 },
  glow: { tx: 16, ease: 0.05 },
};

export default function EddyRobot() {
  const rootRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({
    bodyX: 0, bodyY: 0, armsX: 0, armsY: 0,
    headX: 0, headY: 0, faceX: 0, faceY: 0, glowX: 0,
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;

    // Normalised to -1..1 from the viewport centre so the robot tracks the
    // cursor anywhere on the page, not only while it is over the artwork.
    const onMove = (e) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    // Touch devices have no hover, so drift back to centre rather than
    // freezing wherever the last tap landed.
    const onLeave = () => {
      target.current.x = 0;
      target.current.y = 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    let frame;
    const start = performance.now();

    const tick = (now) => {
      const t = (now - start) / 1000;
      const c = current.current;
      const { x, y } = target.current;

      // Idle life: a slow breath and a wander that never quite repeats, so the
      // robot keeps moving when the cursor is still. Kept small enough that
      // cursor tracking always dominates.
      const breath = Math.sin(t * 1.15);
      const wanderX = Math.sin(t * 0.37) * 0.13 + Math.sin(t * 0.83) * 0.05;
      const wanderY = Math.cos(t * 0.29) * 0.1;

      const tx = x + wanderX;
      const ty = y + wanderY;

      const lerp = (a, b, k) => a + (b - a) * k;

      c.bodyX = lerp(c.bodyX, tx, RIG.body.ease);
      c.bodyY = lerp(c.bodyY, ty, RIG.body.ease);
      c.armsX = lerp(c.armsX, tx, RIG.arms.ease);
      c.armsY = lerp(c.armsY, ty, RIG.arms.ease);
      c.headX = lerp(c.headX, tx, RIG.head.ease);
      c.headY = lerp(c.headY, ty, RIG.head.ease);
      c.faceX = lerp(c.faceX, tx, RIG.face.ease);
      c.faceY = lerp(c.faceY, ty, RIG.face.ease);
      c.glowX = lerp(c.glowX, tx, RIG.glow.ease);

      const s = root.style;
      s.setProperty('--body-ry', `${c.bodyX * RIG.body.ry}deg`);
      s.setProperty('--body-rx', `${-c.bodyY * RIG.body.rx}deg`);
      s.setProperty('--body-tx', `${c.bodyX * RIG.body.tx}px`);
      s.setProperty('--body-ty', `${c.bodyY * 6 + breath * 3}px`);

      s.setProperty('--arms-ry', `${c.armsX * RIG.arms.ry}deg`);
      s.setProperty('--arms-tx', `${c.armsX * RIG.arms.tx}px`);
      s.setProperty('--arms-ty', `${breath * 2}px`);

      s.setProperty('--head-ry', `${c.headX * RIG.head.ry}deg`);
      s.setProperty('--head-rx', `${-c.headY * RIG.head.rx}deg`);
      s.setProperty('--head-tx', `${c.headX * RIG.head.tx}px`);
      s.setProperty('--head-ty', `${c.headY * 5 + breath * 1.5}px`);

      s.setProperty('--face-tx', `${c.faceX * RIG.face.tx}px`);
      s.setProperty('--face-ty', `${c.faceY * RIG.face.ty}px`);

      s.setProperty('--glow-tx', `${c.glowX * RIG.glow.tx}px`);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="eddy-stage" ref={rootRef} aria-hidden="true">
      <div className="eddy-glow" />
      <svg className="eddy-svg" viewBox="0 0 420 520" fill="none">
        <defs>
          <linearGradient id="shell" x1="0.2" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#FFD679" />
            <stop offset="0.42" stopColor="#F5A81C" />
            <stop offset="1" stopColor="#B96D05" />
          </linearGradient>
          <linearGradient id="shellSoft" x1="0.1" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#FFCE63" />
            <stop offset="1" stopColor="#C87908" />
          </linearGradient>
          <linearGradient id="visor" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#1a1d24" />
            <stop offset="0.5" stopColor="#0a0c11" />
            <stop offset="1" stopColor="#15181f" />
          </linearGradient>
          <linearGradient id="joint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a3f4a" />
            <stop offset="1" stopColor="#171a21" />
          </linearGradient>
          <linearGradient id="podium" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b3038" />
            <stop offset="1" stopColor="#0d1015" />
          </linearGradient>
          <radialGradient id="sheen" cx="0.32" cy="0.22" r="0.55">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="soften" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* Podium — the fixed reference the character turns against. */}
        <g className="rig-podium">
          <ellipse cx="210" cy="474" rx="132" ry="26" fill="#F0A93E" opacity="0.18" filter="url(#soften)" />
          <ellipse cx="210" cy="468" rx="118" ry="24" fill="url(#podium)" />
          <ellipse cx="210" cy="461" rx="118" ry="23" fill="#20242c" />
          <ellipse cx="210" cy="461" rx="118" ry="23" stroke="#F0A93E" strokeOpacity="0.5" strokeWidth="1.6" />
          <ellipse cx="210" cy="456" rx="96" ry="17" fill="#0b0d12" />
        </g>

        {/* Contact shadow, kept with the body so it slides as the robot turns. */}
        <ellipse className="rig-body" cx="210" cy="452" rx="66" ry="12" fill="#000" opacity="0.55" filter="url(#soften)" />

        <g className="rig-arms">
          {/* Left arm */}
          <g>
            <rect x="78" y="243" width="30" height="30" rx="14" fill="url(#joint)" />
            <rect x="80" y="266" width="27" height="62" rx="13" fill="url(#shellSoft)" />
            <rect x="80" y="322" width="27" height="26" rx="12" fill="url(#joint)" />
            <path d="M82 344h23c3 10 1 19-4 24-6 5-14 4-18-2-3-6-3-15-1-22z" fill="url(#shellSoft)" />
          </g>
          {/* Right arm */}
          <g>
            <rect x="312" y="243" width="30" height="30" rx="14" fill="url(#joint)" />
            <rect x="313" y="266" width="27" height="62" rx="13" fill="url(#shellSoft)" />
            <rect x="313" y="322" width="27" height="26" rx="12" fill="url(#joint)" />
            <path d="M315 344h23c2 7 2 16-1 22-4 6-12 7-18 2-5-5-7-14-4-24z" fill="url(#shellSoft)" />
          </g>
        </g>

        <g className="rig-body">
          {/* Legs */}
          <rect x="163" y="372" width="34" height="52" rx="16" fill="url(#joint)" />
          <rect x="223" y="372" width="34" height="52" rx="16" fill="url(#joint)" />
          <path d="M158 418h44c5 0 8 4 8 9v10c0 6-4 10-9 10h-42c-6 0-10-4-10-10v-10c0-5 4-9 9-9z" fill="url(#shellSoft)" />
          <path d="M218 418h44c5 0 9 4 9 9v10c0 6-4 10-10 10h-42c-5 0-9-4-9-10v-10c0-5 3-9 8-9z" fill="url(#shellSoft)" />

          {/* Torso */}
          <path
            d="M210 176c46 0 76 26 76 66v78c0 32-30 54-76 54s-76-22-76-54v-78c0-40 30-66 76-66z"
            fill="url(#shell)"
          />
          <path
            d="M210 176c46 0 76 26 76 66v78c0 32-30 54-76 54s-76-22-76-54v-78c0-40 30-66 76-66z"
            fill="url(#sheen)"
          />
          {/* Chest badge */}
          <circle cx="210" cy="272" r="40" fill="#101319" />
          <circle cx="210" cy="272" r="40" stroke="#F0A93E" strokeOpacity="0.35" strokeWidth="1.5" />
          <circle cx="210" cy="272" r="31" fill="url(#shell)" />
          <path
            d="M197 288v-32l26 32v-32"
            stroke="#14171d"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Shoulder caps */}
          <ellipse cx="139" cy="228" rx="26" ry="24" fill="url(#shellSoft)" />
          <ellipse cx="281" cy="228" rx="26" ry="24" fill="url(#shellSoft)" />
        </g>

        <g className="rig-head">
          {/* Neck */}
          <rect x="192" y="158" width="36" height="30" rx="14" fill="url(#joint)" />

          {/* Ear pods */}
          <g className="rig-ear-left">
            <circle cx="118" cy="104" r="26" fill="url(#shellSoft)" />
            <circle cx="118" cy="104" r="13" fill="#14171d" />
          </g>
          <g className="rig-ear-right">
            <circle cx="302" cy="104" r="26" fill="url(#shellSoft)" />
            <circle cx="302" cy="104" r="13" fill="#14171d" />
          </g>

          {/* Helmet */}
          <path
            d="M210 24c52 0 88 32 88 78 0 42-36 70-88 70s-88-28-88-70c0-46 36-78 88-78z"
            fill="url(#shell)"
          />
          <path
            d="M210 24c52 0 88 32 88 78 0 42-36 70-88 70s-88-28-88-70c0-46 36-78 88-78z"
            fill="url(#sheen)"
          />

          {/* Visor — the face moves inside this, and is clipped by it. */}
          <path
            d="M210 46c40 0 66 24 66 56s-26 50-66 50-66-20-66-50 26-56 66-56z"
            fill="url(#visor)"
          />

          <g className="rig-face">
            {/* Left eye */}
            <ellipse className="eddy-eye" cx="184" cy="99" rx="13" ry="14" fill="#FFC24D" />
            {/* Right: the arc motif from the Eddy mark, so the face stays on-brand */}
            <circle cx="234" cy="99" r="6" fill="#FFC24D" />
            <path d="M245 89a15 15 0 0 1 0 20" stroke="#FFC24D" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M254 81a27 27 0 0 1 0 36" stroke="#FFC24D" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.8" />
            {/* Smile */}
            <path d="M186 124c9 9 39 9 48 0" stroke="#FFC24D" strokeWidth="5.5" strokeLinecap="round" fill="none" />
          </g>

          {/* Visor glass highlight, above the face so it reads as glass. */}
          <path d="M158 70c14-14 34-20 52-20-24 6-42 18-52 34z" fill="#fff" opacity="0.1" />
        </g>
      </svg>
    </div>
  );
}

import { useEffect, useRef } from 'react';

/**
 * Eddy — a rigged robot that tracks the cursor.
 *
 * Motion model
 * ------------
 * Each layer is a damped spring rather than a lerp. A lerp always decelerates
 * into its target, which reads as sluggish and can never catch a fast cursor;
 * a spring accelerates, carries momentum, and settles — so a quick sweep across
 * the page is actually followed, and the stop has a tiny natural overshoot.
 *
 * Stiffness is graded through the body, and that gradient is the whole trick:
 *
 *   face   — stiffest, snaps to the cursor first
 *   head   — close behind, so the look leads the turn
 *   body   — softer; the torso is heavy and follows
 *   arms   — softest, trailing like limbs being carried
 *
 * Because each layer lags the one above it, a fast movement briefly stretches
 * the pose — eyes already there, head arriving, shoulders still catching up —
 * which is what makes it read as a body reacting rather than a sprite rotating.
 *
 * Integrated at a fixed 60Hz timestep with an accumulator, so the feel is
 * identical on 60/120/144Hz displays and a backgrounded tab cannot explode the
 * spring when it resumes with a huge delta.
 *
 * Written to CSS variables from one rAF loop; routing cursor movement through
 * React state re-renders this whole SVG per mousemove and drops frames.
 */

const STEP = 1 / 60;
const MAX_FRAME = 0.1; // clamp the dt spike after a tab switch

// stiffness = how hard it pulls toward the cursor; damping = how fast the
// wobble dies. Tuned by sweeping the pair for the fastest response that still
// keeps overshoot under ~8%: past that the head rubber-bands and reads as
// cartoon bounce rather than a machine settling.
//
// Measured at 60Hz — time to 90% of the turn, and peak excursion:
//   face  83ms  8.6%
//   head  83ms  7.0%
//   body 117ms  5.0%
//   arms 150ms  4.3%
//
// The spread is the point: 80ms into a flick the head is 81% of the way round
// while the torso is only 64%, so the look leads and the body is dragged after
// it.
const LAYERS = {
  face: { stiffness: 0.22, damping: 0.60 },
  head: { stiffness: 0.20, damping: 0.60 },
  body: { stiffness: 0.13, damping: 0.64 },
  arms: { stiffness: 0.09, damping: 0.68 },
  glow: { stiffness: 0.07, damping: 0.72 },
};

// Travel limits, in degrees or px. Bounded so the rig never breaks the
// silhouette — a real neck has a range.
const RANGE = {
  headYaw: 22,
  headPitch: 13,
  headShiftX: 11,
  headShiftY: 7,
  bodyYaw: 11,
  bodyPitch: 5,
  bodyShiftX: 13,
  bodyShiftY: 6,
  armsYaw: 6,
  armsShiftX: 7,
  faceX: 11,
  faceY: 7,
  glowX: 22,
};

function makeSpring() {
  return { x: 0, y: 0, vx: 0, vy: 0 };
}

function integrate(spring, tx, ty, { stiffness, damping }) {
  spring.vx += (tx - spring.x) * stiffness;
  spring.vy += (ty - spring.y) * stiffness;
  spring.vx *= damping;
  spring.vy *= damping;
  spring.x += spring.vx;
  spring.y += spring.vy;
}

export default function EddyRobot() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;

    const target = { x: 0, y: 0 };
    const springs = {
      face: makeSpring(),
      head: makeSpring(),
      body: makeSpring(),
      arms: makeSpring(),
      glow: makeSpring(),
    };

    const onMove = (e) => {
      // Normalised against the viewport so Eddy tracks the cursor anywhere on
      // the page, not only while it is over the artwork.
      target.x = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1));
      target.y = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight) * 2 - 1));
    };
    const recentre = () => {
      target.x = 0;
      target.y = 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', recentre);
    window.addEventListener('blur', recentre);

    let frame;
    let last = performance.now();
    let accumulator = 0;
    let elapsed = 0;
    const style = root.style;

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, MAX_FRAME);
      last = now;
      accumulator += dt;
      elapsed += dt;

      // Idle life. Small enough that cursor tracking always dominates, and
      // built from mismatched frequencies so it never visibly loops.
      const breath = Math.sin(elapsed * 1.1);
      const driftX = Math.sin(elapsed * 0.31) * 0.1 + Math.sin(elapsed * 0.73) * 0.04;
      const driftY = Math.cos(elapsed * 0.24) * 0.08;

      const tx = Math.max(-1, Math.min(1, target.x + driftX));
      const ty = Math.max(-1, Math.min(1, target.y + driftY));

      while (accumulator >= STEP) {
        integrate(springs.face, tx, ty, LAYERS.face);
        integrate(springs.head, tx, ty, LAYERS.head);
        integrate(springs.body, tx, ty, LAYERS.body);
        integrate(springs.arms, tx, ty, LAYERS.arms);
        integrate(springs.glow, tx, ty, LAYERS.glow);
        accumulator -= STEP;
      }

      const { face, head, body, arms, glow } = springs;

      style.setProperty('--head-ry', `${head.x * RANGE.headYaw}deg`);
      style.setProperty('--head-rx', `${-head.y * RANGE.headPitch}deg`);
      // A head that turns also swings a little; pure rotation reads as a
      // billboard pivoting on the spot.
      style.setProperty('--head-tx', `${head.x * RANGE.headShiftX}px`);
      style.setProperty('--head-ty', `${head.y * RANGE.headShiftY + breath * 1.6}px`);
      // Counter-roll: heads tilt slightly into a turn.
      style.setProperty('--head-rz', `${head.x * -3.2}deg`);

      style.setProperty('--body-ry', `${body.x * RANGE.bodyYaw}deg`);
      style.setProperty('--body-rx', `${-body.y * RANGE.bodyPitch}deg`);
      style.setProperty('--body-tx', `${body.x * RANGE.bodyShiftX}px`);
      style.setProperty('--body-ty', `${body.y * RANGE.bodyShiftY + breath * 2.6}px`);
      style.setProperty('--body-rz', `${body.x * -1.6}deg`);

      style.setProperty('--arms-ry', `${arms.x * RANGE.armsYaw}deg`);
      style.setProperty('--arms-tx', `${arms.x * RANGE.armsShiftX}px`);
      style.setProperty('--arms-ty', `${breath * 1.8}px`);

      style.setProperty('--face-tx', `${face.x * RANGE.faceX}px`);
      style.setProperty('--face-ty', `${face.y * RANGE.faceY}px`);

      style.setProperty('--glow-tx', `${glow.x * RANGE.glowX}px`);
      style.setProperty('--shadow-tx', `${body.x * 9}px`);
      style.setProperty('--shadow-sx', `${1 - Math.abs(body.x) * 0.05}`);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', recentre);
      window.removeEventListener('blur', recentre);
    };
  }, []);

  return (
    <div className="eddy-stage" ref={rootRef} aria-hidden="true">
      <div className="eddy-glow" />
      <svg className="eddy-svg" viewBox="0 0 440 580" fill="none">
        <defs>
          {/* Shell: lit from upper-left, warm bounce from the podium below. */}
          <linearGradient id="shellA" x1="0.18" y1="0.02" x2="0.82" y2="1">
            <stop offset="0" stopColor="#FFE9A8" />
            <stop offset="0.18" stopColor="#FFC547" />
            <stop offset="0.55" stopColor="#F0A01A" />
            <stop offset="0.85" stopColor="#C4740A" />
            <stop offset="1" stopColor="#8F5205" />
          </linearGradient>
          <linearGradient id="shellB" x1="0.25" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#FFD97A" />
            <stop offset="0.45" stopColor="#F5AC24" />
            <stop offset="1" stopColor="#A96206" />
          </linearGradient>
          <radialGradient id="shellSphere" cx="0.33" cy="0.24" r="0.82">
            <stop offset="0" stopColor="#FFEDB8" />
            <stop offset="0.3" stopColor="#FFC846" />
            <stop offset="0.72" stopColor="#E8940F" />
            <stop offset="1" stopColor="#8A4E04" />
          </radialGradient>

          {/* Dark articulated parts */}
          <linearGradient id="jointA" x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#4A5058" />
            <stop offset="0.4" stopColor="#23272E" />
            <stop offset="1" stopColor="#0E1116" />
          </linearGradient>
          <radialGradient id="jointSphere" cx="0.34" cy="0.28" r="0.8">
            <stop offset="0" stopColor="#5A616B" />
            <stop offset="0.5" stopColor="#252A31" />
            <stop offset="1" stopColor="#0B0E12" />
          </radialGradient>

          {/* Visor glass */}
          <linearGradient id="visorGlass" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#2A2F38" />
            <stop offset="0.35" stopColor="#0D1015" />
            <stop offset="0.75" stopColor="#05070A" />
            <stop offset="1" stopColor="#14181F" />
          </linearGradient>

          <linearGradient id="podiumTop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#31363F" />
            <stop offset="0.5" stopColor="#181C22" />
            <stop offset="1" stopColor="#0A0D11" />
          </linearGradient>
          <linearGradient id="podiumSide" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#20242B" />
            <stop offset="1" stopColor="#070910" />
          </linearGradient>

          {/* Specular sweep reused on rounded shells */}
          <linearGradient id="specular" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          {/* Warm rim from the podium glow, applied under the chassis */}
          <linearGradient id="rimWarm" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#FFAE38" stopOpacity="0.9" />
            <stop offset="1" stopColor="#FFAE38" stopOpacity="0" />
          </linearGradient>

          <filter id="blurSm" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="blurMd" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
          <filter id="blurLg" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="18" />
          </filter>

          {/* Keeps the face inside the visor when it shifts to an extreme. */}
          <clipPath id="visorClip">
            <path d="M220 58c44 0 72 26 72 60s-28 55-72 55-72-22-72-55 28-60 72-60z" />
          </clipPath>
        </defs>

        {/* ---------- Podium ---------- */}
        <g className="rig-podium">
          <ellipse cx="220" cy="516" rx="150" ry="30" fill="#F0A93E" opacity="0.22" filter="url(#blurLg)" />
          <path d="M112 500h216v14c0 12-48 22-108 22s-108-10-108-22z" fill="url(#podiumSide)" />
          <ellipse cx="220" cy="500" rx="108" ry="23" fill="url(#podiumTop)" />
          <ellipse cx="220" cy="500" rx="108" ry="23" stroke="#FFB33F" strokeOpacity="0.75" strokeWidth="1.8" />
          <ellipse cx="220" cy="498" rx="88" ry="17" fill="#080A0E" opacity="0.85" />
          {/* Reflected bloom on the polished top */}
          <ellipse
            className="rig-shadow"
            cx="220" cy="496" rx="52" ry="11"
            fill="#FFB33F" opacity="0.3" filter="url(#blurMd)"
          />
        </g>

        {/* Contact shadow — tracks the body so the robot stays planted. */}
        <ellipse className="rig-shadow" cx="220" cy="492" rx="62" ry="11" fill="#000" opacity="0.6" filter="url(#blurMd)" />

        {/* ---------- Legs ---------- */}
        <g className="rig-body">
          {/* left leg */}
          <circle cx="192" cy="392" r="19" fill="url(#jointSphere)" />
          <path d="M177 396h30v34c0 7-6 12-15 12s-15-5-15-12z" fill="url(#shellA)" />
          <circle cx="192" cy="440" r="15" fill="url(#jointSphere)" />
          <path d="M180 446h24v22c0 5-5 9-12 9s-12-4-12-9z" fill="url(#shellB)" />
          <path d="M170 468h44c6 0 10 5 10 11v6c0 6-4 10-10 10h-44c-6 0-10-4-10-10v-6c0-6 4-11 10-11z" fill="url(#shellA)" />
          <ellipse cx="192" cy="489" rx="24" ry="6" fill="#0C0F14" opacity="0.9" />

          {/* right leg */}
          <circle cx="248" cy="392" r="19" fill="url(#jointSphere)" />
          <path d="M233 396h30v34c0 7-6 12-15 12s-15-5-15-12z" fill="url(#shellA)" />
          <circle cx="248" cy="440" r="15" fill="url(#jointSphere)" />
          <path d="M236 446h24v22c0 5-5 9-12 9s-12-4-12-9z" fill="url(#shellB)" />
          <path d="M226 468h44c6 0 10 5 10 11v6c0 6-4 10-10 10h-44c-6 0-10-4-10-10v-6c0-6 4-11 10-11z" fill="url(#shellA)" />
          <ellipse cx="248" cy="489" rx="24" ry="6" fill="#0C0F14" opacity="0.9" />

          {/* Neck. Belongs to the body, not the head: if it rode the head group
              it would swing away with it and tear a gap open above the torso.
              Run tall so the helmet still covers its top at full head travel. */}
          <path d="M200 176h40v66c0 8-9 13-20 13s-20-5-20-13z" fill="url(#jointA)" />
          <path d="M204 182h32v10c0 3-7 5-16 5s-16-2-16-5z" fill="#0A0D12" opacity="0.7" />

          {/* ---------- Pelvis + torso ---------- */}
          <path d="M186 350h68v26c0 10-15 17-34 17s-34-7-34-17z" fill="url(#jointA)" />

          <path
            d="M220 232c40 0 62 20 66 52l5 46c3 26-28 42-71 42s-74-16-71-42l5-46c4-32 26-52 66-52z"
            fill="url(#shellA)"
          />
          {/* torso specular */}
          <path
            d="M186 258c8-16 24-24 40-25-20 6-33 20-38 40z"
            fill="url(#specular)" opacity="0.5"
          />
          {/* warm bounce along the underside */}
          <path
            d="M152 330c0 26 30 42 68 42s71-16 68-42l-3 26c2 24-28 40-65 40s-67-16-65-40z"
            fill="url(#rimWarm)" opacity="0.55"
          />

          {/* Chest badge */}
          <circle cx="220" cy="300" r="37" fill="#0A0D12" />
          <circle cx="220" cy="300" r="37" stroke="#2A3038" strokeWidth="1.4" />
          <circle cx="220" cy="300" r="29" fill="url(#shellB)" />
          <circle cx="220" cy="300" r="29" stroke="#8A5205" strokeOpacity="0.5" strokeWidth="1" />
          <circle cx="220" cy="300" r="22" fill="none" stroke="#14171D" strokeWidth="3.4" />
          <path
            d="M210 312v-25l20 25v-25"
            stroke="#14171D" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
        </g>

        {/* ---------- Arms ---------- */}
        <g className="rig-arms">
          {/* left arm */}
          <circle cx="164" cy="266" r="23" fill="url(#shellSphere)" />
          <circle cx="158" cy="259" r="7" fill="#fff" opacity="0.35" filter="url(#blurSm)" />
          <circle cx="160" cy="298" r="13" fill="url(#jointSphere)" />
          <path d="M148 300h24v34c0 6-5 10-12 10s-12-4-12-10z" fill="url(#shellA)" />
          <circle cx="160" cy="348" r="13" fill="url(#jointSphere)" />
          <path d="M149 352h22v26c0 6-5 10-11 10s-11-4-11-10z" fill="url(#shellB)" />
          {/* hand */}
          <path d="M147 380h26c3 12 1 22-6 27-8 5-17 2-20-6-2-7-2-15 0-21z" fill="url(#jointA)" />
          <path d="M150 404c-3 6-2 12 2 15M158 408c-2 6-1 11 3 14M166 408c-1 6 0 11 4 13" stroke="#1B1F26" strokeWidth="4" strokeLinecap="round" />

          {/* right arm */}
          <circle cx="276" cy="266" r="23" fill="url(#shellSphere)" />
          <circle cx="270" cy="259" r="7" fill="#fff" opacity="0.35" filter="url(#blurSm)" />
          <circle cx="280" cy="298" r="13" fill="url(#jointSphere)" />
          <path d="M268 300h24v34c0 6-5 10-12 10s-12-4-12-10z" fill="url(#shellA)" />
          <circle cx="280" cy="348" r="13" fill="url(#jointSphere)" />
          <path d="M269 352h22v26c0 6-5 10-11 10s-11-4-11-10z" fill="url(#shellB)" />
          <path d="M267 380h26c2 6 2 14 0 21-3 8-12 11-20 6-7-5-9-15-6-27z" fill="url(#jointA)" />
          <path d="M272 404c-3 6-2 12 2 15M280 408c-2 6-1 11 3 14M288 408c-1 6 0 11 4 13" stroke="#1B1F26" strokeWidth="4" strokeLinecap="round" />
        </g>

        {/* ---------- Head ---------- */}
        <g className="rig-head">
          {/* Seats the head down onto the shoulders. The reference silhouette
              is chibi — barely any neck showing — and the pivot in the CSS is
              offset to match this translate. */}
          <g transform="translate(0,26)">
          {/* ear pods */}
          <g>
            <ellipse cx="130" cy="132" rx="27" ry="31" fill="url(#shellSphere)" />
            <ellipse cx="130" cy="132" rx="14" ry="17" fill="#0B0E13" />
            <ellipse cx="130" cy="132" rx="8" ry="10" fill="#191D24" />
          </g>
          <g>
            <ellipse cx="310" cy="132" rx="27" ry="31" fill="url(#shellSphere)" />
            <ellipse cx="310" cy="132" rx="14" ry="17" fill="#0B0E13" />
            <ellipse cx="310" cy="132" rx="8" ry="10" fill="#191D24" />
          </g>

          {/* helmet */}
          <path
            d="M220 30c56 0 94 36 94 84 0 46-38 74-94 74s-94-28-94-74c0-48 38-84 94-84z"
            fill="url(#shellSphere)"
          />
          {/* broad top-left specular, the main read of "glossy" */}
          <ellipse cx="176" cy="72" rx="40" ry="26" fill="#fff" opacity="0.4" filter="url(#blurMd)" transform="rotate(-24 176 72)" />
          <ellipse cx="164" cy="64" rx="15" ry="9" fill="#fff" opacity="0.55" filter="url(#blurSm)" transform="rotate(-24 164 64)" />
          {/* warm rim along the lower helmet */}
          <path d="M130 130c8 34 44 56 90 56s82-22 90-56c-4 44-42 70-90 70s-86-26-90-70z" fill="url(#rimWarm)" opacity="0.5" />

          {/* visor */}
          <path
            d="M220 58c44 0 72 26 72 60s-28 55-72 55-72-22-72-55 28-60 72-60z"
            fill="url(#visorGlass)"
          />
          <path
            d="M220 58c44 0 72 26 72 60s-28 55-72 55-72-22-72-55 28-60 72-60z"
            stroke="#000" strokeOpacity="0.55" strokeWidth="2"
          />

          {/* face — clipped so it never slides past the visor edge */}
          <g clipPath="url(#visorClip)">
            <g className="rig-face">
              <ellipse className="eddy-eye" cx="190" cy="112" rx="14" ry="15" fill="#FFC24D" />
              <circle cx="246" cy="110" r="7" fill="#FFC24D" />
              <path d="M258 98a17 17 0 0 1 0 24" stroke="#FFC24D" strokeWidth="5.5" strokeLinecap="round" fill="none" />
              <path d="M268 88a31 31 0 0 1 0 44" stroke="#FFC24D" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.85" />
              <path d="M196 140c10 11 42 11 52 0" stroke="#FFC24D" strokeWidth="6" strokeLinecap="round" fill="none" />
            </g>
          </g>

          {/* glass reflections sit above the face so it reads as behind glass */}
          <path d="M164 82c14-16 36-24 58-24-28 6-48 20-58 38z" fill="#fff" opacity="0.13" />
          <ellipse cx="268" cy="150" rx="26" ry="9" fill="#fff" opacity="0.05" transform="rotate(-16 268 150)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

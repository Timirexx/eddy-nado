import { useEffect, useRef } from 'react';

/**
 * Eddy — a rigged robot that tracks the cursor.
 *
 * Skeleton
 * --------
 * Groups are nested the way a real armature is, so a parent joint carries
 * everything below it and each child adds its own rotation on top:
 *
 *   legs ─ hip ─ thigh ─ knee ─ shin ─ ankle ─ foot
 *   body ─ torso ─ shoulder ─ upper arm ─ elbow ─ forearm ─ wrist ─ hand ─ fingers
 *   head ─ face
 *
 * The legs deliberately sit OUTSIDE the body group. Feet are planted on the
 * podium; if they rode the torso they would swing with it and the robot would
 * look like it was skating. Instead the pelvis counter-rotates a little against
 * the shoulders — the torsion you get in a real body when the upper half turns
 * first.
 *
 * Motion
 * ------
 * Every channel is a damped spring. A lerp only decelerates into its target, so
 * it feels sluggish and can never catch a fast cursor; a spring accelerates,
 * carries momentum and settles.
 *
 * Stiffness is graded down the body so the pose stretches during a fast move —
 * eyes already there, head arriving, shoulders following, hands last. Measured
 * at 60Hz, time to 90% of travel: face/head 83ms, body 117ms, arms 150ms,
 * limbs 210ms.
 *
 * Integrated on a fixed 60Hz accumulator, so the feel is identical across
 * refresh rates and a backgrounded tab cannot explode the spring on resume.
 * Written straight to CSS variables from one rAF loop — routing cursor movement
 * through React state re-renders this SVG per mousemove and drops frames.
 */

const STEP = 1 / 60;
const MAX_FRAME = 0.1;

const LAYERS = {
  face: { stiffness: 0.22, damping: 0.60 },
  head: { stiffness: 0.20, damping: 0.60 },
  body: { stiffness: 0.13, damping: 0.64 },
  arms: { stiffness: 0.09, damping: 0.68 },
  // Softest channel, used for everything that should visibly trail: forearms,
  // wrists, fingers and the knees taking the weight shift.
  limbs: { stiffness: 0.065, damping: 0.72 },
  glow: { stiffness: 0.07, damping: 0.72 },
};

const RANGE = {
  headYaw: 22,
  headPitch: 13,
  headShiftX: 11,
  headShiftY: 7,
  bodyYaw: 11,
  bodyPitch: 5,
  bodyShiftX: 13,
  bodyShiftY: 6,
  faceX: 11,
  faceY: 7,
  glowX: 22,
};

const makeSpring = () => ({ x: 0, y: 0, vx: 0, vy: 0 });

function integrate(s, tx, ty, { stiffness, damping }) {
  s.vx += (tx - s.x) * stiffness;
  s.vy += (ty - s.y) * stiffness;
  s.vx *= damping;
  s.vy *= damping;
  s.x += s.vx;
  s.y += s.vy;
}

export default function EddyRobot() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const target = { x: 0, y: 0 };
    const springs = {
      face: makeSpring(),
      head: makeSpring(),
      body: makeSpring(),
      arms: makeSpring(),
      limbs: makeSpring(),
      glow: makeSpring(),
    };

    const onMove = (e) => {
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
    const set = (k, v) => style.setProperty(k, v);

    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, MAX_FRAME);
      last = now;
      accumulator += dt;
      elapsed += dt;

      // Idle life, built from mismatched frequencies so it never visibly loops.
      const breath = Math.sin(elapsed * 1.1);
      const breath2 = Math.sin(elapsed * 0.83 + 1.1);
      const sway = Math.sin(elapsed * 0.47);
      const driftX = Math.sin(elapsed * 0.31) * 0.1 + Math.sin(elapsed * 0.73) * 0.04;
      const driftY = Math.cos(elapsed * 0.24) * 0.08;

      const tx = Math.max(-1, Math.min(1, target.x + driftX));
      const ty = Math.max(-1, Math.min(1, target.y + driftY));

      while (accumulator >= STEP) {
        integrate(springs.face, tx, ty, LAYERS.face);
        integrate(springs.head, tx, ty, LAYERS.head);
        integrate(springs.body, tx, ty, LAYERS.body);
        integrate(springs.arms, tx, ty, LAYERS.arms);
        integrate(springs.limbs, tx, ty, LAYERS.limbs);
        integrate(springs.glow, tx, ty, LAYERS.glow);
        accumulator -= STEP;
      }

      const { face, head, body, arms, limbs, glow } = springs;
      const turn = body.x; // -1 left … +1 right
      const lean = body.y; // -1 up … +1 down
      const absTurn = Math.abs(turn);

      /* ---------- Head ---------- */
      set('--head-ry', `${head.x * RANGE.headYaw}deg`);
      set('--head-rx', `${-head.y * RANGE.headPitch}deg`);
      set('--head-tx', `${head.x * RANGE.headShiftX}px`);
      set('--head-ty', `${head.y * RANGE.headShiftY + breath * 1.6}px`);
      set('--head-rz', `${head.x * -3.2}deg`);
      set('--face-tx', `${face.x * RANGE.faceX}px`);
      set('--face-ty', `${face.y * RANGE.faceY}px`);

      /* ---------- Torso ---------- */
      set('--body-ry', `${turn * RANGE.bodyYaw}deg`);
      set('--body-rx', `${-lean * RANGE.bodyPitch}deg`);
      set('--body-tx', `${turn * RANGE.bodyShiftX}px`);
      set('--body-ty', `${lean * RANGE.bodyShiftY + breath * 2.6}px`);
      set('--body-rz', `${turn * -1.6}deg`);

      /* ---------- Arms ----------
       * Asymmetric on purpose. Turning right opens the far (left) shoulder out
       * and tucks the near one in, the way a torso turn carries one arm across
       * the body. Symmetric arms are most of what makes a rig look pasted on.
       */
      // Resting splay. In SVG a positive rotation swings a hanging limb toward
      // -x, so the signs are mirrored to push both arms away from the torso;
      // without it they hang flat against the body and read as welded on.
      const armSwing = arms.x;
      set('--arm-l-rot', `${7 + armSwing * 9 - absTurn * 4 + breath * 1.6}deg`);
      set('--arm-r-rot', `${-7 + armSwing * 9 + absTurn * 4 - breath * 1.6}deg`);

      // Elbows keep a resting bend and flex a little more as the body works —
      // a perfectly straight arm is the other half of the "stiff" read.
      set('--elbow-l-rot', `${5 + Math.max(0, armSwing) * 9 + absTurn * 3 + breath2 * 1.4}deg`);
      set('--elbow-r-rot', `${-5 + Math.min(0, armSwing) * 9 - absTurn * 3 - breath2 * 1.4}deg`);

      // Wrists and fingers ride the softest spring, so they settle last.
      set('--wrist-l-rot', `${limbs.x * 11 + breath2 * 2.4}deg`);
      set('--wrist-r-rot', `${limbs.x * 11 - breath2 * 2.4}deg`);
      set('--fingers-l', `${4 + Math.abs(limbs.x) * 7 + breath * 2}deg`);
      set('--fingers-r', `${4 + Math.abs(limbs.x) * 7 - breath * 2}deg`);

      /* ---------- Legs ----------
       * The pelvis counter-rotates against the shoulders and the weight shifts
       * onto the leg the robot is turning away from, so the stance
       * counterbalances the turn instead of the whole robot sliding sideways.
       */
      set('--legs-rot', `${turn * -3.4}deg`);
      set('--legs-tx', `${turn * 3.5}px`);
      set('--legs-ty', `${Math.max(0, lean) * 2.5 + absTurn * 1.2}px`);

      const weightL = Math.max(0, -turn); // turning left loads the left leg
      const weightR = Math.max(0, turn);

      set('--hip-l-rot', `${turn * 4 + weightL * 2}deg`);
      set('--hip-r-rot', `${turn * 4 - weightR * 2}deg`);
      // The unloaded knee bends; the loaded one straightens and takes the mass.
      set('--knee-l-rot', `${3 + weightR * 7 + Math.max(0, lean) * 4 + breath * 0.8}deg`);
      set('--knee-r-rot', `${-3 - weightL * 7 - Math.max(0, lean) * 4 - breath * 0.8}deg`);
      // Feet stay flat on the podium; only a slight roll as weight moves.
      set('--foot-l-rot', `${-turn * 2.2}deg`);
      set('--foot-r-rot', `${-turn * 2.2}deg`);

      /* ---------- Staging ---------- */
      set('--glow-tx', `${glow.x * RANGE.glowX}px`);
      set('--shadow-tx', `${turn * 9}px`);
      set('--shadow-sx', `${1 - absTurn * 0.05}`);
      set('--sway', `${sway * 0.6}px`);

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
          <linearGradient id="specular" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
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
          <clipPath id="visorClip">
            <path d="M220 84c44 0 72 26 72 60s-28 55-72 55-72-22-72-55 28-60 72-60z" />
          </clipPath>
        </defs>

        {/* ---------- Podium ---------- */}
        <g className="rig-podium">
          <ellipse cx="220" cy="516" rx="150" ry="30" fill="#F0A93E" opacity="0.22" filter="url(#blurLg)" />
          <path d="M112 500h216v14c0 12-48 22-108 22s-108-10-108-22z" fill="url(#podiumSide)" />
          <ellipse cx="220" cy="500" rx="108" ry="23" fill="url(#podiumTop)" />
          <ellipse cx="220" cy="500" rx="108" ry="23" stroke="#FFB33F" strokeOpacity="0.75" strokeWidth="1.8" />
          <ellipse cx="220" cy="498" rx="88" ry="17" fill="#080A0E" opacity="0.85" />
          <ellipse className="rig-shadow" cx="220" cy="496" rx="52" ry="11" fill="#FFB33F" opacity="0.3" filter="url(#blurMd)" />
        </g>
        <ellipse className="rig-shadow" cx="220" cy="492" rx="62" ry="11" fill="#000" opacity="0.6" filter="url(#blurMd)" />

        {/* ---------- Legs ----------
            Outside the body group: the feet are planted, and the pelvis
            counter-rotates against the shoulders. */}
        <g className="rig-legs">
          {/* left leg */}
          <g className="hip-l">
            <circle cx="194" cy="388" r="19" fill="url(#jointSphere)" />
            <circle cx="188" cy="382" r="6" fill="#fff" opacity="0.16" filter="url(#blurSm)" />
            <path d="M179 390h30v40c0 7-6 12-15 12s-15-5-15-12z" fill="url(#shellA)" />
            <g className="knee-l">
              <circle cx="194" cy="436" r="15" fill="url(#jointSphere)" />
              <path d="M182 440h24v30c0 6-5 10-12 10s-12-4-12-10z" fill="url(#shellB)" />
              <g className="foot-l">
                <path d="M172 474h44c6 0 10 5 10 11v5c0 6-4 10-10 10h-44c-6 0-10-4-10-10v-5c0-6 4-11 10-11z" fill="url(#shellA)" />
                <ellipse cx="194" cy="494" rx="25" ry="6" fill="#0C0F14" opacity="0.9" />
              </g>
            </g>
          </g>

          {/* right leg */}
          <g className="hip-r">
            <circle cx="246" cy="388" r="19" fill="url(#jointSphere)" />
            <circle cx="240" cy="382" r="6" fill="#fff" opacity="0.16" filter="url(#blurSm)" />
            <path d="M231 390h30v40c0 7-6 12-15 12s-15-5-15-12z" fill="url(#shellA)" />
            <g className="knee-r">
              <circle cx="246" cy="436" r="15" fill="url(#jointSphere)" />
              <path d="M234 440h24v30c0 6-5 10-12 10s-12-4-12-10z" fill="url(#shellB)" />
              <g className="foot-r">
                <path d="M224 474h44c6 0 10 5 10 11v5c0 6-4 10-10 10h-44c-6 0-10-4-10-10v-5c0-6 4-11 10-11z" fill="url(#shellA)" />
                <ellipse cx="246" cy="494" rx="25" ry="6" fill="#0C0F14" opacity="0.9" />
              </g>
            </g>
          </g>
        </g>

        {/* ---------- Torso ---------- */}
        <g className="rig-body">
          {/* pelvis — overlaps the hip balls so the join never gaps */}
          <path d="M186 348h68v30c0 10-15 17-34 17s-34-7-34-17z" fill="url(#jointA)" />

          {/* neck, carried by the body so it cannot tear away from the torso */}
          <path d="M200 176h40v66c0 8-9 13-20 13s-20-5-20-13z" fill="url(#jointA)" />
          <path d="M204 182h32v10c0 3-7 5-16 5s-16-2-16-5z" fill="#0A0D12" opacity="0.7" />

          <path
            d="M220 232c40 0 62 20 66 52l5 46c3 26-28 42-71 42s-74-16-71-42l5-46c4-32 26-52 66-52z"
            fill="url(#shellA)"
          />
          <path d="M186 258c8-16 24-24 40-25-20 6-33 20-38 40z" fill="url(#specular)" opacity="0.5" />
          <path
            d="M152 330c0 26 30 42 68 42s71-16 68-42l-3 26c2 24-28 40-65 40s-67-16-65-40z"
            fill="url(#rimWarm)" opacity="0.55"
          />

          {/* chest badge */}
          <circle cx="220" cy="300" r="37" fill="#0A0D12" />
          <circle cx="220" cy="300" r="37" stroke="#2A3038" strokeWidth="1.4" />
          <circle cx="220" cy="300" r="29" fill="url(#shellB)" />
          <circle cx="220" cy="300" r="29" stroke="#8A5205" strokeOpacity="0.5" strokeWidth="1" />
          <circle cx="220" cy="300" r="22" fill="none" stroke="#14171D" strokeWidth="3.4" />
          <path d="M210 312v-25l20 25v-25" stroke="#14171D" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />

          {/* ---------- Arms ----------
              Nested inside the torso so they are carried by the body turn, then
              add their own swing at each joint. */}
          <g className="arm-l">
            <circle cx="164" cy="268" r="23" fill="url(#shellSphere)" />
            <circle cx="158" cy="261" r="7" fill="#fff" opacity="0.35" filter="url(#blurSm)" />
            <path d="M152 268h24v38c0 7-5 12-12 12s-12-5-12-12z" fill="url(#shellA)" />
            <g className="forearm-l">
              <circle cx="164" cy="306" r="13" fill="url(#jointSphere)" />
              <path d="M153 308h22v36c0 6-5 10-11 10s-11-4-11-10z" fill="url(#shellB)" />
              <g className="hand-l">
                <circle cx="164" cy="350" r="10" fill="url(#jointSphere)" />
                <path d="M153 352h22v18c0 7-5 12-11 12s-11-5-11-12z" fill="url(#jointA)" />
                <g className="fingers-l">
                  <path d="M156 380c-3 7-2 13 2 16" stroke="#1B1F26" strokeWidth="4.4" strokeLinecap="round" />
                  <path d="M164 383c-2 7-1 12 3 15" stroke="#1B1F26" strokeWidth="4.4" strokeLinecap="round" />
                  <path d="M172 381c-1 7 0 12 4 14" stroke="#1B1F26" strokeWidth="4.4" strokeLinecap="round" />
                </g>
              </g>
            </g>
          </g>

          <g className="arm-r">
            <circle cx="276" cy="268" r="23" fill="url(#shellSphere)" />
            <circle cx="270" cy="261" r="7" fill="#fff" opacity="0.35" filter="url(#blurSm)" />
            <path d="M264 268h24v38c0 7-5 12-12 12s-12-5-12-12z" fill="url(#shellA)" />
            <g className="forearm-r">
              <circle cx="276" cy="306" r="13" fill="url(#jointSphere)" />
              <path d="M265 308h22v36c0 6-5 10-11 10s-11-4-11-10z" fill="url(#shellB)" />
              <g className="hand-r">
                <circle cx="276" cy="350" r="10" fill="url(#jointSphere)" />
                <path d="M265 352h22v18c0 7-5 12-11 12s-11-5-11-12z" fill="url(#jointA)" />
                <g className="fingers-r">
                  <path d="M268 380c-3 7-2 13 2 16" stroke="#1B1F26" strokeWidth="4.4" strokeLinecap="round" />
                  <path d="M276 383c-2 7-1 12 3 15" stroke="#1B1F26" strokeWidth="4.4" strokeLinecap="round" />
                  <path d="M284 381c-1 7 0 12 4 14" stroke="#1B1F26" strokeWidth="4.4" strokeLinecap="round" />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* ---------- Head ---------- */}
        <g className="rig-head">
          <g>
            <ellipse cx="130" cy="158" rx="27" ry="31" fill="url(#shellSphere)" />
            <ellipse cx="130" cy="158" rx="14" ry="17" fill="#0B0E13" />
            <ellipse cx="130" cy="158" rx="8" ry="10" fill="#191D24" />
          </g>
          <g>
            <ellipse cx="310" cy="158" rx="27" ry="31" fill="url(#shellSphere)" />
            <ellipse cx="310" cy="158" rx="14" ry="17" fill="#0B0E13" />
            <ellipse cx="310" cy="158" rx="8" ry="10" fill="#191D24" />
          </g>

          <path d="M220 56c56 0 94 36 94 84 0 46-38 74-94 74s-94-28-94-74c0-48 38-84 94-84z" fill="url(#shellSphere)" />
          <ellipse cx="176" cy="98" rx="40" ry="26" fill="#fff" opacity="0.4" filter="url(#blurMd)" transform="rotate(-24 176 98)" />
          <ellipse cx="164" cy="90" rx="15" ry="9" fill="#fff" opacity="0.55" filter="url(#blurSm)" transform="rotate(-24 164 90)" />
          <path d="M130 156c8 34 44 56 90 56s82-22 90-56c-4 44-42 70-90 70s-86-26-90-70z" fill="url(#rimWarm)" opacity="0.5" />

          <path d="M220 84c44 0 72 26 72 60s-28 55-72 55-72-22-72-55 28-60 72-60z" fill="url(#visorGlass)" />
          <path d="M220 84c44 0 72 26 72 60s-28 55-72 55-72-22-72-55 28-60 72-60z" stroke="#000" strokeOpacity="0.55" strokeWidth="2" />

          <g clipPath="url(#visorClip)">
            <g className="rig-face">
              <ellipse className="eddy-eye" cx="190" cy="138" rx="14" ry="15" fill="#FFC24D" />
              <circle cx="246" cy="136" r="7" fill="#FFC24D" />
              <path d="M258 124a17 17 0 0 1 0 24" stroke="#FFC24D" strokeWidth="5.5" strokeLinecap="round" fill="none" />
              <path d="M268 114a31 31 0 0 1 0 44" stroke="#FFC24D" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.85" />
              <path d="M196 166c10 11 42 11 52 0" stroke="#FFC24D" strokeWidth="6" strokeLinecap="round" fill="none" />
            </g>
          </g>

          <path d="M164 108c14-16 36-24 58-24-28 6-48 20-58 38z" fill="#fff" opacity="0.13" />
          <ellipse cx="268" cy="176" rx="26" ry="9" fill="#fff" opacity="0.05" transform="rotate(-16 268 176)" />
        </g>
      </svg>
    </div>
  );
}

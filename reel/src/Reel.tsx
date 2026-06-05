import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY      = '#1B2B5E';
const NAVY_DARK = '#0F1A3A';
const TEAL      = '#2BA89C';
const CREAM     = '#FEFCF7';
const WHITE     = '#FFFFFF';
const FONT      = '"system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", sans-serif';

// Duración de cada transición (frames)
const TR = 18;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DotGrid: React.FC<{opacity?: number}> = ({opacity = 0.12}) => (
  <div style={{
    position: 'absolute',
    inset: 0,
    backgroundImage: `radial-gradient(circle, rgba(43,168,156,${opacity}) 1.5px, transparent 1.5px)`,
    backgroundSize: '64px 64px',
    pointerEvents: 'none',
  }} />
);

const AccentBar: React.FC = () => (
  <div style={{
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 10,
    background: `linear-gradient(180deg, transparent 5%, ${TEAL} 35%, ${TEAL} 65%, transparent 95%)`,
  }} />
);

function useFadeUp(startFrame: number, duration = 22): React.CSSProperties {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const y = interpolate(frame, [startFrame, startFrame + duration], [50, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return {opacity, transform: `translateY(${y}px)`};
}

// ─── House SVG (vectorized del favicon) ──────────────────────────────────────
const HouseIcon: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 4L38 18V40H4V18L21 4Z" fill={NAVY} stroke={WHITE} strokeWidth="1.5" />
    <path d="M21 8L35 20V38H7V20L21 8Z" fill={TEAL} opacity="0.25" />
    <rect x="16" y="27" width="10" height="13" rx="2" fill={WHITE} opacity="0.9" />
    <rect x="8"  y="22" width="8"  height="7"  rx="1.5" fill={WHITE} opacity="0.7" />
    <rect x="26" y="22" width="8"  height="7"  rx="1.5" fill={WHITE} opacity="0.7" />
    <circle cx="34" cy="34" r="5"   fill={TEAL} stroke={WHITE} strokeWidth="1.5" />
    <circle cx="34" cy="34" r="2.5" fill={WHITE} />
    <rect x="37.5" y="32.8" width="7"   height="2.4" rx="1.2" fill={TEAL} />
    <rect x="42"   y="35.2" width="2.4" height="3"   rx="1"   fill={TEAL} />
    <rect x="38.8" y="35.2" width="2.4" height="2.2" rx="1"   fill={TEAL} />
  </svg>
);

// ─── ESCENA 1: Hook (105 frames) ──────────────────────────────────────────────
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const iconScale = spring({frame, fps, from: 0, to: 1, config: {damping: 12, stiffness: 220}});
  const line1 = useFadeUp(18);
  const line2 = useFadeUp(34);
  const cta   = useFadeUp(52);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DARK} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 70px',
    }}>
      <DotGrid />
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: TEAL}} />

      <div style={{
        transform: `scale(${iconScale})`,
        marginBottom: 52,
        backgroundColor: CREAM,
        borderRadius: '50%',
        width: 200, height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 60px rgba(43,168,156,0.4)`,
      }}>
        <HouseIcon size={120} />
      </div>

      <div style={{...line1, textAlign: 'center', marginBottom: 20}}>
        <span style={{color: WHITE, fontSize: 72, fontWeight: 900, fontFamily: FONT, lineHeight: 1.1, display: 'block'}}>
          ¿Quieres dejar de<br />pagar arriendo?
        </span>
      </div>

      <div style={{...line2, textAlign: 'center', marginBottom: 60}}>
        <span style={{color: TEAL, fontSize: 68, fontWeight: 900, fontFamily: FONT, lineHeight: 1.15, display: 'block'}}>
          Avanza hacia<br />tu casa propia.
        </span>
      </div>

      <div style={cta}>
        <div style={{
          border: `2px solid rgba(43,168,156,0.6)`,
          borderRadius: 60,
          padding: '20px 52px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          backgroundColor: 'rgba(43,168,156,0.12)',
        }}>
          <span style={{color: TEAL, fontSize: 40, fontFamily: FONT, fontWeight: 600}}>Sigue viendo</span>
          <span style={{fontSize: 40}}>👇</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── ESCENA 2: Producto (135 frames) ─────────────────────────────────────────
export const ProductScene: React.FC = () => {
  const frame = useCurrentFrame();

  const badge  = useFadeUp(8);
  const title1 = useFadeUp(22);
  const title2 = useFadeUp(36);
  const body   = useFadeUp(52);
  const pill   = useFadeUp(70);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${NAVY_DARK} 0%, ${NAVY} 60%, #153060 100%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '100px 72px',
    }}>
      <DotGrid opacity={0.08} />
      <AccentBar />

      <div style={{...badge, marginBottom: 40}}>
        <div style={{backgroundColor: TEAL, borderRadius: 50, padding: '16px 44px', display: 'inline-block'}}>
          <span style={{color: WHITE, fontSize: 36, fontWeight: 700, fontFamily: FONT, letterSpacing: 2}}>
            LEASING DS120
          </span>
        </div>
      </div>

      <div style={{...title1, marginBottom: 8}}>
        <span style={{color: WHITE, fontSize: 76, fontWeight: 900, fontFamily: FONT, lineHeight: 1.1}}>
          Accede a tu primera
        </span>
      </div>
      <div style={{...title2, marginBottom: 52}}>
        <span style={{color: TEAL, fontSize: 76, fontWeight: 900, fontFamily: FONT, lineHeight: 1.1}}>
          vivienda<br />sin pie inicial.
        </span>
      </div>

      <div style={{...body, marginBottom: 36}}>
        <span style={{color: 'rgba(255,255,255,0.88)', fontSize: 42, fontFamily: FONT, lineHeight: 1.55, fontWeight: 400}}>
          El Estado puede aportar parte del valor de la propiedad a través del subsidio DS120.
        </span>
      </div>

      <div style={pill}>
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.07)',
          border: `1.5px solid rgba(43,168,156,0.5)`,
          borderRadius: 18,
          padding: '26px 38px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}>
          <span style={{fontSize: 44}}>✨</span>
          <span style={{color: CREAM, fontSize: 40, fontFamily: FONT, fontWeight: 400, lineHeight: 1.35}}>
            Tu cuota mensual{' '}
            <strong style={{color: TEAL, fontWeight: 700}}>reemplaza el arriendo</strong>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── ESCENA 3: Requisitos (165 frames) ───────────────────────────────────────
const REQS = [
  {text: 'Sueldo líquido sobre',  hl: '$700.000'},
  {text: 'Estar',                 hl: 'sin DICOM'},
  {text: 'No ser',                hl: 'propietario de una vivienda'},
  {text: 'Querer tu',             hl: 'primera casa o departamento'},
];

export const RequirementsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const titleAnim = useFadeUp(6);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DARK} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '80px 72px',
    }}>
      <DotGrid />
      <AccentBar />

      <div style={{...titleAnim, marginBottom: 52, width: '100%'}}>
        <span style={{color: WHITE, fontSize: 66, fontWeight: 900, fontFamily: FONT, lineHeight: 1.2}}>
          ¿Cumples los{' '}
          <span style={{color: TEAL}}>requisitos?</span>
        </span>
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: 28, width: '100%'}}>
        {REQS.map((req, i) => {
          const start   = 22 + i * 20;
          const opacity = interpolate(frame, [start, start + 20], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          const x = interpolate(frame, [start, start + 20], [-80, 0], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div key={i} style={{
              opacity,
              transform: `translateX(${x}px)`,
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1.5px solid rgba(43,168,156,0.35)',
              borderRadius: 18,
              padding: '28px 38px',
              display: 'flex',
              alignItems: 'center',
              gap: 22,
            }}>
              <span style={{fontSize: 52, flexShrink: 0, lineHeight: 1}}>✅</span>
              <span style={{color: WHITE, fontSize: 42, fontFamily: FONT, lineHeight: 1.3, fontWeight: 400}}>
                {req.text}{' '}
                <strong style={{color: TEAL, fontWeight: 700}}>{req.hl}</strong>
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── ESCENA 4: CTA (90 frames) ───────────────────────────────────────────────
export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const logoScale = spring({frame, fps, from: 0, to: 1, config: {damping: 10, stiffness: 180}});
  const brand  = useFadeUp(16);
  const sub    = useFadeUp(30);
  const button = useFadeUp(44);
  const url    = useFadeUp(58);

  const pulse = interpolate(Math.sin((frame - 44) * 0.14), [-1, 1], [0.97, 1.03]);

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${TEAL} 0%, #1A8F85 45%, ${NAVY} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 70px',
    }}>
      <DotGrid opacity={0.1} />
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, backgroundColor: NAVY}} />

      <div style={{
        transform: `scale(${logoScale})`,
        marginBottom: 44,
        borderRadius: 32,
        overflow: 'hidden',
        width: 220, height: 220,
        boxShadow: `0 8px 48px rgba(0,0,0,0.35)`,
      }}>
        <Img
          src={staticFile('logo.jpeg')}
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      </div>

      <div style={{...brand, textAlign: 'center', marginBottom: 16}}>
        <span style={{color: WHITE, fontSize: 88, fontWeight: 900, fontFamily: FONT, letterSpacing: -2, lineHeight: 1}}>
          Llave Propia
        </span>
      </div>

      <div style={{...sub, textAlign: 'center', marginBottom: 60}}>
        <span style={{color: 'rgba(255,255,255,0.92)', fontSize: 42, fontWeight: 400, fontFamily: FONT, lineHeight: 1.5, display: 'block'}}>
          Asesoría <strong style={{color: WHITE, fontWeight: 700}}>gratuita</strong> y revisamos tu caso{'\n'}
          en menos de <strong style={{color: WHITE, fontWeight: 700}}>24 horas</strong>.
        </span>
      </div>

      <div style={{
        opacity: button.opacity,
        transform: `${button.transform} scale(${pulse})`,
      }}>
        <div style={{
          backgroundColor: WHITE,
          borderRadius: 80,
          padding: '34px 68px',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          boxShadow: `0 8px 40px rgba(0,0,0,0.25)`,
        }}>
          <span style={{fontSize: 48, lineHeight: 1}}>💬</span>
          <span style={{color: NAVY, fontSize: 46, fontWeight: 900, fontFamily: FONT, letterSpacing: -0.5}}>
            ¿Quieres ver si calificas?
          </span>
        </div>
      </div>

      <div style={{...url, position: 'absolute', bottom: 52}}>
        <span style={{color: 'rgba(255,255,255,0.55)', fontSize: 30, fontFamily: FONT, letterSpacing: 0.5}}>
          llavepropia.cl
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ─── Composición principal ────────────────────────────────────────────────────
// Timeline con TransitionSeries (TR = 18 frames de overlap por transición):
//   Scene 1  105 frames
//   ─── slide ──────────── 18f
//   Scene 2  135 frames
//   ─── wipe ───────────── 18f
//   Scene 3  165 frames
//   ─── fade ───────────── 18f
//   Scene 4   90 frames
//   Total efectivo = 105 + 135 + 165 + 90 - (3×18) = 441 frames ≈ 14.7s
export const Reel: React.FC = () => {
  const {durationInFrames} = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Música de fondo — pon tu mp3 en public/music.mp3 */}
      <Audio
        src={staticFile('music.mp3')}
        volume={(f) => {
          if (f < 30) return interpolate(f, [0, 30], [0, 0.28]);
          if (f > durationInFrames - 30) return interpolate(f, [durationInFrames - 30, durationInFrames], [0.28, 0]);
          return 0.28;
        }}
      />

      <TransitionSeries>
        {/* Escena 1 — Hook */}
        <TransitionSeries.Sequence durationInFrames={105}>
          <HookScene />
        </TransitionSeries.Sequence>

        {/* Transición 1: slide horizontal */}
        <TransitionSeries.Transition
          presentation={slide({direction: 'from-right'})}
          timing={springTiming({durationInFrames: TR, config: {damping: 200}})}
        />

        {/* Escena 2 — Producto */}
        <TransitionSeries.Sequence durationInFrames={135}>
          <ProductScene />
        </TransitionSeries.Sequence>

        {/* Transición 2: wipe diagonal */}
        <TransitionSeries.Transition
          presentation={wipe({direction: 'from-top-right'})}
          timing={linearTiming({durationInFrames: TR})}
        />

        {/* Escena 3 — Requisitos */}
        <TransitionSeries.Sequence durationInFrames={165}>
          <RequirementsScene />
        </TransitionSeries.Sequence>

        {/* Transición 3: fade suave para el cierre */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({durationInFrames: TR})}
        />

        {/* Escena 4 — CTA */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

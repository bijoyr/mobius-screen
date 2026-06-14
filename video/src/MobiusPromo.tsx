import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";

const NAVY = "#052B42";
const NAVY2 = "#0a3a52";
const NAVY3 = "#04222f";
const CANARY = "#E0FF4F";
const WHITE = "#eef4f8";
const DIM = "#9fb3c0";
const FONT = '"Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const Bg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      backgroundColor: NAVY,
      fontFamily: FONT,
      color: WHITE,
      justifyContent: "center",
      alignItems: "center",
      padding: 80,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Fade + rise in, driven by a spring starting at `delay`. */
const Rise: React.FC<{ delay?: number; children: React.ReactNode; y?: number }> = ({
  delay = 0,
  y = 40,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * y}px)` }}>
      {children}
    </div>
  );
};

const Kicker: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      color: CANARY,
      fontWeight: 700,
      letterSpacing: 3,
      textTransform: "uppercase",
      fontSize: 26,
      marginBottom: 18,
    }}
  >
    {children}
  </div>
);

// ---------- Scene 1: Elliott waves ----------
const WAVE_PATH =
  "M 40 340 L 200 230 L 290 300 L 520 130 L 620 210 L 800 70 L 880 175 L 940 120 L 1000 250";
const WAVE_PTS: [number, number, string][] = [
  [200, 230, "1"],
  [290, 300, "2"],
  [520, 130, "3"],
  [620, 210, "4"],
  [800, 70, "5"],
  [880, 175, "A"],
  [940, 120, "B"],
  [1000, 250, "C"],
];

const SceneWave: React.FC = () => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [4, 90], [4000, 0], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });
  return (
    <Bg>
      <div style={{ textAlign: "center", width: 1100 }}>
        <Rise>
          <Kicker>Elliott Wave</Kicker>
          <div style={{ fontSize: 76, fontWeight: 800, marginBottom: 8 }}>
            Markets move in <span style={{ color: CANARY }}>waves</span>.
          </div>
        </Rise>
        <Rise delay={18}>
          <div style={{ fontSize: 32, color: DIM, marginBottom: 24 }}>
            Five-wave impulse. Three-wave correction. Repeat.
          </div>
        </Rise>
        <svg viewBox="0 0 1040 400" style={{ width: 1040, height: 400 }}>
          <path
            d={WAVE_PATH}
            fill="none"
            stroke={CANARY}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={4000}
            strokeDashoffset={draw}
            style={{ filter: `drop-shadow(0 0 10px ${CANARY}88)` }}
          />
          {WAVE_PTS.map(([x, y, label], i) => {
            const appear = interpolate(frame, [38 + i * 6, 50 + i * 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <g key={label} opacity={appear}>
                <circle cx={x} cy={y} r={7} fill={CANARY} />
                <text
                  x={x}
                  y={y - 18}
                  fill={WHITE}
                  fontSize={28}
                  fontWeight={700}
                  textAnchor="middle"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Bg>
  );
};

// ---------- Scene 2: Catch the move early ----------
const SceneEarly: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + 0.15 * Math.sin(frame / 6);
  return (
    <Bg>
      <div style={{ textAlign: "center", width: 1100 }}>
        <Rise>
          <Kicker>The Edge</Kicker>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.15 }}>
            Catch the move <span style={{ color: CANARY }}>while it's still forming</span>.
          </div>
        </Rise>
        <Rise delay={20}>
          <div style={{ fontSize: 32, color: DIM, marginTop: 22 }}>
            Blending real-time market developments with technical breaches and Elliott-wave counts.
          </div>
        </Rise>
        <Rise delay={40}>
          <svg viewBox="0 0 600 220" style={{ width: 600, height: 220, marginTop: 30 }}>
            <path
              d="M 20 60 L 160 120 L 280 90 L 460 30"
              fill="none"
              stroke={DIM}
              strokeWidth={4}
              strokeLinecap="round"
            />
            <circle cx={280} cy={90} r={12 * pulse} fill={CANARY} opacity={0.9} />
            <text x={300} y={70} fill={CANARY} fontSize={24} fontWeight={700}>
              entry
            </text>
          </svg>
        </Rise>
      </div>
    </Bg>
  );
};

// ---------- Scene 3: Scale across global indexes ----------
const SceneScale: React.FC = () => (
  <Bg>
    <div style={{ textAlign: "center", width: 1350 }}>
      <Rise>
        <Kicker>Built to scale</Kicker>
        <div style={{ fontSize: 66, fontWeight: 800 }}>
          Screen <span style={{ color: CANARY }}>thousands</span> of stocks
        </div>
      </Rise>
      <Rise delay={14}>
        <div style={{ fontSize: 32, color: DIM, marginTop: 14 }}>
          across global indexes — one serverless pipeline.
        </div>
      </Rise>
      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          flexWrap: "wrap",
          margin: "40px 0",
        }}
      >
        {["S&P 500", "Nasdaq 100", "NSE / Nifty", "FTSE 100", "Nikkei 225", "DAX", "Hang Seng"].map(
          (m, i) => (
            <Chip key={m} label={m} i={i} />
          ),
        )}
      </div>
      <Rise delay={84}>
        <div style={{ fontSize: 32, color: WHITE }}>
          …ranked down to a <span style={{ color: CANARY }}>high-conviction shortlist</span>.
        </div>
      </Rise>
    </div>
  </Bg>
);

// ---------- Scene 4: The thesis card ----------
const Row: React.FC<{ k: string; v: string; delay: number; color?: string }> = ({
  k,
  v,
  delay,
  color = WHITE,
}) => (
  <Rise delay={delay} y={20}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30, margin: "6px 0" }}>
      <span style={{ color: DIM }}>{k}</span>
      <span style={{ color, fontWeight: 700 }}>{v}</span>
    </div>
  </Rise>
);

const SceneCard: React.FC = () => (
  <Bg>
    <div style={{ width: 1000 }}>
      <Rise>
        <Kicker>Every pick explains itself</Kicker>
      </Rise>
      <Rise delay={10}>
        <div
          style={{
            background: NAVY2,
            border: `1px solid #14506b`,
            borderRadius: 20,
            padding: 44,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 52, fontWeight: 800 }}>AMD</div>
            <div
              style={{
                background: CANARY,
                color: NAVY,
                fontWeight: 800,
                padding: "4px 14px",
                borderRadius: 999,
                fontSize: 24,
              }}
            >
              BUY · conviction 5
            </div>
          </div>
          <Rise delay={16} y={16}>
            <div style={{ fontSize: 30, color: WHITE, lineHeight: 1.45, marginBottom: 18 }}>
              Strong macro alignment with the AI-capex cycle; Wave 4 ABC complete,
              Wave 5 starting with MACD reversal. <span style={{ color: CANARY }}>R:R 2.1.</span>
            </div>
          </Rise>
          <Row k="Entry" v="$511.57" delay={26} />
          <Row k="Stop" v="$480" delay={32} color="#ff8a8a" />
          <Row k="Target" v="$585" delay={38} color={CANARY} />
        </div>
      </Rise>
      <Rise delay={48}>
        <div style={{ fontSize: 26, color: DIM, marginTop: 22, textAlign: "center" }}>
          Live prices · technical breaches · Fibonacci · Elliott-wave counts · hard R:R
        </div>
      </Rise>
    </div>
  </Bg>
);

// ---------- Scene 5: Nebius ----------
const Chip: React.FC<{ label: string; i: number }> = ({ label, i }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 16 - i * 7, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${(1 - s) * 24}px)`,
        background: NAVY3,
        border: `1px solid ${CANARY}66`,
        color: WHITE,
        borderRadius: 999,
        padding: "12px 26px",
        fontSize: 30,
        fontWeight: 600,
      }}
    >
      {label}
    </div>
  );
};

const SceneNebius: React.FC = () => (
  <Bg>
    <div style={{ textAlign: "center", width: 1200 }}>
      <Rise>
        <Kicker>Powered by Nebius AI</Kicker>
        <div style={{ fontSize: 60, fontWeight: 800 }}>
          High-performance <span style={{ color: CANARY }}>open models</span>, on Serverless AI.
        </div>
      </Rise>
      <div
        style={{
          display: "flex",
          gap: 18,
          justifyContent: "center",
          flexWrap: "wrap",
          margin: "40px 0",
        }}
      >
        {["Qwen", "Llama", "DeepSeek", "OpenAI GPT-OSS", "Gemma"].map((m, i) => (
          <Chip key={m} label={m} i={i} />
        ))}
      </div>
      <Rise delay={44}>
        <div style={{ fontSize: 32, color: DIM }}>
          Reasoning over real-time, ever-changing technical metrics · swap any model with one line ·
          <span style={{ color: WHITE }}> serverless scale, pennies per run.</span>
        </div>
      </Rise>
    </div>
  </Bg>
);

// ---------- Scene 6: CTA ----------
const SceneCTA: React.FC = () => (
  <Bg>
    <div style={{ textAlign: "center" }}>
      <Rise>
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: 26,
            background: CANARY,
            color: NAVY,
            fontSize: 70,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          M
        </div>
        <div style={{ fontSize: 72, fontWeight: 800 }}>Mobius-Screen</div>
      </Rise>
      <Rise delay={16}>
        <div style={{ fontSize: 40, color: CANARY, marginTop: 6 }}>
          Find the move — early.
        </div>
      </Rise>
      <Rise delay={32}>
        <div style={{ fontSize: 30, color: DIM, marginTop: 28 }}>
          screener.trustfractals.com · Powered by Nebius AI
        </div>
        <div style={{ fontSize: 20, color: DIM, marginTop: 6 }}>
          Developed by Trinfac
        </div>
        <div style={{ fontSize: 24, color: CANARY, marginTop: 12 }}>
          #NebiusServerlessChallenge
        </div>
      </Rise>
    </div>
  </Bg>
);

// ---------- Timeline ----------
export const MobiusPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <Audio src={staticFile("music.wav")} volume={0.5} />
      <Sequence durationInFrames={180}>
        <SceneWave />
      </Sequence>
      <Sequence from={180} durationInFrames={150}>
        <SceneEarly />
      </Sequence>
      <Sequence from={330} durationInFrames={210}>
        <SceneScale />
      </Sequence>
      <Sequence from={540} durationInFrames={180}>
        <SceneCard />
      </Sequence>
      <Sequence from={720} durationInFrames={150}>
        <SceneNebius />
      </Sequence>
      <Sequence from={870} durationInFrames={150}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};

import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const FONT = '"Segoe UI", "Inter", system-ui, -apple-system, sans-serif';

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const gradientText: React.CSSProperties = {
  fontFamily: FONT,
  backgroundImage:
    "linear-gradient(100deg, #c4b5fd 0%, #67e8f9 45%, #f9a8d4 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
};

/* ---------------------------------- Latar --------------------------------- */

const Blob: React.FC<{
  color: string;
  size: number;
  x: number;
  y: number;
  phase: number;
  speed: number;
}> = ({ color, size, x, y, phase, speed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const dx = Math.sin(t * speed + phase) * 70;
  const dy = Math.cos(t * speed * 0.8 + phase) * 50;
  const scale = 1 + Math.sin(t * speed * 1.4 + phase) * 0.12;

  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        left: `calc(${x}% - ${size / 2}px)`,
        top: `calc(${y}% - ${size / 2}px)`,
        background: `radial-gradient(circle at center, ${color} 0%, rgba(0,0,0,0) 68%)`,
        filter: "blur(30px)",
        transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
        mixBlendMode: "screen",
      }}
    />
  );
};

const Background: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#070a14", overflow: "hidden" }}>
      <Blob
        color="rgba(124,58,237,0.5)"
        size={760}
        x={20}
        y={28}
        phase={0}
        speed={0.55}
      />
      <Blob
        color="rgba(8,145,178,0.45)"
        size={680}
        x={80}
        y={22}
        phase={2.1}
        speed={0.42}
      />
      <Blob
        color="rgba(219,39,119,0.32)"
        size={620}
        x={72}
        y={82}
        phase={4.2}
        speed={0.5}
      />
      <Blob
        color="rgba(59,130,246,0.3)"
        size={560}
        x={28}
        y={88}
        phase={1.2}
        speed={0.62}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at center, black 15%, transparent 72%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 15%, transparent 72%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(3,6,15,0.75) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/* --------------------------------- Adegan --------------------------------- */

const IntroScene: React.FC<{ offset: number }> = ({ offset }) => {
  const frame = useCurrentFrame() - offset;
  const { fps } = useVideoConfig();

  const badge = spring({
    frame: frame - 4,
    fps,
    config: { damping: 200 },
  });
  const title = spring({
    frame: frame - 12,
    fps,
    config: { damping: 16, stiffness: 120, mass: 0.9 },
  });
  const underline = spring({
    frame: frame - 30,
    fps,
    config: { damping: 200 },
  });
  const subtitle = spring({
    frame: frame - 38,
    fps,
    config: { damping: 200 },
  });

  const titleOpacity = Math.min(1, Math.max(0, title));
  const pulse = 0.5 + 0.5 * Math.sin(frame / 8);

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          border: "1px solid rgba(148,163,184,0.16)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          transform: `rotate(${frame * 1.4}deg)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -6,
            left: "50%",
            width: 12,
            height: 12,
            marginLeft: -6,
            borderRadius: "50%",
            background: "#22d3ee",
            boxShadow: "0 0 24px 4px rgba(34,211,238,0.7)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -4,
            left: "30%",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#f472b6",
            boxShadow: "0 0 18px 3px rgba(244,114,182,0.7)",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: badge,
            transform: `translateY(${(1 - badge) * 14}px)`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 18px",
            borderRadius: 999,
            border: "1px solid rgba(196,181,253,0.28)",
            background: "rgba(139,92,246,0.1)",
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 4,
            color: "#ddd6fe",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#a78bfa",
              opacity: 0.6 + pulse * 0.4,
              boxShadow: `0 0 ${8 + pulse * 10}px rgba(167,139,250,0.9)`,
            }}
          />
          Video 10 detik
        </div>

        <h1
          style={{
            ...gradientText,
            fontSize: 150,
            fontWeight: 800,
            letterSpacing: -6,
            lineHeight: 1,
            margin: "24px 0 0",
            opacity: titleOpacity,
            transform: `translateY(${(1 - title) * 40}px) scale(${0.85 + title * 0.15})`,
            filter: "drop-shadow(0 18px 60px rgba(139,92,246,0.35))",
          }}
        >
          Halo!
        </h1>

        <div
          style={{
            height: 6,
            width: underline * 280,
            borderRadius: 3,
            marginTop: 26,
            background: "linear-gradient(90deg,#a78bfa,#22d3ee,#f472b6)",
            boxShadow: "0 0 24px rgba(34,211,238,0.5)",
          }}
        />

        <p
          style={{
            opacity: subtitle,
            transform: `translateY(${(1 - subtitle) * 16}px)`,
            margin: "26px 0 0",
            fontFamily: FONT,
            fontSize: 26,
            color: "#94a3b8",
            letterSpacing: 0.4,
          }}
        >
          Ini video sederhana berdurasi sepuluh detik.
        </p>
      </div>
    </AbsoluteFill>
  );
};

const FeatureScene: React.FC<{ offset: number }> = ({ offset }) => {
  const frame = useCurrentFrame() - offset;
  const { fps } = useVideoConfig();

  const heading = spring({
    frame: frame - 4,
    fps,
    config: { damping: 200 },
  });
  const word = spring({
    frame: frame - 12,
    fps,
    config: { damping: 15, stiffness: 90, mass: 0.9 },
  });

  const wordOpacity = Math.min(1, Math.max(0, word));

  const chips = [
    { label: "React", color: "#22d3ee" },
    { label: "TypeScript", color: "#a78bfa" },
    { label: "300 frame", color: "#f472b6" },
  ];

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: heading,
            transform: `translateY(${(1 - heading) * 12}px)`,
            fontFamily: FONT,
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: 9,
            color: "#a5b4fc",
            textTransform: "uppercase",
          }}
        >
          Dibuat dengan
        </div>

        <h2
          style={{
            ...gradientText,
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: -5,
            lineHeight: 1,
            margin: "16px 0 0",
            opacity: wordOpacity,
            transform: `translateY(${(1 - word) * 34}px) scale(${0.88 + word * 0.12})`,
            filter: "drop-shadow(0 20px 70px rgba(34,211,238,0.28))",
          }}
        >
          Remotion
        </h2>

        <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
          {chips.map((chip, i) => {
            const pop = spring({
              frame: frame - (34 + i * 8),
              fps,
              config: { damping: 200 },
            });

            return (
              <div
                key={chip.label}
                style={{
                  opacity: pop,
                  transform: `translateY(${(1 - pop) * 24}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 22px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#e2e8f0",
                  fontFamily: FONT,
                  fontSize: 18,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: chip.color,
                    boxShadow: `0 0 12px ${chip.color}`,
                  }}
                />
                {chip.label}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ offset: number }> = ({ offset }) => {
  const frame = useCurrentFrame() - offset;
  const { fps } = useVideoConfig();

  const title = spring({
    frame: frame - 8,
    fps,
    config: { damping: 16, stiffness: 110, mass: 0.9 },
  });
  const subtitle = spring({
    frame: frame - 26,
    fps,
    config: { damping: 200 },
  });

  const titleOpacity = Math.min(1, Math.max(0, title));
  const pulse = 0.5 + 0.5 * Math.sin(frame / 9);

  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(139,92,246,0.28), transparent 65%)",
          transform: `scale(${1 + pulse * 0.08})`,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            ...gradientText,
            fontSize: 124,
            fontWeight: 800,
            letterSpacing: -5,
            lineHeight: 1,
            margin: 0,
            opacity: titleOpacity,
            transform: `translateY(${(1 - title) * 36}px) scale(${0.86 + title * 0.14})`,
            filter: "drop-shadow(0 18px 60px rgba(244,114,182,0.3))",
          }}
        >
          Terima kasih!
        </h1>

        <p
          style={{
            opacity: subtitle,
            transform: `translateY(${(1 - subtitle) * 16}px)`,
            margin: "28px 0 0",
            fontFamily: FONT,
            fontSize: 28,
            color: "#94a3b8",
            letterSpacing: 0.4,
          }}
        >
          Sampai jumpa di video berikutnya.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 40 }}>
          {[0, 1, 2].map((i) => {
            const wave = Math.sin(frame / 8 - i * 0.6);
            return (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#a78bfa,#22d3ee)",
                  opacity: 0.55 + wave * 0.35,
                  transform: `translateY(${wave * 6}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------- Progres bar ------------------------------ */

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = interpolate(
    frame,
    [0, durationInFrames - 1],
    [0, 100],
    clamp,
  );

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 5,
        background: "rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg,#8b5cf6,#22d3ee,#f472b6)",
          boxShadow: "0 0 18px rgba(34,211,238,0.7)",
        }}
      />
    </div>
  );
};

/* ------------------------------- Komposisi -------------------------------- */

export const Video10DetikScene: React.FC = () => {
  const frame = useCurrentFrame();

  const introOpacity = interpolate(frame, [0, 12, 108, 124], [0, 1, 1, 0], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const featureOpacity = interpolate(
    frame,
    [112, 130, 196, 214],
    [0, 1, 1, 0],
    { ...clamp, easing: Easing.inOut(Easing.quad) },
  );
  const outroOpacity = interpolate(frame, [200, 220], [0, 1], {
    ...clamp,
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#070a14", fontFamily: FONT }}>
      <Background />

      <AbsoluteFill style={{ opacity: introOpacity }}>
        <IntroScene offset={0} />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: featureOpacity }}>
        <FeatureScene offset={112} />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: outroOpacity }}>
        <OutroScene offset={200} />
      </AbsoluteFill>

      <ProgressBar />

      <Audio
        src={staticFile("videos/video-10-detik/audio/musik.wav")}
        volume={(f) =>
          interpolate(f, [0, 20, 240, 300], [0, 0.5, 0.5, 0], clamp)
        }
      />

      {[4, 112, 200].map((from) => (
        <Sequence key={from} from={from} durationInFrames={30}>
          <Audio
            src={staticFile("audio/whoosh.wav")}
            volume={(f) =>
              interpolate(f, [0, 5, 24, 30], [0, 0.22, 0.22, 0], clamp)
            }
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const Video10DetikComposition: React.FC = () => {
  return (
    <>
      <Composition
        id="Video10Detik"
        component={Video10DetikScene}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  );
};

import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  continueRender,
  delayRender,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const W = 320;
const H = 180;

const PIXEL_FONT = "'Press Start 2P', 'Courier New', monospace";
const MONO = "'Consolas', 'Courier New', monospace";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const mod = (value: number, size: number) => ((value % size) + size) % size;

/* ------------------------------- Pixel utils ------------------------------ */

const hash = (seed: number, i: number) => {
  const value = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

const valueNoise = (seed: number, x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(seed, i);
  const b = hash(seed, i + 1);
  return a + (b - a) * u;
};

const makeRidge = (seed: number, baseY: number, amplitude: number) => {
  const heights: number[] = [];
  for (let x = 0; x < W; x++) {
    const n =
      valueNoise(seed, x / 52) * 0.55 +
      valueNoise(seed + 7, x / 23) * 0.3 +
      valueNoise(seed + 13, x / 8) * 0.15;
    heights.push(Math.round(baseY - n * amplitude));
  }
  return heights;
};

const ridgePath = (heights: number[], bottom: number) => {
  let d = `M 0 ${bottom} L 0 ${heights[0]}`;
  for (let x = 1; x < heights.length; x++) {
    d += ` L ${x} ${heights[x - 1]} L ${x} ${heights[x]}`;
  }
  d += ` L ${W} ${heights[W - 1]} L ${W} ${bottom} Z`;
  return d;
};

type SkyBand = { c: string; h: number };

const layoutSky = (bands: SkyBand[]) => {
  let y = 0;
  return bands.map((band) => {
    const placed = { ...band, y };
    y += band.h;
    return placed;
  });
};

const sunsetSky = layoutSky([
  { c: "#1b1036", h: 20 },
  { c: "#2c1850", h: 16 },
  { c: "#4a2166", h: 16 },
  { c: "#722b6d", h: 15 },
  { c: "#a03d70", h: 14 },
  { c: "#cf5870", h: 14 },
  { c: "#ee7a6b", h: 13 },
  { c: "#ffa069", h: 14 },
]);

const nightSky = layoutSky([
  { c: "#070b1c", h: 22 },
  { c: "#0a1026", h: 20 },
  { c: "#0d1630", h: 20 },
  { c: "#10203c", h: 22 },
  { c: "#152947", h: 22 },
  { c: "#1b3452", h: 24 },
]);

const dawnSky = layoutSky([
  { c: "#211542", h: 18 },
  { c: "#321b55", h: 16 },
  { c: "#4a2462", h: 16 },
  { c: "#67306c", h: 16 },
  { c: "#8b3c70", h: 15 },
  { c: "#b04e70", h: 14 },
  { c: "#d56870", h: 14 },
  { c: "#f18a78", h: 13 },
]);

const sunsetFar = makeRidge(11, 118, 44);
const sunsetMid = makeRidge(23, 122, 30);
const nightFar = makeRidge(31, 128, 34);
const nightNear = makeRidge(47, 134, 20);
const dawnFar = makeRidge(5, 120, 40);
const dawnMid = makeRidge(17, 124, 26);

const sunsetShore = Array.from({ length: W }, (_, x) =>
  168 + Math.round(Math.sin(x / 11) * 1.4 + Math.sin(x / 29) * 1.8),
);

const dawnShore = Array.from({ length: W }, (_, x) =>
  170 + Math.round(Math.sin(x / 13) * 1.2 + Math.sin(x / 27) * 1.6),
);

type Star = {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  color: string;
};

const starColors = ["#ffffff", "#ffe9b0", "#bcd7ff"];

const stars: Star[] = Array.from({ length: 90 }, (_, i) => ({
  x: Math.floor(hash(101, i) * W),
  y: 4 + Math.floor(hash(202, i) * 108),
  size: hash(303, i) > 0.86 ? 2 : 1,
  phase: hash(404, i) * Math.PI * 2,
  speed: 0.5 + hash(505, i) * 1.5,
  color: starColors[i % starColors.length],
}));

const fireflies = Array.from({ length: 10 }, (_, i) => ({
  x: 88 + hash(701, i) * 150,
  y: 100 + hash(702, i) * 45,
  phase: hash(703, i) * Math.PI * 2,
  speed: 0.6 + hash(704, i) * 0.8,
}));

/* ------------------------------- SVG pieces ------------------------------- */

const PixelCircle: React.FC<{
  cx: number;
  cy: number;
  r: number;
  color: string;
  opacity?: number;
}> = ({ cx, cy, r, color, opacity = 1 }) => {
  const ccx = Math.round(cx);
  const ccy = Math.round(cy);
  const rows: React.ReactNode[] = [];

  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    rows.push(
      <rect
        key={dy}
        x={ccx - half}
        y={ccy + dy}
        width={half * 2 + 1}
        height={1}
        fill={color}
      />,
    );
  }

  return <g opacity={opacity}>{rows}</g>;
};

const Cloud: React.FC<{
  x: number;
  y: number;
  scale?: number;
  color: string;
  opacity?: number;
}> = ({ x, y, scale = 1, color, opacity = 1 }) => (
  <g
    transform={`translate(${Math.round(x)} ${Math.round(y)}) scale(${scale})`}
    fill={color}
    opacity={opacity}
  >
    <rect x={0} y={5} width={26} height={4} />
    <rect x={4} y={2} width={16} height={3} />
    <rect x={8} y={0} width={9} height={2} />
    <rect x={20} y={4} width={8} height={3} />
  </g>
);

const Bird: React.FC<{
  x: number;
  y: number;
  flap: boolean;
  color: string;
}> = ({ x, y, flap, color }) => (
  <g
    transform={`translate(${Math.round(x)} ${Math.round(y)})`}
    fill={color}
  >
    <rect x={0} y={flap ? 1 : 0} width={2} height={1} />
    <rect x={2} y={flap ? 0 : 1} width={2} height={1} />
    <rect x={4} y={flap ? 1 : 0} width={2} height={1} />
  </g>
);

const PineTree: React.FC<{
  x: number;
  baseY: number;
  height: number;
  color: string;
  trunk?: string;
}> = ({ x, baseY, height, color, trunk = color }) => {
  const trunkH = Math.max(3, Math.round(height * 0.18));
  const trunkW = Math.max(2, Math.round(height / 12));
  const canopyH = height - trunkH;
  const tierH = Math.round(canopyH * 0.52);
  const step = Math.round(canopyH * 0.23);
  const rows: React.ReactNode[] = [];

  rows.push(
    <rect
      key="trunk"
      x={Math.round(x - trunkW / 2)}
      y={baseY - trunkH}
      width={trunkW}
      height={trunkH}
      fill={trunk}
    />,
  );

  for (let tier = 0; tier < 3; tier++) {
    const tierBottom = baseY - trunkH - tier * step;
    const half = Math.max(2, Math.round(height * (0.2 - tier * 0.035)));
    for (let row = 0; row < tierH; row++) {
      const rowHalf = Math.max(
        1,
        Math.round(((row + 1) / tierH) * half),
      );
      rows.push(
        <rect
          key={`${tier}-${row}`}
          x={Math.round(x - rowHalf)}
          y={tierBottom - tierH + row}
          width={rowHalf * 2 + 1}
          height={1}
          fill={color}
        />,
      );
    }
  }

  return <g>{rows}</g>;
};

const Tent: React.FC<{
  x: number;
  baseY: number;
  width: number;
  height: number;
  frame: number;
}> = ({ x, baseY, width, height, frame }) => {
  const rows: React.ReactNode[] = [];
  const top = baseY - height;

  for (let row = 0; row < height; row++) {
    const half = Math.max(
      1,
      Math.round(((row + 1) / height) * (width / 2)),
    );
    const y = top + row;
    rows.push(
      <rect
        key={`body-${row}`}
        x={x - half}
        y={y}
        width={half * 2 + 1}
        height={1}
        fill={row % 8 < 4 ? "#d06640" : "#a94a31"}
      />,
    );
  }

  for (let row = Math.floor(height * 0.42); row < height; row++) {
    const progress = (row - height * 0.42) / (height * 0.58);
    const half = Math.round(progress * width * 0.17);
    rows.push(
      <rect
        key={`door-${row}`}
        x={x - half}
        y={top + row}
        width={half * 2 + 1}
        height={1}
        fill="#160f20"
      />,
    );
  }

  const glow = 0.55 + 0.45 * Math.sin(frame / 9);

  return (
    <g>
      <rect x={x - 5} y={baseY - 6} width={10} height={5} fill="#ffb45e" opacity={glow} />
      <rect x={x - 1} y={top - 7} width={1} height={7} fill="#5c4030" />
      <rect x={x} y={top - 7} width={5} height={3} fill="#ffd166" />
      {rows}
      <rect x={x - width / 2} y={baseY - 1} width={width} height={1} fill="#3a2028" />
    </g>
  );
};

/* ---------------------------------- Scenes -------------------------------- */

const SunsetScene: React.FC = () => {
  const frame = useCurrentFrame();
  const sunX = 238;
  const sunY = 94 + Math.min(10, Math.max(0, frame) * 0.03);

  const clouds = [
    { x: 30, y: 28, scale: 2, speed: 0.05, color: "#ffb98a", opacity: 0.5 },
    { x: 165, y: 51, scale: 1.6, speed: 0.085, color: "#ff9a7a", opacity: 0.42 },
    { x: 255, y: 17, scale: 1.2, speed: 0.06, color: "#ffd0a0", opacity: 0.36 },
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      style={{ position: "absolute", inset: 0 }}
    >
      {sunsetSky.map((band) => (
        <rect
          key={band.y}
          x={0}
          y={band.y}
          width={W}
          height={band.h}
          fill={band.c}
        />
      ))}

      <PixelCircle cx={sunX} cy={sunY} r={30} color="#ff9a5a" opacity={0.1} />
      <PixelCircle cx={sunX} cy={sunY} r={21} color="#ffb26b" opacity={0.16} />
      <PixelCircle cx={sunX} cy={sunY} r={13} color="#ffd166" />
      <PixelCircle cx={sunX} cy={sunY} r={9} color="#fff1b8" />

      {clouds.map((cloud) => (
        <Cloud
          key={cloud.x}
          x={mod(cloud.x + frame * cloud.speed, W + 80) - 40}
          y={cloud.y}
          scale={cloud.scale}
          color={cloud.color}
          opacity={cloud.opacity}
        />
      ))}

      {Array.from({ length: 4 }, (_, i) => {
        const bx = mod(frame * 0.5 + i * 85, W + 80) - 40;
        const by = 52 + (i % 3) * 11 + Math.sin(frame / 18 + i) * 3;
        const flap = Math.floor((frame + i * 5) / 6) % 2 === 0;
        return <Bird key={i} x={bx} y={by} flap={flap} color="#2a1830" />;
      })}

      <path d={ridgePath(sunsetFar, 124)} fill="#6b3d72" />
      <path d={ridgePath(sunsetMid, 124)} fill="#472a5a" />

      <rect x={0} y={122} width={W} height={58} fill="#2f2453" />
      <rect x={0} y={140} width={W} height={16} fill="#241d43" />
      <rect x={0} y={156} width={W} height={12} fill="#191633" />
      <rect x={0} y={122} width={W} height={1} fill="#9b5a78" opacity={0.55} />

      {Array.from({ length: 24 }, (_, i) => {
        const y = 126 + ((i * 5) % 38);
        const dir = i % 2 === 0 ? 1 : -1;
        const x = mod(i * 37 + frame * 0.25 * dir, W + 40) - 20;
        const width = 5 + (i % 5) * 3;
        return (
          <rect
            key={i}
            x={Math.round(x)}
            y={y}
            width={width}
            height={1}
            fill="#9b5f83"
            opacity={0.12 + (i % 4) * 0.04}
          />
        );
      })}

      {Array.from({ length: 14 }, (_, i) => {
        const y = 126 + i * 3;
        const width = Math.max(
          3,
          12 - i * 0.7 + Math.sin((frame + i * 7) / 10) * 2,
        );
        const x = sunX - width / 2 + Math.sin(frame * 0.15 + i) * 2.5;
        return (
          <rect
            key={`reflection-${i}`}
            x={Math.round(x)}
            y={y}
            width={Math.round(width)}
            height={1}
            fill={i < 5 ? "#ffd166" : "#ef8a6a"}
            opacity={0.7 - i * 0.045}
          />
        );
      })}

      <path d={ridgePath(sunsetShore, H)} fill="#0e0a1a" />

      {Array.from({ length: 28 }, (_, i) => {
        const x = mod(i * 11 + 5, W);
        const y = sunsetShore[Math.floor(x)] + 2;
        return (
          <rect
            key={`grass-${i}`}
            x={x}
            y={y}
            width={1 + (i % 3)}
            height={2 + (i % 2)}
            fill="#1c332a"
            opacity={0.8}
          />
        );
      })}

      <PineTree x={18} baseY={173} height={48} color="#0c0916" trunk="#080510" />
      <PineTree x={46} baseY={172} height={62} color="#0b0814" trunk="#070410" />
      <PineTree x={72} baseY={171} height={38} color="#0d0a18" trunk="#080510" />
      <PineTree x={282} baseY={172} height={56} color="#0b0814" trunk="#070410" />
      <PineTree x={304} baseY={173} height={42} color="#0c0916" trunk="#080510" />
    </svg>
  );
};

const NightScene: React.FC<{ offset: number }> = ({ offset }) => {
  const frame = useCurrentFrame() - offset;
  const { fps } = useVideoConfig();
  const t = frame / fps;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      style={{ position: "absolute", inset: 0 }}
    >
      {nightSky.map((band) => (
        <rect
          key={band.y}
          x={0}
          y={band.y}
          width={W}
          height={band.h}
          fill={band.c}
        />
      ))}

      {stars.map((star, i) => {
        const twinkle =
          0.35 +
          0.65 * (0.5 + 0.5 * Math.sin(t * star.speed * 1.8 + star.phase));
        return (
          <rect
            key={i}
            x={star.x}
            y={star.y}
            width={star.size}
            height={star.size}
            fill={star.color}
            opacity={twinkle}
          />
        );
      })}

      <PixelCircle cx={248} cy={38} r={22} color="#dfe8ff" opacity={0.08} />
      <PixelCircle cx={248} cy={38} r={13} color="#f4f1d0" />
      <PixelCircle cx={244} cy={34} r={2} color="#cfc9a4" />
      <PixelCircle cx={252} cy={43} r={2} color="#d8d2ac" />
      <PixelCircle cx={243} cy={45} r={1} color="#cfc9a4" />

      {frame >= 44 && frame <= 66 ? (
        <g opacity={1 - (frame - 44) / 22}>
          {Array.from({ length: 8 }, (_, i) => {
            const progress = (frame - 44) / 22;
            const x = 40 + progress * 90 - i * 3;
            const y = 24 + progress * 30 - i * 2;
            return (
              <rect
                key={i}
                x={Math.round(x)}
                y={Math.round(y)}
                width={2}
                height={1}
                fill="#fff3c4"
                opacity={0.85 - i * 0.09}
              />
            );
          })}
        </g>
      ) : null}

      <PixelCircle cx={112} cy={132} r={40} color="#b75a4a" opacity={0.1} />
      <path d={ridgePath(nightFar, 180)} fill="#0e1a2e" />
      <path d={ridgePath(nightNear, 180)} fill="#081120" />

      <rect x={0} y={132} width={W} height={48} fill="#08141b" />
      <rect x={0} y={162} width={W} height={18} fill="#061016" />

      {Array.from({ length: 26 }, (_, i) => {
        const x = mod(i * 67 + 13, W);
        const y = 136 + ((i * 17) % 38);
        return (
          <rect
            key={`grass-${i}`}
            x={x}
            y={y}
            width={2 + (i % 3) * 2}
            height={1}
            fill="#123028"
            opacity={0.8}
          />
        );
      })}

      <PineTree x={22} baseY={146} height={64} color="#040b12" />
      <PineTree x={48} baseY={144} height={46} color="#050d14" />
      <PineTree x={76} baseY={142} height={36} color="#061019" />
      <PineTree x={272} baseY={145} height={54} color="#040b12" />
      <PineTree x={298} baseY={147} height={68} color="#030a10" />

      <Tent x={226} baseY={150} width={50} height={30} frame={frame} />

      <Campfire x={156} y={150} frame={frame} />

      {Array.from({ length: 5 }, (_, i) => {
        const progress = mod(frame * 0.8 + i * 22, 110) / 110;
        const x = 156 + Math.sin(progress * 6 + i * 1.7) * 10 + progress * 8;
        const y = 124 - progress * 44;
        return (
          <rect
            key={`smoke-${i}`}
            x={Math.round(x)}
            y={Math.round(y)}
            width={2 + Math.round(progress * 2)}
            height={2}
            fill="#6b7086"
            opacity={(1 - progress) * 0.28}
          />
        );
      })}

      {fireflies.map((fly, i) => {
        const x =
          fly.x + Math.sin(t * fly.speed + fly.phase) * 12 + (i % 2 ? 4 : -4);
        const y = fly.y + Math.cos(t * fly.speed * 0.8 + fly.phase) * 7;
        const blink = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.2));
        return (
          <g key={i} opacity={blink}>
            <rect
              x={Math.round(x) - 1}
              y={Math.round(y) - 1}
              width={3}
              height={3}
              fill="#ffe066"
              opacity={0.22}
            />
            <rect
              x={Math.round(x)}
              y={Math.round(y)}
              width={1}
              height={1}
              fill="#fff3a8"
            />
          </g>
        );
      })}
    </svg>
  );
};

const Campfire: React.FC<{ x: number; y: number; frame: number }> = ({
  x,
  y,
  frame,
}) => {
  const flames: React.ReactNode[] = [];
  const height = 22;

  for (let row = 0; row < height; row++) {
    const progress = row / height;
    const wobble =
      Math.sin(frame * 0.6 + row * 0.8) * 1.4 +
      Math.sin(frame * 0.33 + row * 1.7) * 1.0;
    const half = Math.max(
      0,
      Math.round((1 - progress) * 7 + wobble * progress),
    );
    if (half === 0) {
      continue;
    }
    const color =
      progress > 0.65
        ? "#ffd166"
        : progress > 0.35
          ? "#ff9f43"
          : "#ff5a36";
    flames.push(
      <rect
        key={`flame-${row}`}
        x={Math.round(x - half)}
        y={y - 4 - row}
        width={half * 2 + 1}
        height={1}
        fill={color}
      />,
    );
  }

  const inner: React.ReactNode[] = [];
  for (let row = 0; row < 11; row++) {
    const progress = row / 11;
    const half = Math.max(
      0,
      Math.round((1 - progress) * 3 + Math.sin(frame * 0.9 + row) * 0.6),
    );
    if (half === 0) {
      continue;
    }
    inner.push(
      <rect
        key={`inner-${row}`}
        x={Math.round(x - half)}
        y={y - 4 - row}
        width={half * 2 + 1}
        height={1}
        fill="#ffe9a3"
      />,
    );
  }

  return (
    <g>
      <rect x={x - 13} y={y - 1} width={26} height={3} fill="#4a2a22" />
      <rect x={x - 9} y={y - 3} width={18} height={2} fill="#6b3b2c" />
      <rect x={x - 4} y={y - 5} width={8} height={2} fill="#3b201b" />
      {flames}
      {inner}
      {Array.from({ length: 5 }, (_, i) => {
        const progress = mod(frame * 1.3 + i * 19, 38) / 38;
        const sparkX = x + Math.sin(frame * 0.1 + i * 2) * 8 * (0.4 + progress);
        const sparkY = y - 20 - progress * 30;
        return (
          <rect
            key={`spark-${i}`}
            x={Math.round(sparkX)}
            y={Math.round(sparkY)}
            width={1}
            height={1}
            fill="#ffd166"
            opacity={1 - progress}
          />
        );
      })}
    </g>
  );
};

const DawnScene: React.FC<{ offset: number }> = ({ offset }) => {
  const frame = useCurrentFrame() - offset;
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const rise = Math.min(1, Math.max(0, frame) / 210);
  const sunX = 94;
  const sunY = 112 - rise * 30;

  const clouds = [
    { x: 60, y: 22, scale: 1.8, speed: 0.06, color: "#ffc0b0", opacity: 0.4 },
    { x: 210, y: 44, scale: 1.4, speed: 0.09, color: "#ffb7a8", opacity: 0.34 },
    { x: 270, y: 72, scale: 1, speed: 0.05, color: "#ffd8c0", opacity: 0.3 },
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      shapeRendering="crispEdges"
      style={{ position: "absolute", inset: 0 }}
    >
      {dawnSky.map((band) => (
        <rect
          key={band.y}
          x={0}
          y={band.y}
          width={W}
          height={band.h}
          fill={band.c}
        />
      ))}

      {stars.slice(0, 36).map((star, i) => {
        const fade = Math.max(0, 0.45 - frame * 0.004);
        const twinkle = 0.5 + 0.5 * Math.sin(t * star.speed * 2 + star.phase);
        return (
          <rect
            key={i}
            x={star.x}
            y={star.y}
            width={1}
            height={1}
            fill={star.color}
            opacity={fade * twinkle}
          />
        );
      })}

      <PixelCircle cx={sunX} cy={sunY} r={32} color="#ff9e7a" opacity={0.1} />
      <PixelCircle cx={sunX} cy={sunY} r={21} color="#ffbf8a" opacity={0.15} />
      <PixelCircle cx={sunX} cy={sunY} r={13} color="#ffe0a0" />
      <PixelCircle cx={sunX} cy={sunY} r={9} color="#fff6cf" />

      {clouds.map((cloud) => (
        <Cloud
          key={cloud.x}
          x={mod(cloud.x + frame * cloud.speed, W + 80) - 40}
          y={cloud.y}
          scale={cloud.scale}
          color={cloud.color}
          opacity={cloud.opacity}
        />
      ))}

      {Array.from({ length: 4 }, (_, i) => {
        const bx = mod(frame * 0.4 + i * 95, W + 80) - 40;
        const by = 48 + (i % 3) * 10 + Math.sin(frame / 20 + i) * 2;
        const flap = Math.floor((frame + i * 6) / 7) % 2 === 0;
        return <Bird key={i} x={bx} y={by} flap={flap} color="#3b2338" />;
      })}

      <path d={ridgePath(dawnFar, 124)} fill="#6b3f6e" />
      <path d={ridgePath(dawnMid, 124)} fill="#472b57" />

      <rect x={0} y={122} width={W} height={58} fill="#3a2d55" />
      <rect x={0} y={140} width={W} height={16} fill="#2b2344" />
      <rect x={0} y={156} width={W} height={12} fill="#1d1a35" />
      <rect x={0} y={122} width={W} height={1} fill="#c47a86" opacity={0.5} />

      {Array.from({ length: 20 }, (_, i) => {
        const y = 126 + ((i * 6) % 38);
        const x = mod(i * 41 + frame * 0.3, W + 40) - 20;
        return (
          <rect
            key={i}
            x={Math.round(x)}
            y={y}
            width={6 + (i % 4) * 4}
            height={1}
            fill="#b97a8e"
            opacity={0.1 + (i % 3) * 0.04}
          />
        );
      })}

      {Array.from({ length: 13 }, (_, i) => {
        const y = 126 + i * 3;
        const width = Math.max(
          3,
          11 - i * 0.65 + Math.sin((frame + i * 9) / 11) * 2,
        );
        const x = sunX - width / 2 + Math.sin(frame * 0.12 + i) * 2.2;
        return (
          <rect
            key={`dawn-reflection-${i}`}
            x={Math.round(x)}
            y={y}
            width={Math.round(width)}
            height={1}
            fill={i < 4 ? "#ffe0a0" : "#ff9a72"}
            opacity={0.66 - i * 0.045}
          />
        );
      })}

      {Array.from({ length: 5 }, (_, i) => (
        <g key={`mist-${i}`} opacity={0.05 + i * 0.012}>
          <rect
            x={mod(frame * 0.2 + i * 70, W + 100) - 50}
            y={117 + i * 5}
            width={120}
            height={2}
            fill="#ffe1d0"
          />
          <rect
            x={mod(frame * 0.15 + 90 + i * 80, W + 100) - 50}
            y={120 + i * 5}
            width={80}
            height={1}
            fill="#ffe1d0"
          />
        </g>
      ))}

      <path d={ridgePath(dawnShore, H)} fill="#120c1e" />

      {Array.from({ length: 26 }, (_, i) => {
        const x = mod(i * 13 + 7, W);
        const y = dawnShore[Math.floor(x)] + 2;
        return (
          <rect
            key={`grass-${i}`}
            x={x}
            y={y}
            width={1 + (i % 3)}
            height={2 + (i % 2)}
            fill="#223a2e"
            opacity={0.75}
          />
        );
      })}

      {Array.from({ length: 10 }, (_, row) => {
        const half = Math.round(((row + 1) / 10) * 9);
        return (
          <rect
            key={`tiny-tent-${row}`}
            x={272 - half}
            y={170 - 10 + row}
            width={half * 2 + 1}
            height={1}
            fill={row % 4 < 2 ? "#3a2a4a" : "#2c2038"}
          />
        );
      })}
      <rect x={270} y={165} width={4} height={5} fill="#ffcf7a" opacity={0.6} />

      <PineTree x={20} baseY={175} height={50} color="#0d0a16" trunk="#090610" />
      <PineTree x={46} baseY={174} height={36} color="#0f0c1a" trunk="#090610" />
      <PineTree x={296} baseY={175} height={62} color="#0d0a16" trunk="#090610" />
    </svg>
  );
};

/* ---------------------------------- HUD ----------------------------------- */

const PixelPin: React.FC<{ color: string }> = ({ color }) => (
  <div
    style={{
      width: 24,
      height: 30,
      position: "relative",
      filter: "drop-shadow(3px 3px 0 rgba(0,0,0,0.4))",
      flexShrink: 0,
    }}
  >
    <div
      style={{
        position: "absolute",
        left: 4,
        top: 0,
        width: 16,
        height: 16,
        background: color,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 8,
        top: 6,
        width: 8,
        height: 8,
        background: "#0e0a1a",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 9,
        top: 16,
        width: 6,
        height: 6,
        background: color,
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 10,
        top: 22,
        width: 4,
        height: 4,
        background: color,
      }}
    />
  </div>
);

const TopHud: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = Math.floor(frame / fps);
  const blink = Math.floor(frame / 15) % 2 === 0;
  const textShadow = "3px 3px 0 rgba(0,0,0,0.65)";

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "32px 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "13px 18px",
          background: "rgba(5,6,16,0.5)",
          border: "2px solid rgba(255,255,255,0.2)",
          boxShadow: "5px 5px 0 rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            background: "#ff4d4d",
            opacity: blink ? 1 : 0.2,
            boxShadow: "0 0 14px rgba(255,77,77,0.9)",
          }}
        />
        <span
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: 16,
            color: "#ffffff",
            textShadow,
          }}
        >
          REC
        </span>
        <span
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: 16,
            color: "#ffd166",
            textShadow,
          }}
        >
          {`00:${String(elapsed).padStart(2, "0")}`}
        </span>
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: 18,
            color: "#ffffff",
            textShadow,
            letterSpacing: 2,
          }}
        >
          PIXEL VLOG <span style={{ color: "#ffd166" }}>#01</span>
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 15,
            color: "#cdd3e0",
            letterSpacing: 3,
            marginTop: 10,
            textShadow: "2px 2px 0 rgba(0,0,0,0.6)",
          }}
        >
          A 20-SECOND TRIP
        </div>
      </div>
    </div>
  );
};

const locations = [
  {
    from: 0,
    to: 208,
    place: "DANAU SENJA",
    meta: "1.240 M • 07 NOV 2026",
    color: "#ffd166",
  },
  {
    from: 208,
    to: 398,
    place: "CAMP AREA",
    meta: "MALAM HARI KE-1 • 22:14",
    color: "#8fd3ff",
  },
  {
    from: 398,
    to: 620,
    place: "PUNCAK FAJAR",
    meta: "05:42 • 08 NOV 2026",
    color: "#ffb0a0",
  },
];

const LocationHud: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ position: "absolute", left: 40, bottom: 34 }}>
      {locations.map((location) => {
        const opacity = interpolate(
          frame,
          [location.from, location.from + 12, location.to - 12, location.to],
          [0, 1, 1, 0],
          clamp,
        );
        return (
          <div
            key={location.place}
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity,
              transform: `translateY(${(1 - opacity) * 8}px)`,
            }}
          >
            <PixelPin color={location.color} />
            <div>
              <div
                style={{
                  fontFamily: PIXEL_FONT,
                  fontSize: 19,
                  color: "#ffffff",
                  textShadow: "3px 3px 0 rgba(0,0,0,0.7)",
                  whiteSpace: "nowrap",
                }}
              >
                {location.place}
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 17,
                  color: "#cdd3e0",
                  letterSpacing: 1.5,
                  marginTop: 9,
                  textShadow: "2px 2px 0 rgba(0,0,0,0.7)",
                  whiteSpace: "nowrap",
                }}
              >
                {location.meta}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const captions = [
  { from: 36, to: 112, text: "Akhirnya sampai juga!" },
  { from: 118, to: 192, text: "Senja di danau ini luar biasa." },
  { from: 232, to: 316, text: "Malam pertama camping sendirian." },
  { from: 322, to: 388, text: "Api unggun + langit berbintang." },
  { from: 428, to: 500, text: "Fajar pertama sebelum pulang." },
];

const Captions: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      {captions.map((caption) => {
        const opacity = interpolate(
          frame,
          [caption.from, caption.from + 10, caption.to - 10, caption.to],
          [0, 1, 1, 0],
          clamp,
        );
        const y = interpolate(frame, [caption.from, caption.from + 10], [12, 0], clamp);

        return (
          <div
            key={caption.text}
            style={{
              position: "absolute",
              bottom: 112,
              left: "50%",
              transform: `translateX(-50%) translateY(${y}px)`,
              opacity,
              background: "rgba(4,5,14,0.72)",
              border: "2px solid rgba(255,255,255,0.16)",
              boxShadow: "6px 6px 0 rgba(0,0,0,0.35)",
              padding: "15px 24px",
              maxWidth: 1200,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                fontFamily: PIXEL_FONT,
                fontSize: 18,
                lineHeight: 1.6,
                color: "#ffffff",
                textShadow: "3px 3px 0 rgba(0,0,0,0.6)",
              }}
            >
              {caption.text}
            </span>
          </div>
        );
      })}
    </>
  );
};

const IntroTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [6, 24, 72, 94], [0, 1, 1, 0], clamp);
  const y = interpolate(frame, [6, 30], [26, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "31%",
        width: "100%",
        textAlign: "center",
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div
        style={{
          fontFamily: PIXEL_FONT,
          fontSize: 64,
          letterSpacing: 4,
          color: "#ffffff",
          textShadow:
            "5px 5px 0 #7a2f5e, 10px 10px 0 rgba(0,0,0,0.35)",
        }}
      >
        PIXEL VLOG
      </div>
      <div
        style={{
          fontFamily: PIXEL_FONT,
          fontSize: 17,
          letterSpacing: 6,
          color: "#ffd166",
          marginTop: 26,
          textShadow: "3px 3px 0 rgba(0,0,0,0.6)",
        }}
      >
        EPISODE 01 — SENJA
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 10,
          marginTop: 26,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              background: i === 1 ? "#ffd166" : "#ffffff",
              opacity: 0.8,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const EndTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({
    frame: frame - 508,
    fps,
    config: { damping: 18, stiffness: 90, mass: 0.8 },
  });
  const opacity = interpolate(frame, [508, 526], [0, 1], clamp);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <div
        style={{
          background: "rgba(8,6,20,0.7)",
          border: "3px solid rgba(255,255,255,0.25)",
          boxShadow:
            "10px 10px 0 rgba(0,0,0,0.4), inset 0 0 0 3px rgba(255,209,102,0.12)",
          padding: "44px 60px",
          textAlign: "center",
          transform: `scale(${0.92 + Math.min(1, pop) * 0.08})`,
        }}
      >
        <div
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: 52,
            letterSpacing: 2,
            color: "#ffffff",
            textShadow: "4px 4px 0 #7a2f5e",
          }}
        >
          SAMPAI JUMPA!
        </div>
        <div
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: 14,
            color: "#ffd166",
            marginTop: 26,
            lineHeight: 2,
            letterSpacing: 1,
          }}
        >
          TERIMA KASIH SUDAH MENONTON
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 18,
            color: "#aab2c8",
            marginTop: 18,
            letterSpacing: 2,
          }}
        >
          PIXEL VLOG #01 • 20 DETIK
        </div>
      </div>
    </div>
  );
};

const Timeline: React.FC = () => {
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
        height: 6,
        background: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg,#ffd166,#f08a6a,#a35bd1)",
        }}
      />
    </div>
  );
};

const ScreenFx: React.FC = () => (
  <>
    <AbsoluteFill
      style={{
        background:
          "repeating-linear-gradient(to bottom, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1px, transparent 1px, transparent 5px)",
        opacity: 0.35,
        pointerEvents: "none",
      }}
    />
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 52%, rgba(2,3,10,0.55) 100%)",
        pointerEvents: "none",
      }}
    />
  </>
);

/* ------------------------------- Font loader ------------------------------ */

const usePixelFont = (): void => {
  const [handle] = useState(() => delayRender("Memuat font pixel"));

  useEffect(() => {
    const fontFace = new FontFace(
      "Press Start 2P",
      `url(${staticFile("videos/pixel-vlog-20-detik/fonts/PressStart2P-Regular.ttf")}) format("truetype")`,
    );

    fontFace
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        continueRender(handle);
      })
      .catch((error) => {
        console.error("Gagal memuat font pixel", error);
        continueRender(handle);
      });
  }, [handle]);
};

/* -------------------------------- Komposisi ------------------------------- */

export const PixelVlog: React.FC = () => {
  usePixelFont();
  const frame = useCurrentFrame();

  const sunsetOpacity = interpolate(
    frame,
    [0, 12, 196, 214],
    [0, 1, 1, 0],
    clamp,
  );
  const nightOpacity = interpolate(
    frame,
    [198, 216, 390, 408],
    [0, 1, 1, 0],
    clamp,
  );
  const dawnOpacity = interpolate(frame, [390, 410], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: "#070510" }}>
      <AbsoluteFill style={{ opacity: sunsetOpacity }}>
        <SunsetScene />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: nightOpacity }}>
        <NightScene offset={198} />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: dawnOpacity }}>
        <DawnScene offset={390} />
      </AbsoluteFill>

      <ScreenFx />
      <TopHud />
      <LocationHud />
      <Captions />
      <IntroTitle />
      <EndTitle />
      <Timeline />

      <Audio
        src={staticFile("videos/pixel-vlog-20-detik/audio/musik.wav")}
        volume={(f) =>
          interpolate(f, [0, 30, 560, 600], [0, 0.55, 0.55, 0], clamp)
        }
      />

      <Sequence durationInFrames={214}>
        <Audio
          src={staticFile(
            "videos/pixel-vlog-20-detik/audio/sunset-waves.wav",
          )}
          volume={(f) =>
            interpolate(f, [0, 18, 196, 214], [0, 0.32, 0.32, 0], clamp)
          }
        />
      </Sequence>

      <Sequence from={198} durationInFrames={210}>
        <Audio
          src={staticFile(
            "videos/pixel-vlog-20-detik/audio/night-campfire.wav",
          )}
          volume={(f) =>
            interpolate(f, [0, 18, 192, 210], [0, 0.38, 0.38, 0], clamp)
          }
        />
      </Sequence>

      <Sequence from={390} durationInFrames={210}>
        <Audio
          src={staticFile("videos/pixel-vlog-20-detik/audio/dawn-birds.wav")}
          volume={(f) =>
            interpolate(f, [0, 18, 192, 210], [0, 0.34, 0.34, 0], clamp)
          }
        />
      </Sequence>

      {[6, 508].map((from) => (
        <Sequence key={from} from={from} durationInFrames={30}>
          <Audio
            src={staticFile("audio/whoosh.wav")}
            volume={(f) =>
              interpolate(f, [0, 5, 24, 30], [0, 0.18, 0.18, 0], clamp)
            }
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const PixelVlogComposition: React.FC = () => (
  <Composition
    id="PixelVlog20Detik"
    component={PixelVlog}
    durationInFrames={600}
    fps={30}
    width={1920}
    height={1080}
  />
);

// A quick storyboard sketch for a shot: the framing (how big the subject is) and the camera move as arrows.

import { useId } from "react";
import type { Format, Move, Size } from "./model";

const DIMS: Record<Format, [number, number]> = { "9:16": [90, 160], "4:5": [100, 125], "16:9": [160, 90] };

/** A simple person silhouette: `top` is the top of the head, `h` the full height. */
function Figure({ cx, top, h }: { cx: number; top: number; h: number }) {
  const r = h * 0.075;
  const shoulders = top + r * 2.3;
  const hip = top + h * 0.53;
  const w = h * 0.27;
  return (
    <g className="figure">
      <circle cx={cx} cy={top + r} r={r} />
      <path d={`M${cx - w / 2} ${shoulders + r * 0.4} Q${cx - w / 2} ${shoulders} ${cx - w / 2 + r * 0.6} ${shoulders} H${cx + w / 2 - r * 0.6} Q${cx + w / 2} ${shoulders} ${cx + w / 2} ${shoulders + r * 0.4} L${cx + w * 0.42} ${hip} H${cx - w * 0.42} Z`} />
      <path d={`M${cx - w * 0.42} ${hip} L${cx - w * 0.36} ${top + h} H${cx - w * 0.08} L${cx} ${hip + h * 0.06} L${cx + w * 0.08} ${top + h} H${cx + w * 0.36} L${cx + w * 0.42} ${hip} Z`} />
      <path d={`M${cx - w / 2} ${shoulders + r * 0.4} L${cx - w * 0.68} ${hip + h * 0.02} M${cx + w / 2} ${shoulders + r * 0.4} L${cx + w * 0.68} ${hip + h * 0.02}`} strokeWidth={h * 0.06} strokeLinecap="round" fill="none" className="limb" />
    </g>
  );
}

function Subject({ size, W, H }: { size: Size; W: number; H: number }) {
  const cx = W / 2;
  switch (size) {
    case "wide":
      return (
        <>
          <path className="scene" d={`M0 ${H * 0.62} H${W}`} />
          <rect className="scene-fill" x={W * 0.06} y={H * 0.3} width={W * 0.2} height={H * 0.32} />
          <rect className="scene-fill" x={W * 0.7} y={H * 0.2} width={W * 0.24} height={H * 0.42} />
          <Figure cx={W * 0.45} top={H * 0.44} h={H * 0.26} />
        </>
      );
    case "full":
      return <Figure cx={cx} top={H * 0.1} h={H * 0.8} />;
    case "medium":
      return <Figure cx={cx} top={H * 0.12} h={H * 1.65} />;
    case "close":
      return <Figure cx={cx} top={H * 0.18} h={H * 3.2} />;
    case "detail": {
      const lines = [];
      for (let x = -H; x < W + H; x += 7) lines.push(<path key={x} className="weave" d={`M${x} 0 L${x + H} ${H}`} />);
      return (
        <>
          {lines}
          <path className="stitch" d={`M${W * 0.12} ${H * 0.72} H${W * 0.88}`} />
          <path className="star" d={starPath(cx, H * 0.42, Math.min(W, H) * 0.14)} />
        </>
      );
    }
    case "overhead": {
      const s = Math.min(W, H) * 0.42;
      const y = H / 2 - s * 0.55;
      return (
        <>
          <rect className="scene-fill" x={W * 0.06} y={H * 0.06} width={W * 0.88} height={H * 0.88} rx="4" />
          <path
            className="garment"
            d={`M${cx - s * 0.32} ${y} L${cx - s * 0.75} ${y + s * 0.28} L${cx - s * 0.55} ${y + s * 0.55} L${cx - s * 0.4} ${y + s * 0.45} V${y + s * 1.15} H${cx + s * 0.4} V${y + s * 0.45} L${cx + s * 0.55} ${y + s * 0.55} L${cx + s * 0.75} ${y + s * 0.28} L${cx + s * 0.32} ${y} Q${cx} ${y + s * 0.18} ${cx - s * 0.32} ${y} Z`}
          />
          <circle className="prop" cx={W * 0.2} cy={H * 0.8} r={Math.min(W, H) * 0.06} />
        </>
      );
    }
    case "low":
      return (
        <>
          <path className="scene" d={`M0 ${H * 0.92} H${W}`} />
          <path className="figure" d={`M${cx - W * 0.34} ${H} L${cx - W * 0.1} ${H * 0.45} H${cx + W * 0.1} L${cx + W * 0.34} ${H} Z`} />
          <path className="figure" d={`M${cx - W * 0.16} ${H * 0.47} L${cx - W * 0.09} ${H * 0.2} H${cx + W * 0.09} L${cx + W * 0.16} ${H * 0.47} Z`} />
          <circle className="figure" cx={cx} cy={H * 0.14} r={Math.min(W, H) * 0.06} />
        </>
      );
  }
}

function starPath(cx: number, cy: number, r: number) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.28 : r;
    pts.push(`${cx + Math.cos(a) * rr} ${cy + Math.sin(a) * rr}`);
  }
  return `M${pts.join(" L")} Z`;
}

function MoveMarks({ move, W, H, marker }: { move: Move; W: number; H: number; marker: string }) {
  const m = `url(#${marker})`;
  const cx = W / 2;
  const cy = H / 2;
  const d = Math.min(W, H);
  switch (move) {
    case "push":
      return (
        <g className="move">
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => (
            <path key={`${x}${y}`} d={`M${cx + x * W * 0.44} ${cy + y * H * 0.44} L${cx + x * W * 0.3} ${cy + y * H * 0.3}`} markerEnd={m} />
          ))}
        </g>
      );
    case "pull":
      return (
        <g className="move">
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => (
            <path key={`${x}${y}`} d={`M${cx + x * W * 0.26} ${cy + y * H * 0.26} L${cx + x * W * 0.42} ${cy + y * H * 0.42}`} markerEnd={m} />
          ))}
        </g>
      );
    case "pan":
      return <path className="move" d={`M${W * 0.12} ${H * 0.9} H${W * 0.86}`} markerEnd={m} />;
    case "tilt":
      return <path className="move" d={`M${W * 0.9} ${H * 0.12} V${H * 0.86}`} markerEnd={m} />;
    case "orbit":
      return <path className="move" d={`M${cx - d * 0.38} ${cy + d * 0.12} A${d * 0.4} ${d * 0.16} 0 1 0 ${cx + d * 0.36} ${cy + d * 0.2}`} markerEnd={m} />;
    case "follow":
      return <path className="move" d={`M${W * 0.12} ${H * 0.88} Q${cx} ${H * 0.78} ${W * 0.85} ${H * 0.86}`} markerEnd={m} />;
    case "lead":
      return (
        <g className="move">
          <path d={`M${cx - d * 0.12} ${H * 0.8} L${cx} ${H * 0.88} L${cx + d * 0.12} ${H * 0.8}`} />
          <path d={`M${cx - d * 0.12} ${H * 0.72} L${cx} ${H * 0.8} L${cx + d * 0.12} ${H * 0.72}`} />
        </g>
      );
    case "handheld":
      return <path className="move" d={`M${W * 0.1} ${H * 0.9} l${W * 0.08} -${H * 0.04} l${W * 0.08} ${H * 0.05} l${W * 0.08} -${H * 0.06} l${W * 0.08} ${H * 0.05} l${W * 0.08} -${H * 0.04} l${W * 0.08} ${H * 0.04}`} />;
    case "static":
      return (
        <g className="move thin">
          {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => {
            const px = x ? W * 0.92 : W * 0.08;
            const py = y ? H * 0.92 : H * 0.08;
            const sx = x ? -1 : 1;
            const sy = y ? -1 : 1;
            return <path key={`${x}${y}`} d={`M${px} ${py + sy * d * 0.08} V${py} H${px + sx * d * 0.08}`} />;
          })}
        </g>
      );
  }
}

export default function Frame({ size, move, format, className = "" }: { size: Size; move: Move; format: Format; className?: string }) {
  const [W, H] = DIMS[format];
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`frame ${className}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${size} shot, ${move}`}>
      <defs>
        <clipPath id={`c${id}`}>
          <rect width={W} height={H} rx="4" />
        </clipPath>
        <marker id={`m${id}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" className="arrowhead" />
        </marker>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect className="frame-bg" width={W} height={H} />
        <Subject size={size} W={W} H={H} />
        <path className="thirds" d={`M${W / 3} 0 V${H} M${(2 * W) / 3} 0 V${H} M0 ${H / 3} H${W} M0 ${(2 * H) / 3} H${W}`} />
      </g>
      <MoveMarks move={move} W={W} H={H} marker={`m${id}`} />
    </svg>
  );
}

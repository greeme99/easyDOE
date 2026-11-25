import React from 'react';
import { probit } from '../doeEngine';

const C = {
  primary: '#0052ff',
  primarySoft: '#3b82f6',
  up: '#05b169',
  down: '#cf202f',
  ink: '#0a0b0d',
  muted: '#7c828a',
  grid: '#eef0f3',
  bg: '#ffffff',
};

function niceRange(values, pad = 0.12) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return [0, 100];
  let min = Math.min(...valid);
  let max = Math.max(...valid);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  return [min - span * pad, max + span * pad];
}

function ticks(min, max, count = 5) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(min + (i / (count - 1)) * (max - min));
  }
  return arr;
}

// 1. Main Effects Plot (Multi-panel SVG)
export function MainEffectsSvg({ factors, runs, grandMean }) {
  const validRuns = runs.filter(r => !r.isCenter && Number.isFinite(parseFloat(r.y)));
  if (!validRuns.length) return <div className="text-sm text-[#7c828a] p-6 text-center">유효한 실험 데이터가 없습니다.</div>;

  const panelW = 200;
  const H = 220;
  const W = factors.length * panelW + 40;
  const padT = 32, padB = 42, padL = 48;

  const means = factors.map(f => {
    const lo = validRuns.filter(r => r.coded[f.symbol] === -1).map(r => parseFloat(r.y));
    const hi = validRuns.filter(r => r.coded[f.symbol] === 1).map(r => parseFloat(r.y));
    const mLo = lo.length ? lo.reduce((a, b) => a + b, 0) / lo.length : grandMean;
    const mHi = hi.length ? hi.reduce((a, b) => a + b, 0) / hi.length : grandMean;
    return { f, mLo, mHi };
  });

  const allY = means.flatMap(m => [m.mLo, m.mHi, grandMean]);
  const [yMin, yMax] = niceRange(allY, 0.18);
  const yToPx = y => padT + ((yMax - y) / (yMax - yMin)) * (H - padT - padB);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
      {ticks(yMin, yMax, 5).map((tv, i) => {
        const y = yToPx(tv);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - 14} y2={y} stroke={C.grid} strokeWidth="1" />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill={C.muted}>{tv.toFixed(1)}</text>
          </g>
        );
      })}
      <line x1={padL} y1={yToPx(grandMean)} x2={W - 14} y2={yToPx(grandMean)} stroke={C.down} strokeWidth="1.2" strokeDasharray="4 4" />
      <text x={W - 16} y={yToPx(grandMean) - 4} textAnchor="end" fontSize="9.5" fill={C.down} fontWeight="600">
        전체 평균 {grandMean.toFixed(2)}
      </text>

      {means.map((m, idx) => {
        const x0 = padL + idx * panelW;
        const x1 = x0 + panelW * 0.28;
        const x2 = x0 + panelW * 0.72;
        const y1 = yToPx(m.mLo);
        const y2 = yToPx(m.mHi);
        return (
          <g key={m.f.symbol}>
            <rect x={x0 + 6} y={padT} width={panelW - 14} height={H - padT - padB} fill="none" stroke={C.grid} />
            <text x={(x1 + x2) / 2} y={20} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink}>
              {m.f.symbol}: {m.f.name}
            </text>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.primary} strokeWidth="2.5" />
            <circle cx={x1} cy={y1} r="4.5" fill={C.primary} />
            <circle cx={x2} cy={y2} r="4.5" fill={C.primary} />
            <text x={x1} y={y1 - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill={C.ink}>{m.mLo.toFixed(2)}</text>
            <text x={x2} y={y2 - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill={C.ink}>{m.mHi.toFixed(2)}</text>
            <text x={x1} y={H - 22} textAnchor="middle" fontSize="10" fill={C.muted}>{m.f.lowVal}</text>
            <text x={x2} y={H - 22} textAnchor="middle" fontSize="10" fill={C.muted}>{m.f.highVal}</text>
          </g>
        );
      })}
    </svg>
  );
}

// 2. Interaction Plot Matrix (SVG)
export function InteractionMatrixSvg({ factors, runs }) {
  const validRuns = runs.filter(r => !r.isCenter && Number.isFinite(parseFloat(r.y)));
  if (!validRuns.length) return null;

  const pairs = [];
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      pairs.push([factors[i], factors[j]]);
    }
  }
  const cols = Math.min(3, pairs.length);
  const rows = Math.ceil(pairs.length / cols);
  const cellW = 260, cellH = 200;
  const W = cols * cellW, H = rows * cellH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
      {pairs.map(([f1, f2], idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const ox = col * cellW, oy = row * cellH;
        const meanPair = (v1, v2) => {
          const sub = validRuns.filter(r => r.coded[f1.symbol] === v1 && r.coded[f2.symbol] === v2).map(r => parseFloat(r.y));
          return sub.length ? sub.reduce((a, b) => a + b, 0) / sub.length : 0;
        };
        const d11 = meanPair(-1, -1), d21 = meanPair(1, -1);
        const d12 = meanPair(-1, 1), d22 = meanPair(1, 1);
        const [yMin, yMax] = niceRange([d11, d21, d12, d22], 0.22);
        const px1 = ox + 62, px2 = ox + cellW - 36;
        const pyTop = oy + 38, pyBot = oy + cellH - 42;
        const yToPx = y => pyTop + ((yMax - y) / (yMax - yMin)) * (pyBot - pyTop);

        return (
          <g key={`${f1.symbol}${f2.symbol}`}>
            <rect x={ox + 8} y={oy + 8} width={cellW - 16} height={cellH - 16} rx="12" fill="#f7f7f7" stroke={C.grid} />
            <text x={ox + cellW / 2} y={oy + 24} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink}>
              {f1.symbol} × {f2.symbol} ({f1.name} × {f2.name})
            </text>
            <line x1={ox + 44} y1={pyTop} x2={ox + 44} y2={pyBot} stroke={C.grid} />
            <line x1={ox + 44} y1={pyBot} x2={ox + cellW - 20} y2={pyBot} stroke={C.grid} />
            <text x={ox + 40} y={pyTop + 4} textAnchor="end" fontSize="9.5" fill={C.muted}>{yMax.toFixed(1)}</text>
            <text x={ox + 40} y={pyBot} textAnchor="end" fontSize="9.5" fill={C.muted}>{yMin.toFixed(1)}</text>

            <line x1={px1} y1={yToPx(d11)} x2={px2} y2={yToPx(d21)} stroke={C.primary} strokeWidth="2.3" />
            <circle cx={px1} cy={yToPx(d11)} r="4" fill={C.primary} />
            <circle cx={px2} cy={yToPx(d21)} r="4" fill={C.primary} />

            <line x1={px1} y1={yToPx(d12)} x2={px2} y2={yToPx(d22)} stroke={C.up} strokeWidth="2.3" strokeDasharray="5 3" />
            <circle cx={px1} cy={yToPx(d12)} r="4" fill={C.up} />
            <circle cx={px2} cy={yToPx(d22)} r="4" fill={C.up} />

            <text x={px1} y={pyBot + 14} textAnchor="middle" fontSize="9.5" fill={C.muted}>{f1.symbol}:{f1.lowVal}</text>
            <text x={px2} y={pyBot + 14} textAnchor="middle" fontSize="9.5" fill={C.muted}>{f1.symbol}:{f1.highVal}</text>

            <text x={ox + cellW / 2} y={oy + cellH - 12} textAnchor="middle" fontSize="9" fill={C.ink}>
              <tspan fill={C.primary}>● {f2.symbol}={f2.lowVal}</tspan>
              <tspan dx="10" fill={C.up}>◆ {f2.symbol}={f2.highVal}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 3. 3D Wireframe Cube Plot (First 3 factors)
export function CubePlotSvg({ factors, runs }) {
  if (factors.length < 3) return null;
  const validRuns = runs.filter(r => !r.isCenter && Number.isFinite(parseFloat(r.y)));
  if (!validRuns.length) return null;

  const [fA, fB, fC] = factors;
  const cornerMean = (a, b, c) => {
    const sub = validRuns.filter(r => r.coded[fA.symbol] === a && r.coded[fB.symbol] === b && r.coded[fC.symbol] === c)
      .map(r => parseFloat(r.y));
    return sub.length ? sub.reduce((s, v) => s + v, 0) / sub.length : null;
  };

  const front = { x0: 110, y0: 210, w: 170, h: 130 };
  const dx = 75, dy = -52;
  const pts = {
    '---': { x: front.x0, y: front.y0, val: cornerMean(-1, -1, -1) },
    '+--': { x: front.x0 + front.w, y: front.y0, val: cornerMean(1, -1, -1) },
    '-+-': { x: front.x0 + dx, y: front.y0 + dy, val: cornerMean(-1, 1, -1) },
    '++-': { x: front.x0 + front.w + dx, y: front.y0 + dy, val: cornerMean(1, 1, -1) },
    '--+': { x: front.x0, y: front.y0 - front.h, val: cornerMean(-1, -1, 1) },
    '+-+': { x: front.x0 + front.w, y: front.y0 - front.h, val: cornerMean(1, -1, 1) },
    '-++': { x: front.x0 + dx, y: front.y0 - front.h + dy, val: cornerMean(-1, 1, 1) },
    '+++': { x: front.x0 + front.w + dx, y: front.y0 - front.h + dy, val: cornerMean(1, 1, 1) },
  };

  const maxVal = Math.max(...Object.values(pts).map(p => p.val ?? -Infinity));
  const edges = [
    ['---', '+--'], ['--+', '+-+'], ['---', '--+'], ['+--', '+-+'],
    ['-+-', '++-'], ['-++', '+++'], ['-+-', '-++'], ['++-', '+++'],
    ['---', '-+-'], ['+--', '++-'], ['--+', '-++'], ['+-+', '+++'],
  ];

  return (
    <svg viewBox="0 0 460 270" className="w-full max-w-[520px] h-auto bg-white rounded-2xl border border-[#dee1e6]">
      {edges.map(([k1, k2], i) => {
        const isBack = (k1 === '---' && k2 === '-+-') || (k1 === '-+-' && k2 === '++-') || (k1 === '-+-' && k2 === '-++');
        return (
          <line
            key={i}
            x1={pts[k1].x} y1={pts[k1].y}
            x2={pts[k2].x} y2={pts[k2].y}
            stroke={isBack ? '#a8acb3' : C.ink}
            strokeWidth={isBack ? '1.3' : '1.8'}
            strokeDasharray={isBack ? '4 3' : undefined}
          />
        );
      })}
      {Object.entries(pts).map(([k, p]) => {
        const isMax = p.val !== null && Math.abs(p.val - maxVal) < 1e-6;
        return (
          <g key={k}>
            <circle cx={p.x} cy={p.y} r={isMax ? '7' : '5'} fill={isMax ? C.primary : C.ink} stroke="#fff" strokeWidth="1.5" />
            <rect x={p.x - 24} y={p.y - 25} width="48" height="17" rx="8" fill={isMax ? C.primary : C.ink} />
            <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff">
              {p.val !== null ? p.val.toFixed(2) : '-'}
            </text>
          </g>
        );
      })}
      <text x={front.x0 + front.w / 2} y={front.y0 + 24} textAnchor="middle" fontSize="11" fontWeight="600" fill={C.ink}>
        {fA.symbol}: {fA.name} ({fA.lowVal} → {fA.highVal})
      </text>
      <text x={front.x0 + front.w + dx + 12} y={front.y0 + dy / 2 + 12} textAnchor="start" fontSize="10.5" fontWeight="600" fill={C.ink}>
        {fB.symbol}: {fB.name}
      </text>
      <text x={front.x0 - 16} y={front.y0 - front.h / 2} textAnchor="end" fontSize="10.5" fontWeight="600" fill={C.ink}>
        {fC.symbol}: {fC.name}
      </text>
    </svg>
  );
}

// 4. Pareto Chart of Standardized Effects (|T| or |Effect|)
export function ParetoSvg({ termResults, tCrit }) {
  const active = termResults.filter(t => !t.isPooled);
  if (!active.length) return null;
  const useT = active.some(t => t.tVal !== null);
  const items = [...active]
    .map(t => ({ ...t, mag: useT ? Math.abs(t.tVal || 0) : Math.abs(t.effect || 0) }))
    .sort((a, b) => b.mag - a.mag);

  const maxVal = Math.max(...items.map(i => i.mag), useT && tCrit ? tCrit * 1.15 : 1);
  const rowH = 30;
  const padL = 110, padR = 45, padT = 26, padB = 34;
  const W = 520, H = padT + items.length * rowH + padB;
  const barW = W - padL - padR;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
      <text x={padL + barW / 2} y={16} textAnchor="middle" fontSize="11" fontWeight="600" fill={C.ink}>
        {useT ? '표준화 효과 파레토도 (|T|)' : '효과 크기 파레토도 (|Effect|)'}
      </text>
      {items.map((it, idx) => {
        const y = padT + idx * rowH + 4;
        const w = (it.mag / maxVal) * barW;
        const isSig = useT && tCrit ? it.mag >= tCrit : true;
        return (
          <g key={it.key}>
            <text x={padL - 8} y={y + 15} textAnchor="end" fontSize="10.5" fontWeight="600" fill={C.ink}>{it.key}</text>
            <rect x={padL} y={y + 2} width={Math.max(2, w)} height={18} rx="4" fill={isSig ? C.primary : '#a8acb3'} />
            <text x={padL + w + 6} y={y + 15} fontSize="10" fontWeight="600" fill={C.ink}>{it.mag.toFixed(2)}</text>
          </g>
        );
      })}
      {useT && tCrit && (
        <g>
          <line
            x1={padL + (tCrit / maxVal) * barW} y1={padT}
            x2={padL + (tCrit / maxVal) * barW} y2={H - padB}
            stroke={C.down} strokeWidth="1.6" strokeDasharray="5 3"
          />
          <text x={padL + (tCrit / maxVal) * barW + 4} y={H - padB + 14} fontSize="10" fontWeight="600" fill={C.down}>
            기준선 t = {tCrit.toFixed(2)}
          </text>
        </g>
      )}
    </svg>
  );
}

// 5. Normal Probability Plot (Effects or Residuals) with Percent Y-Axis
export function NormalProbSvg({ points, title = '정규확률도', xLabel = '값' }) {
  if (!points || !points.length) return null;
  const sorted = [...points].sort((a, b) => a.val - b.val);
  const n = sorted.length;
  const pts = sorted.map((p, i) => {
    const prob = (i + 1 - 0.375) / (n + 0.25);
    return { ...p, z: probit(prob) };
  });
  const [xMin, xMax] = niceRange(pts.map(p => p.val), 0.16);
  const yMin = -2.5, yMax = 2.5;
  const W = 460, H = 260, padL = 52, padR = 24, padT = 28, padB = 38;
  const xPx = v => padL + ((v - xMin) / (xMax - xMin)) * (W - padL - padR);
  const yPx = z => padT + ((yMax - z) / (yMax - yMin)) * (H - padT - padB);

  const pctTicks = [
    { p: 0.01, lbl: '1%' },
    { p: 0.1, lbl: '10%' },
    { p: 0.5, lbl: '50%' },
    { p: 0.9, lbl: '90%' },
    { p: 0.99, lbl: '99%' },
  ];

  const mean = pts.reduce((s, p) => s + p.val, 0) / n;
  const sd = Math.sqrt(pts.reduce((s, p) => s + (p.val - mean) ** 2, 0) / Math.max(1, n - 1)) || 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
      <text x={W / 2} y={18} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink}>{title}</text>
      {pctTicks.map(pt => {
        const z = probit(pt.p);
        return (
          <g key={pt.lbl}>
            <line x1={padL} y1={yPx(z)} x2={W - padR} y2={yPx(z)} stroke={C.grid} />
            <text x={padL - 6} y={yPx(z) + 3} textAnchor="end" fontSize="9.5" fill={C.muted}>{pt.lbl}</text>
          </g>
        );
      })}
      <line
        x1={xPx(mean - 2.2 * sd)} y1={yPx(-2.2)}
        x2={xPx(mean + 2.2 * sd)} y2={yPx(2.2)}
        stroke={C.down} strokeWidth="1.4" strokeDasharray="4 3"
      />
      {pts.map((p, idx) => (
        <g key={idx}>
          {p.sig ? (
            <rect x={xPx(p.val) - 4} y={yPx(p.z) - 4} width="8" height="8" fill={C.down} />
          ) : (
            <circle cx={xPx(p.val)} cy={yPx(p.z)} r="4" fill={C.primary} />
          )}
          {p.label && (
            <text x={xPx(p.val) + 6} y={yPx(p.z) + 3} fontSize="9.5" fill={C.ink} fontWeight={p.sig ? '600' : '400'}>
              {p.label}
            </text>
          )}
        </g>
      ))}
      <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill={C.muted}>{xLabel}</text>
    </svg>
  );
}

// 6. 4-in-1 Residual Diagnostic Grid (SVG)
export function ResidualFourInOneSvg({ observations }) {
  if (!observations || !observations.length) return null;
  const W = 440, H = 230, padL = 48, padR = 20, padT = 28, padB = 34;

  const [fMin, fMax] = niceRange(observations.map(o => o.yHat), 0.12);
  const [rMin, rMax] = niceRange(observations.map(o => o.resid).concat([0]), 0.18);
  const fx = v => padL + ((v - fMin) / (fMax - fMin)) * (W - padL - padR);
  const ry = v => padT + ((rMax - v) / (rMax - rMin)) * (H - padT - padB);

  const bins = 6;
  const minR = Math.min(...observations.map(o => o.resid));
  const maxR = Math.max(...observations.map(o => o.resid));
  const span = Math.max(0.1, maxR - minR);
  const binW = span / bins;
  const counts = new Array(bins).fill(0);
  observations.forEach(o => {
    const idx = Math.min(bins - 1, Math.floor((o.resid - minR) / binW));
    counts[Math.max(0, idx)]++;
  });
  const maxC = Math.max(1, ...counts);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <NormalProbSvg
        points={observations.map(o => ({ val: o.resid, sig: Math.abs(o.stdResid) > 2 }))}
        title="① 잔차의 정규확률도"
        xLabel="잔차 (Residual)"
      />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
        <text x={W / 2} y={18} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink}>② 잔차 대 적합치 (Residuals vs Fits)</text>
        <line x1={padL} y1={ry(0)} x2={W - padR} y2={ry(0)} stroke={C.down} strokeDasharray="4 3" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke={C.grid} />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={C.grid} />
        <text x={padL - 5} y={ry(rMax) + 4} textAnchor="end" fontSize="9.5" fill={C.muted}>{rMax.toFixed(1)}</text>
        <text x={padL - 5} y={ry(rMin)} textAnchor="end" fontSize="9.5" fill={C.muted}>{rMin.toFixed(1)}</text>
        {observations.map((o, i) => (
          <circle key={i} cx={fx(o.yHat)} cy={ry(o.resid)} r="4" fill={C.primary} />
        ))}
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill={C.muted}>적합치 (Fitted Value)</text>
      </svg>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
        <text x={W / 2} y={18} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink}>③ 잔차 히스토그램 (Histogram)</text>
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={C.grid} />
        {counts.map((c, idx) => {
          const bw = (W - padL - padR) / bins;
          const bh = (c / maxC) * (H - padT - padB);
          const x = padL + idx * bw + 4;
          const y = H - padB - bh;
          return (
            <g key={idx}>
              <rect x={x} y={y} width={bw - 8} height={bh} rx="4" fill={C.primary} />
              <text x={x + (bw - 8) / 2} y={H - padB + 12} textAnchor="middle" fontSize="9" fill={C.muted}>
                {(minR + (idx + 0.5) * binW).toFixed(1)}
              </text>
            </g>
          );
        })}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize="10" fill={C.muted}>잔차 구간</text>
      </svg>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
        <text x={W / 2} y={18} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink}>④ 잔차 대 관측순서 (Residuals vs Order)</text>
        <line x1={padL} y1={ry(0)} x2={W - padR} y2={ry(0)} stroke={C.down} strokeDasharray="4 3" />
        <polyline
          fill="none"
          stroke={C.primary}
          strokeWidth="1.8"
          points={observations.map((o, i) => {
            const x = padL + (i / Math.max(1, observations.length - 1)) * (W - padL - padR);
            return `${x},${ry(o.resid)}`;
          }).join(' ')}
        />
        {observations.map((o, i) => {
          const x = padL + (i / Math.max(1, observations.length - 1)) * (W - padL - padR);
          return <circle key={i} cx={x} cy={ry(o.resid)} r="3.5" fill={C.ink} />;
        })}
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize="10" fill={C.muted}>관측 순서 (Run Order)</text>
      </svg>
    </div>
  );
}

// 7. Confirmation Run Chart + Boxplot
export function ConfirmationChartsSvg({ values, mu0, tResult }) {
  if (!values || !values.length) return null;
  const W = 440, H = 220, padL = 46, padR = 20, padT = 26, padB = 34;
  const [yMin, yMax] = niceRange([...values, mu0], 0.16);
  const yPx = v => padT + ((yMax - v) / (yMax - yMin)) * (H - padT - padB);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
        <text x={W / 2} y={18} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink}>회차별 재현 실험 측정값</text>
        <line x1={padL} y1={yPx(mu0)} x2={W - padR} y2={yPx(mu0)} stroke={C.down} strokeDasharray="5 3" strokeWidth="1.5" />
        <line x1={padL} y1={yPx(mean)} x2={W - padR} y2={yPx(mean)} stroke={C.up} strokeWidth="1.5" />
        <polyline
          fill="none"
          stroke={C.primary}
          strokeWidth="1.6"
          points={values.map((v, i) => `${padL + (i / Math.max(1, values.length - 1)) * (W - padL - padR)},${yPx(v)}`).join(' ')}
        />
        {values.map((v, i) => (
          <circle key={i} cx={padL + (i / Math.max(1, values.length - 1)) * (W - padL - padR)} cy={yPx(v)} r="3.2" fill={C.primary} />
        ))}
        <text x={padL - 5} y={yPx(yMax) + 4} textAnchor="end" fontSize="9.5" fill={C.muted}>{yMax.toFixed(1)}</text>
        <text x={padL - 5} y={yPx(yMin)} textAnchor="end" fontSize="9.5" fill={C.muted}>{yMin.toFixed(1)}</text>
        <text x={W - padR} y={H - 8} textAnchor="end" fontSize="9.5" fill={C.ink}>
          <tspan fill={C.down}>-- 예측값 {mu0.toFixed(2)}</tspan>
          <tspan dx="10" fill={C.up}>— 실측 평균 {mean.toFixed(2)}</tspan>
        </text>
      </svg>

      {tResult && (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
          <text x={W / 2} y={18} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink}>재현 실험 상자 그림 및 95% 신뢰구간 vs H₀</text>
          {(() => {
            const [xMin, xMax] = niceRange([tResult.min, tResult.max, mu0], 0.18);
            const xPx = v => padL + ((v - xMin) / (xMax - xMin)) * (W - padL - padR);
            const midY = H / 2;
            return (
              <g>
                <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={C.grid} />
                <line x1={xPx(tResult.min)} y1={midY} x2={xPx(tResult.max)} y2={midY} stroke={C.ink} strokeWidth="1.5" />
                <rect x={xPx(tResult.q1)} y={midY - 22} width={Math.max(4, xPx(tResult.q3) - xPx(tResult.q1))} height="44" fill="#eef0f3" stroke={C.primary} strokeWidth="1.8" rx="6" />
                <line x1={xPx(tResult.median)} y1={midY - 22} x2={xPx(tResult.median)} y2={midY + 22} stroke={C.ink} strokeWidth="2" />
                <line x1={xPx(tResult.ciLow)} y1={midY + 38} x2={xPx(tResult.ciHigh)} y2={midY + 38} stroke={C.up} strokeWidth="3" />
                <circle cx={xPx(tResult.mean)} cy={midY + 38} r="4.5" fill={C.up} />
                <line x1={xPx(mu0)} y1={padT + 6} x2={xPx(mu0)} y2={H - padB} stroke={C.down} strokeWidth="2" strokeDasharray="4 3" />
                <text x={xPx(mu0)} y={padT + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={C.down}>H₀={mu0.toFixed(2)}</text>
                <text x={xPx(tResult.min)} y={H - padB + 14} textAnchor="middle" fontSize="9.5" fill={C.muted}>{tResult.min.toFixed(1)}</text>
                <text x={xPx(tResult.max)} y={H - padB + 14} textAnchor="middle" fontSize="9.5" fill={C.muted}>{tResult.max.toFixed(1)}</text>
              </g>
            );
          })()}
        </svg>
      )}
    </div>
  );
}

// 8. Confirmation Histogram SVG (with Predicted Y and Sample Mean lines)
export function ConfirmationHistogramSvg({ values, mu0 }) {
  if (!values || values.length < 2) return null;
  const W = 440, H = 220, padL = 42, padR = 20, padT = 28, padB = 34;
  const minV = Math.min(...values, mu0);
  const maxV = Math.max(...values, mu0);
  const span = Math.max(0.2, maxV - minV);
  const bins = 7;
  const binW = span / bins;
  const counts = new Array(bins).fill(0);
  values.forEach(v => {
    const idx = Math.min(bins - 1, Math.floor((v - minV) / binW));
    counts[Math.max(0, idx)]++;
  });
  const maxC = Math.max(1, ...counts);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const xPx = v => padL + ((v - minV) / span) * (W - padL - padR);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-white rounded-2xl border border-[#dee1e6]">
      <text x={W / 2} y={18} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={C.ink}>재현 실험 측정값 히스토그램</text>
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={C.grid} />
      {counts.map((c, idx) => {
        const bw = (W - padL - padR) / bins;
        const bh = (c / maxC) * (H - padT - padB);
        const x = padL + idx * bw + 3;
        const y = H - padB - bh;
        return (
          <g key={idx}>
            <rect x={x} y={y} width={bw - 6} height={bh} rx="4" fill={C.primary} opacity="0.85" />
            <text x={x + (bw - 6) / 2} y={H - padB + 13} textAnchor="middle" fontSize="9" fill={C.muted}>
              {(minV + (idx + 0.5) * binW).toFixed(1)}
            </text>
          </g>
        );
      })}
      <line x1={xPx(mu0)} y1={padT} x2={xPx(mu0)} y2={H - padB} stroke={C.down} strokeWidth="1.8" strokeDasharray="4 3" />
      <line x1={xPx(mean)} y1={padT} x2={xPx(mean)} y2={H - padB} stroke={C.up} strokeWidth="1.8" />
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize="9" fill={C.ink}>
        <tspan fill={C.down}>-- 예측 Ŷ={mu0.toFixed(2)}</tspan>
        <tspan dx="8" fill={C.up}>— 평균={mean.toFixed(2)}</tspan>
      </text>
    </svg>
  );
}

import React, { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Zap, RotateCcw, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { codedToActualVal, optimizeResponse, predictFromModel, predictionIntervals } from '../doeEngine';

export default function Step08Optimizer({ project, updateProject, reducedAnalysis, onPrev, onNext }) {
  const { design, optimizer } = project;
  const [showFixed, setShowFixed] = useState(false);
  const [showCI, setShowCI] = useState(false);

  const autoResult = useMemo(() => {
    if (!reducedAnalysis) return null;
    return optimizeResponse({
      factors: design.factors,
      analysis: reducedAnalysis,
      goal: optimizer.goal,
      targetVal: optimizer.targetVal,
      lowerBound: optimizer.lowerBound,
      upperBound: optimizer.upperBound,
      weight: optimizer.weight,
      fixedFactors: optimizer.fixedFactors || {},
    });
  }, [reducedAnalysis, design.factors, optimizer.goal, optimizer.targetVal, optimizer.lowerBound, optimizer.upperBound, optimizer.weight, optimizer.fixedFactors]);

  const currentCoded = optimizer.selectedCoded?.length === design.factors.length
    ? optimizer.selectedCoded
    : (autoResult?.coded || design.factors.map(() => 0));

  const intervals = useMemo(
    () => predictionIntervals(reducedAnalysis, currentCoded),
    [reducedAnalysis, currentCoded]
  );

  if (!reducedAnalysis) {
    return (
      <div className="doe-card text-center py-12">
        <p className="text-[#7c828a] mb-4">분석 가능한 데이터가 부족합니다.</p>
        <button onClick={onPrev} className="doe-btn doe-btn-secondary">← 이전 단계</button>
      </div>
    );
  }

  const updateOpt = (patch) => updateProject({ optimizer: { ...optimizer, ...patch } });

  const handleFindBest = () => {
    if (autoResult) updateOpt({ selectedCoded: autoResult.coded });
  };

  const setSliderVal = (idx, val) => {
    const next = [...currentCoded];
    next[idx] = parseFloat(val);
    updateOpt({ selectedCoded: next });
  };

  const diffFromTarget = optimizer.goal === 'target' ? intervals.yHat - optimizer.targetVal : 0;

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">RESPONSE OPTIMIZATION / 08</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">8단계 · 반응 최적화</h2>
        <p className="text-sm text-[#a8acb3]">망대·망소·망목 목표와 탐색 범위를 설정하고, 실시간 시뮬레이터로 최적 공정 조건과 95% 신뢰구간을 산출합니다.</p>
      </div>

      {/* Goal Settings */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#0a0b0d] mb-4">최적화 목표 설정</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#7c828a] mb-1">목표 유형</label>
            <select value={optimizer.goal} onChange={e => updateOpt({ goal: e.target.value })} className="doe-input w-full">
              <option value="target">망목 · 목표값 맞추기</option>
              <option value="maximize">망대 · 크게 할수록 좋음</option>
              <option value="minimize">망소 · 작게 할수록 좋음</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#7c828a] mb-1">반응 하한 (Lower)</label>
            <input type="number" step="any" value={optimizer.lowerBound} onChange={e => updateOpt({ lowerBound: parseFloat(e.target.value) || 0 })} className="doe-input w-full font-mono-num" />
          </div>
          {optimizer.goal === 'target' && (
            <div>
              <label className="block text-xs font-semibold text-[#7c828a] mb-1">목표값 (Target)</label>
              <input type="number" step="any" value={optimizer.targetVal} onChange={e => updateOpt({ targetVal: parseFloat(e.target.value) || 0 })} className="doe-input w-full font-mono-num font-bold text-[#0052ff]" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#7c828a] mb-1">반응 상한 (Upper)</label>
            <input type="number" step="any" value={optimizer.upperBound} onChange={e => updateOpt({ upperBound: parseFloat(e.target.value) || 0 })} className="doe-input w-full font-mono-num" />
          </div>
        </div>

        <button onClick={() => setShowFixed(v => !v)} className="doe-btn doe-btn-secondary text-xs">
          {showFixed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          고정 인자 및 만족도 가중치 설정
        </button>

        {showFixed && (
          <div className="mt-4 p-4 rounded-lg bg-[#f7f7f7] border border-[#dee1e6] space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-[#0a0b0d]">만족도 가중치 (d weight):</label>
              <input
                type="number"
                min={0.1}
                max={10}
                step={0.1}
                value={optimizer.weight}
                onChange={e => updateOpt({ weight: parseFloat(e.target.value) || 1 })}
                className="doe-input w-24 font-mono-num"
              />
            </div>
            <div className="doe-table-wrap">
              <table className="doe-table">
                <thead>
                  <tr>
                    <th>인자</th>
                    <th>실제 실험 수준</th>
                    <th>인자 고정</th>
                    <th>고정 코드값 (−1 ~ +1)</th>
                  </tr>
                </thead>
                <tbody>
                  {design.factors.map(f => {
                    const cfg = optimizer.fixedFactors?.[f.symbol] || { fixed: false, codedVal: 0 };
                    return (
                      <tr key={f.symbol}>
                        <td className="font-semibold">{f.symbol} · {f.name}</td>
                        <td className="font-mono-num">{f.lowVal} ~ {f.highVal} {f.unit}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!cfg.fixed}
                            onChange={e => updateOpt({
                              fixedFactors: { ...optimizer.fixedFactors, [f.symbol]: { ...cfg, fixed: e.target.checked } }
                            })}
                            className="accent-[#0052ff] w-4 h-4"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={-1}
                            max={1}
                            step={0.05}
                            disabled={!cfg.fixed}
                            value={cfg.codedVal ?? 0}
                            onChange={e => updateOpt({
                              fixedFactors: { ...optimizer.fixedFactors, [f.symbol]: { ...cfg, codedVal: parseFloat(e.target.value) || 0 } }
                            })}
                            className="doe-input w-24 font-mono-num text-center"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Simulator */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dee1e6] pb-3 mb-4">
          <h3 className="font-editorial text-lg text-[#0a0b0d]">최적화 예측 시뮬레이터</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleFindBest} className="doe-btn doe-btn-secondary text-xs">
              <RotateCcw size={14} /> 자동 탐색 최적 조건으로 되돌리기
            </button>
            <button onClick={handleFindBest} className="doe-btn doe-btn-primary text-xs">
              <Zap size={14} /> 최적 조건 찾기
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {design.factors.map((f, idx) => {
            const xVal = currentCoded[idx] ?? 0;
            const actVal = codedToActualVal(f, xVal);
            // Mini curve points
            const curvePts = [-1, -0.5, 0, 0.5, 1].map(xv => {
              const vec = [...currentCoded];
              vec[idx] = xv;
              return { x: xv, y: predictFromModel(reducedAnalysis, vec) };
            });
            const ys = curvePts.map(p => p.y);
            const yMin = Math.min(...ys) - 1, yMax = Math.max(...ys) + 1;
            const px = x => 15 + ((x + 1) / 2) * 170;
            const py = y => 12 + ((yMax - y) / Math.max(0.1, yMax - yMin)) * 56;

            return (
              <div key={f.symbol} className="p-4 rounded-lg bg-[#ffffff] border border-[#dee1e6]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-[#0a0b0d]">{f.symbol} · {f.name}</span>
                  <span className="font-mono-num text-xs font-bold text-[#05b169]">
                    {actVal} {f.unit !== '-' ? f.unit : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={f.type === 'categorical' ? 2 : 0.01}
                  value={xVal}
                  onChange={e => setSliderVal(idx, e.target.value)}
                  className="doe-slider mb-2"
                />
                <div className="flex justify-between text-[11px] text-[#7c828a] font-mono-num mb-2">
                  <span>{f.lowVal} (−1)</span>
                  <span>x={xVal.toFixed(2)}</span>
                  <span>{f.highVal} (+1)</span>
                </div>
                <svg viewBox="0 0 200 80" className="w-full h-16 bg-white rounded border border-[#eef0f3]">
                  <polyline
                    fill="none"
                    stroke="#0052ff"
                    strokeWidth="2"
                    points={curvePts.map(p => `${px(p.x)},${py(p.y)}`).join(' ')}
                  />
                  <line x1={px(xVal)} y1={6} x2={px(xVal)} y2={74} stroke="#05b169" strokeDasharray="3 2" />
                  <circle cx={px(xVal)} cy={py(intervals.yHat)} r="4" fill="#05b169" />
                </svg>
              </div>
            );
          })}
        </div>

        {/* Live KPI */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#2d428f] to-[#0052ff] text-[#ffffff] grid grid-cols-1 md:grid-cols-3 gap-4 items-center mb-5">
          <div>
            <div className="text-xs text-[#dbeafe]">최적 조건의 예측 평균 Ŷ</div>
            <div className="font-mono-num text-3xl font-bold text-[#ffffff]">
              {intervals.yHat.toFixed(3)} <span className="text-sm font-normal text-[#dbeafe]">{design.responseUnit}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[#dbeafe]">목표와의 편차</div>
            <div className="font-mono-num text-xl font-bold">
              {optimizer.goal === 'target' ? `${diffFromTarget >= 0 ? '+' : ''}${diffFromTarget.toFixed(3)}` : '극대화/극소화 모드'}
            </div>
          </div>
          <div className="flex md:justify-end">
            <button onClick={onNext} className="doe-btn bg-white text-[#0052ff] hover:bg-[#eef0f3]">
              <CheckCircle2 size={16} /> 최종 최적 조건으로 선정 → 9단계
            </button>
          </div>
        </div>

        {/* Comparison Table: Auto vs Current */}
        {autoResult && (
          <div className="doe-table-wrap mb-4">
            <table className="doe-table">
              <thead>
                <tr>
                  <th>구분</th>
                  {design.factors.map(f => (
                    <th key={f.symbol}>{f.symbol} · {f.name}</th>
                  ))}
                  <th>예측 반응치 (Ŷ)</th>
                  <th>만족도 (d)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-semibold text-[#0052ff]">자동 탐색 최적 조건</td>
                  {design.factors.map((f, idx) => (
                    <td key={f.symbol} className="font-mono-num">
                      {codedToActualVal(f, autoResult.coded[idx])} ({autoResult.coded[idx].toFixed(2)})
                    </td>
                  ))}
                  <td className="font-mono-num font-bold">{autoResult.yHat.toFixed(3)}</td>
                  <td className="font-mono-num">{autoResult.desirability.toFixed(3)}</td>
                </tr>
                <tr className="bg-[#f7f7f7]">
                  <td className="font-semibold text-[#0a0b0d]">현재 시뮬레이터 조건</td>
                  {design.factors.map((f, idx) => (
                    <td key={f.symbol} className="font-mono-num">
                      {codedToActualVal(f, currentCoded[idx])} ({currentCoded[idx].toFixed(2)})
                    </td>
                  ))}
                  <td className="font-mono-num font-bold text-[#05b169]">{intervals.yHat.toFixed(3)}</td>
                  <td className="font-mono-num">{autoResult.desirability.toFixed(3)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Comparison Table & CI/PI */}
        <button onClick={() => setShowCI(v => !v)} className="doe-btn doe-btn-secondary text-xs">
          {showCI ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          예측값 계산 및 신뢰구간(95% CI / PI) 보기
        </button>

        {showCI && (
          <div className="mt-4 doe-table-wrap">
            <table className="doe-table">
              <thead>
                <tr>
                  <th>예측 평균 (Ŷ)</th>
                  <th>SE Fit</th>
                  <th>평균의 95% 신뢰구간 (95% CI)</th>
                  <th>개별 관측값의 95% 예측구간 (95% PI)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono-num font-bold text-[#0052ff]">{intervals.yHat.toFixed(3)}</td>
                  <td className="font-mono-num">{intervals.seFit.toFixed(3)}</td>
                  <td className="font-mono-num">({intervals.ciLow.toFixed(3)}, {intervals.ciHigh.toFixed(3)})</td>
                  <td className="font-mono-num">({intervals.piLow.toFixed(3)}, {intervals.piHigh.toFixed(3)})</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-[#dee1e6]">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 수학적 모형</button>
          <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 재현 실험 및 가설검정 <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

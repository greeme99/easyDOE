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
        <p className="text-[#64748b] mb-4">분석 가능한 데이터가 부족합니다.</p>
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
        <p className="text-sm text-[#e0e7ff]">망대·망소·망목 목표와 탐색 범위를 설정하고, 실시간 시뮬레이터로 최적 공정 조건과 95% 신뢰구간을 산출합니다.</p>
      </div>

      {/* Goal Settings */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#1e293b] mb-4">최적화 목표 설정</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748b] mb-1">목표 유형</label>
            <select value={optimizer.goal} onChange={e => updateOpt({ goal: e.target.value })} className="doe-input w-full">
              <option value="target">망목 · 목표값 맞추기</option>
              <option value="maximize">망대 · 크게 할수록 좋음</option>
              <option value="minimize">망소 · 작게 할수록 좋음</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748b] mb-1">반응 하한 (Lower)</label>
            <input type="number" step="any" value={optimizer.lowerBound} onChange={e => updateOpt({ lowerBound: parseFloat(e.target.value) || 0 })} className="doe-input w-full font-mono-num" />
          </div>
          {optimizer.goal === 'target' && (
            <div>
              <label className="block text-xs font-semibold text-[#64748b] mb-1">목표값 (Target)</label>
              <input type="number" step="any" value={optimizer.targetVal} onChange={e => updateOpt({ targetVal: parseFloat(e.target.value) || 0 })} className="doe-input w-full font-mono-num font-bold text-[#4555a2]" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#64748b] mb-1">반응 상한 (Upper)</label>
            <input type="number" step="any" value={optimizer.upperBound} onChange={e => updateOpt({ upperBound: parseFloat(e.target.value) || 0 })} className="doe-input w-full font-mono-num" />
          </div>
        </div>

        <button onClick={() => setShowFixed(v => !v)} className="doe-btn doe-btn-secondary text-xs">
          {showFixed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          고정 인자 및 만족도 가중치 설정
        </button>

        {showFixed && (
          <div className="mt-4 p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] space-y-3">
            <div className="text-xs font-bold text-[#1e293b]">특정 인자 고정 (Fixed Factors)</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {design.factors.map(f => {
                const isFixed = optimizer.fixedFactors?.[f.symbol] !== undefined;
                return (
                  <div key={f.symbol} className="p-3 bg-white rounded-xl border border-[#e2e8f0]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{f.symbol} · {f.name}</span>
                      <input
                        type="checkbox"
                        checked={isFixed}
                        onChange={e => {
                          const next = { ...(optimizer.fixedFactors || {}) };
                          if (e.target.checked) next[f.symbol] = 0;
                          else delete next[f.symbol];
                          updateOpt({ fixedFactors: next });
                        }}
                        className="accent-[#4555a2]"
                      />
                    </div>
                    {isFixed && (
                      <input
                        type="number"
                        min={-1}
                        max={1}
                        step={0.1}
                        value={optimizer.fixedFactors[f.symbol]}
                        onChange={e => {
                          const next = { ...optimizer.fixedFactors, [f.symbol]: parseFloat(e.target.value) || 0 };
                          updateOpt({ fixedFactors: next });
                        }}
                        className="doe-input w-full font-mono-num text-xs mt-1"
                        placeholder="코드값 (−1 ~ +1)"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Best Auto Solution Callout */}
      {autoResult && (
        <div className="doe-card bg-gradient-to-br from-[#4555a2] to-[#2b3b84] text-[#ffffff] border-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-white/20">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#dbeafe]">OPTIMAL SOLUTION · 자동 탐색 최적 조건</span>
              <h3 className="font-editorial text-xl font-normal text-white">
                도출된 최적 조건 및 예측 반응치
              </h3>
            </div>
            <button onClick={handleFindBest} className="doe-btn doe-btn-primary text-xs">
              <Zap size={14} /> 최적 조건으로 시뮬레이터 동기화
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-white/10">
              <div className="text-xs text-[#dbeafe]">최적 조건 예측값 Ŷ</div>
              <div className="font-mono-num text-2xl font-bold text-white">
                {autoResult.yHat.toFixed(2)} {design.responseUnit}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10">
              <div className="text-xs text-[#dbeafe]">복합 만족도 (Desirability D)</div>
              <div className="font-mono-num text-2xl font-bold text-[#86efac]">
                {autoResult.desirability.toFixed(4)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 col-span-1 sm:col-span-2">
              <div className="text-xs text-[#dbeafe] mb-1">인자별 최적 설정치</div>
              <div className="text-xs font-mono-num text-white space-y-0.5">
                {design.factors.map((f, i) => (
                  <span key={f.symbol} className="inline-block mr-4">
                    <strong>{f.symbol}</strong>={codedToActualVal(f, autoResult.coded[i])} {f.unit}
                    <span className="text-[#cbd5e1] text-[10px]"> ({autoResult.coded[i] > 0 ? '+' : ''}{autoResult.coded[i].toFixed(2)})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Card */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3 mb-5">
          <div>
            <h3 className="font-editorial text-lg text-[#1e293b]">최적화 예측 시뮬레이터</h3>
            <p className="text-xs text-[#64748b]">슬라이더를 조절하여 현장 공정 조건 변경에 따른 반응치 변화를 실시간으로 확인하세요.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateOpt({ selectedCoded: design.factors.map(() => 0) })} className="doe-btn doe-btn-secondary text-xs">
              <RotateCcw size={14} /> 중심점(0)으로
            </button>
            <button onClick={handleFindBest} className="doe-btn doe-btn-dark text-xs">
              <CheckCircle2 size={14} /> 최적 조건 적용
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          {design.factors.map((f, idx) => {
            const cVal = currentCoded[idx];
            const actualVal = codedToActualVal(f, cVal);
            return (
              <div key={f.symbol} className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#4555a2]">{f.symbol}</span>
                    <span className="text-sm font-semibold text-[#1e293b] ml-1.5">{f.name}</span>
                  </div>
                  <span className="font-mono-num text-sm font-bold text-[#4555a2]">
                    {actualVal} {f.unit}
                  </span>
                </div>

                {f.type === 'categorical' ? (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={() => setSliderVal(idx, -1)}
                      className={`doe-btn py-1.5 text-xs ${cVal === -1 ? 'doe-btn-primary' : 'doe-btn-secondary'}`}
                    >
                      {f.lowVal} (−1)
                    </button>
                    <button
                      onClick={() => setSliderVal(idx, 1)}
                      className={`doe-btn py-1.5 text-xs ${cVal === 1 ? 'doe-btn-primary' : 'doe-btn-secondary'}`}
                    >
                      {f.highVal} (+1)
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.05}
                      value={cVal}
                      onChange={e => setSliderVal(idx, e.target.value)}
                      className="doe-slider"
                    />
                    <div className="flex justify-between text-[11px] text-[#64748b] mt-1 font-mono-num">
                      <span>{f.lowVal} (−1)</span>
                      <span>코드 {cVal > 0 ? '+' : ''}{cVal.toFixed(2)}</span>
                      <span>{f.highVal} (+1)</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Real-time Simulator Output Banner */}
        <div className="p-5 rounded-2xl bg-[#f1f5f9] border border-[#e2e8f0] mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-[#64748b]">현재 조건 예측값 Ŷ</div>
              <div className="font-mono-num text-2xl font-bold text-[#4555a2]">
                {intervals.yHat.toFixed(2)} {design.responseUnit}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748b]">목표값 대비 편차</div>
              <div className={`font-mono-num text-2xl font-bold ${Math.abs(diffFromTarget) < 0.5 ? 'text-[#05b169]' : 'text-[#cf202f]'}`}>
                {diffFromTarget >= 0 ? '+' : ''}{diffFromTarget.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748b]">95% 신뢰구간 (CI)</div>
              <div className="font-mono-num text-sm font-semibold text-[#1e293b] pt-1">
                [{intervals.ciLow.toFixed(2)} ~ {intervals.ciHigh.toFixed(2)}]
              </div>
            </div>
            <div>
              <div className="text-xs text-[#64748b]">95% 예측구간 (PI)</div>
              <div className="font-mono-num text-sm font-semibold text-[#1e293b] pt-1">
                [{intervals.piLow.toFixed(2)} ~ {intervals.piHigh.toFixed(2)}]
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Table */}
        {autoResult && (
          <div className="doe-table-wrap mb-4">
            <table className="doe-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>예측 반응치 (Ŷ)</th>
                  {design.factors.map(f => (
                    <th key={f.symbol}>{f.symbol} ({f.name})</th>
                  ))}
                  <th>목표 편차</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-blue-50/40">
                  <td className="font-semibold text-left text-[#4555a2]">자동 탐색 최적 조건</td>
                  <td className="font-mono-num font-bold text-[#4555a2]">{autoResult.yHat.toFixed(2)} {design.responseUnit}</td>
                  {design.factors.map((f, i) => (
                    <td key={f.symbol} className="font-mono-num">
                      {codedToActualVal(f, autoResult.coded[i])} {f.unit}
                    </td>
                  ))}
                  <td className="font-mono-num font-semibold">
                    {(autoResult.yHat - optimizer.targetVal).toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold text-left">현재 시뮬레이터 조절치</td>
                  <td className="font-mono-num font-bold text-[#1e293b]">{intervals.yHat.toFixed(2)} {design.responseUnit}</td>
                  {design.factors.map((f, i) => (
                    <td key={f.symbol} className="font-mono-num">
                      {codedToActualVal(f, currentCoded[i])} {f.unit}
                    </td>
                  ))}
                  <td className="font-mono-num font-semibold">
                    {diffFromTarget >= 0 ? '+' : ''}{diffFromTarget.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-[#e2e8f0]">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 수학적 모형</button>
          <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 재현 실험 및 가설검정 <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

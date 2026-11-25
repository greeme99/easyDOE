import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { ParetoSvg } from './SvgCharts';
import { formatCodedEquation } from './Step04FullModel';
import { actualToCodedVal, predictFromModel } from '../doeEngine';

export function formatUncodedEquation(factors, analysis, responseName = 'Y') {
  if (!analysis || !analysis.uncoded) return '';
  const u = analysis.uncoded;
  const constVal = u.__CONST__ ?? 0;
  let eq = `${responseName} = ${constVal.toFixed(4)}`;
  const factorNameMap = {};
  factors.forEach(f => { factorNameMap[f.symbol] = f.name; });

  Object.entries(u).forEach(([key, val]) => {
    if (key === '__CONST__' || Math.abs(val) < 1e-8) return;
    const sign = val >= 0 ? ' + ' : ' − ';
    const label = key.split('*').map(s => factorNameMap[s] || s).join('·');
    eq += `${sign}${Math.abs(val).toFixed(4)}·${label}`;
  });
  return eq;
}

export default function Step07MathModel({ project, reducedAnalysis, onPrev, onNext }) {
  const { design, runs } = project;
  const [showCalc, setShowCalc] = useState(false);
  const [testInputs, setTestInputs] = useState(() =>
    design.factors.map(f => (f.currentVal !== undefined && f.currentVal !== '' ? f.currentVal : f.lowVal))
  );

  if (!reducedAnalysis) {
    return (
      <div className="doe-card text-center py-12">
        <p className="text-[#64748b] mb-4">분석 가능한 데이터가 부족합니다.</p>
        <button onClick={onPrev} className="doe-btn doe-btn-secondary">← 이전 단계</button>
      </div>
    );
  }

  const codedInputs = design.factors.map((f, idx) => actualToCodedVal(f, testInputs[idx]));
  const predY = predictFromModel(reducedAnalysis, codedInputs);

  const applyRunPreset = (run) => {
    setTestInputs(design.factors.map(f => run.actual[f.symbol]));
  };

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">MATHEMATICAL MODEL / 07</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">7단계 · 수학적 모형</h2>
        <p className="text-sm text-[#e0e7ff]">최종 축소 모형의 통계적 요약, 코드화·실제 단위 회귀 방정식 및 조건 대입 예측 계산기를 제공합니다.</p>
      </div>

      {/* Summary & Pareto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="doe-card mb-0">
          <h3 className="font-editorial text-lg text-[#1e293b] mb-3">최종 분석 결과 종합정리</h3>
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] mb-4">
            <div>
              <div className="text-xs text-[#64748b]">표준오차 S</div>
              <div className="font-mono-num font-bold text-[#1e293b]">{reducedAnalysis.s.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-[#64748b]">R-제곱</div>
              <div className="font-mono-num font-bold text-[#05b169]">{reducedAnalysis.r2.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-xs text-[#64748b]">R-제곱(수정)</div>
              <div className="font-mono-num font-bold text-[#1e293b]">{reducedAnalysis.r2Adj.toFixed(2)}%</div>
            </div>
          </div>

          <div className="doe-table-wrap mb-3">
            <table className="doe-table">
              <thead>
                <tr>
                  <th>유지 항</th>
                  <th>효과</th>
                  <th>기여율 (%)</th>
                  <th>P-value</th>
                </tr>
              </thead>
              <tbody>
                {reducedAnalysis.activeTerms.map(t => (
                  <tr key={t.key}>
                    <td className="font-semibold text-left">{t.key} ({t.name})</td>
                    <td className="font-mono-num">{t.effect.toFixed(3)}</td>
                    <td className="font-mono-num font-bold text-[#05b169]">{t.contribution.toFixed(2)}%</td>
                    <td className="font-mono-num">{t.pVal !== null ? (t.pVal < 0.0001 ? '< 0.0001' : t.pVal.toFixed(4)) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-[#64748b]">
            풀링된 비유의 항: {reducedAnalysis.pooledTerms.length ? reducedAnalysis.pooledTerms.map(t => t.key).join(', ') : '없음'}
          </div>
        </div>

        <div className="doe-card mb-0">
          <h3 className="font-editorial text-lg text-[#1e293b] mb-3">최종 효과 파레토 도표</h3>
          <ParetoSvg termResults={reducedAnalysis.termResults} tCrit={reducedAnalysis.tCrit} />
        </div>
      </div>

      {/* Regression Equations */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#1e293b] mb-3">회귀식 작성 (Regression Equations)</h3>
        <div className="space-y-3 mb-5">
          <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#4555a2] mb-1">Coded Units · 코드화된 단위 (−1 ~ +1)</div>
            <code className="font-mono-num text-sm text-[#1e293b] break-all">
              {formatCodedEquation(reducedAnalysis, design.responseName)}
            </code>
          </div>
          <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#05b169] mb-1">Uncoded Units · 실제 현장 사용 단위</div>
            <code className="font-mono-num text-sm text-[#1e293b] break-all">
              {formatUncodedEquation(design.factors, reducedAnalysis, design.responseName)}
            </code>
          </div>
        </div>

        {/* Interactive Substitution */}
        <button onClick={() => setShowCalc(v => !v)} className="doe-btn doe-btn-secondary text-xs">
          {showCalc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          조건 대입·예측값 계산 보기
        </button>

        {showCalc && (
          <div className="mt-4 p-5 rounded-2xl bg-[#ffffff] border border-[#e2e8f0] space-y-4">
            <div className="flex flex-wrap gap-2">
              {runs.slice(0, 8).map(r => (
                <button key={r.id} onClick={() => applyRunPreset(r)} className="doe-btn doe-btn-secondary text-xs py-1 px-2.5">
                  실행순서 {r.runOrder}번
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {design.factors.map((f, idx) => (
                <div key={f.symbol} className="p-3 bg-white rounded-xl border border-[#e2e8f0]">
                  <label className="block text-xs font-semibold text-[#64748b] mb-1">
                    {f.symbol} · {f.name} ({f.unit})
                  </label>
                  {f.type === 'categorical' ? (
                    <select
                      value={testInputs[idx]}
                      onChange={e => {
                        const next = [...testInputs];
                        next[idx] = e.target.value;
                        setTestInputs(next);
                      }}
                      className="doe-input w-full"
                    >
                      <option value={f.lowVal}>{f.lowVal}</option>
                      <option value={f.highVal}>{f.highVal}</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      step="any"
                      value={testInputs[idx]}
                      onChange={e => {
                        const next = [...testInputs];
                        next[idx] = e.target.value;
                        setTestInputs(next);
                      }}
                      className="doe-input w-full font-mono-num"
                    />
                  )}
                  <div className="text-[11px] text-[#64748b] mt-1 font-mono-num">
                    코드값 x_{f.symbol} = {codedInputs[idx].toFixed(3)}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#4555a2] to-[#2b3b84] text-[#ffffff] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#e0e7ff]">모형 예측 반응치 (Ŷ)</span>
                <span className="font-mono-num text-2xl font-bold text-[#ffffff]">
                  {predY.toFixed(3)} {design.responseUnit}
                </span>
              </div>
              <div className="text-xs text-[#e0e7ff] font-mono-num border-t border-white/20 pt-2">
                대입식: Ŷ = {reducedAnalysis.factMean.toFixed(3)}
                {reducedAnalysis.activeTerms.map(t => {
                  const val = t.indices.reduce((p, i) => p * codedInputs[i], 1);
                  return ` ${t.coef >= 0 ? '+' : '−'} ${Math.abs(t.coef).toFixed(3)}×(${val.toFixed(2)})`;
                }).join('')} = {predY.toFixed(3)}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-[#e2e8f0]">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 잔차분석</button>
          <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 반응 최적화 <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

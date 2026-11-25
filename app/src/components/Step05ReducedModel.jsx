import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeDOE } from '../doeEngine';
import { formatCodedEquation } from './Step04FullModel';

export default function Step05ReducedModel({ project, updateProject, reducedAnalysis, onPrev, onNext }) {
  const [selectedToPool, setSelectedToPool] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  if (!reducedAnalysis) {
    return (
      <div className="doe-card text-center py-12">
        <p className="text-[#64748b] mb-4">분석 가능한 데이터가 부족합니다.</p>
        <button onClick={onPrev} className="doe-btn doe-btn-secondary">← 이전 단계</button>
      </div>
    );
  }

  const { design, pooledKeys, poolingHistory = [], alpha } = project;

  const handlePoolOne = () => {
    if (!selectedToPool || pooledKeys.includes(selectedToPool)) return;
    const termObj = reducedAnalysis.termResults.find(t => t.key === selectedToPool);
    const nextPooled = [...pooledKeys, selectedToPool];
    const nextAnalysis = analyzeDOE({
      factors: design.factors,
      runs: project.runs,
      pooledKeys: nextPooled,
      alpha,
    });
    const entry = {
      round: poolingHistory.length + 1,
      term: selectedToPool,
      pBefore: termObj?.pVal ?? null,
      dfBefore: reducedAnalysis.errorDF,
      dfAfter: nextAnalysis?.errorDF ?? reducedAnalysis.errorDF + 1,
      sAfter: nextAnalysis?.s ?? 0,
      r2AdjAfter: nextAnalysis?.r2Adj ?? 0,
    };
    updateProject({
      pooledKeys: nextPooled,
      poolingHistory: [...poolingHistory, entry],
    });
    setSelectedToPool('');
  };

  const handleUndoPool = () => {
    if (!pooledKeys.length) return;
    updateProject({
      pooledKeys: pooledKeys.slice(0, -1),
      poolingHistory: poolingHistory.slice(0, -1),
    });
  };

  const handleRestoreFull = () => {
    updateProject({
      pooledKeys: [],
      poolingHistory: [],
    });
  };

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">REDUCED MODEL / 05</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">5단계 · 축소 모형 (순차 풀링)</h2>
        <p className="text-sm text-[#e0e7ff]">유의하지 않은 고차 교호작용 항을 1개씩 순차적으로 오차항에 풀링(Pooling)하여 최적의 축소 모형을 도출합니다.</p>
      </div>

      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3 mb-4">
          <div>
            <h3 className="font-editorial text-lg text-[#1e293b]">추정된 효과 및 계수 (축소 모형)</h3>
            <p className="text-xs text-[#64748b]">
              오차의 기여율은 <strong className="text-[#4555a2]">{reducedAnalysis.errorContribution.toFixed(2)}%</strong>입니다.
              {pooledKeys.length > 0 && (
                <span className="ml-2 font-medium text-[#4555a2]">
                  ({pooledKeys.length}차 풀링 완료 · 제거한 항: {pooledKeys.join(' · ')})
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePoolOne}
              disabled={!selectedToPool}
              className="doe-btn doe-btn-primary text-xs"
            >
              <Layers size={14} /> 선택한 항 풀링 ({selectedToPool || '선택 없음'})
            </button>
            <button
              onClick={handleUndoPool}
              disabled={!pooledKeys.length}
              className="doe-btn doe-btn-secondary text-xs"
            >
              <RotateCcw size={14} /> 직전 풀링 취소
            </button>
            {pooledKeys.length > 0 && (
              <button
                onClick={handleRestoreFull}
                className="doe-btn doe-btn-secondary text-xs text-[#cf202f]"
              >
                전체 모형으로 복원
              </button>
            )}
          </div>
        </div>

        <div className="doe-table-wrap mb-4">
          <table className="doe-table">
            <thead>
              <tr>
                <th>선택</th>
                <th>항 (Term)</th>
                <th>효과</th>
                <th>계수</th>
                <th>SE 계수</th>
                <th>T</th>
                <th>P</th>
                <th>기여율 (%)</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {reducedAnalysis.termResults.map(t => (
                <tr key={t.key} className={t.isPooled ? 'bg-[#f8fafc] text-[#94a3b8]' : ''}>
                  <td>
                    {!t.isPooled && t.order >= 2 ? (
                      <input
                        type="radio"
                        name="poolTerm"
                        checked={selectedToPool === t.key}
                        onChange={() => setSelectedToPool(t.key)}
                        className="accent-[#4555a2] cursor-pointer"
                      />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="font-semibold text-left">{t.key} ({t.name})</td>
                  <td className="font-mono-num">{t.isPooled ? '-' : t.effect.toFixed(4)}</td>
                  <td className="font-mono-num font-bold">{t.isPooled ? '-' : t.coef.toFixed(4)}</td>
                  <td className="font-mono-num">{!t.isPooled && reducedAnalysis.errorDF > 0 ? t.seCoef.toFixed(4) : '-'}</td>
                  <td className="font-mono-num">{!t.isPooled && t.tVal !== null ? t.tVal.toFixed(2) : '-'}</td>
                  <td className="font-mono-num">{!t.isPooled && t.pVal !== null ? (t.pVal < 0.0001 ? '< 0.0001' : t.pVal.toFixed(4)) : '-'}</td>
                  <td className="font-mono-num font-semibold">{t.isPooled ? '-' : `${t.contribution.toFixed(2)}%`}</td>
                  <td>
                    {t.isPooled ? (
                      <span className="doe-badge-muted">풀링 완료</span>
                    ) : t.significant ? (
                      <span className="doe-badge-sig">유의함</span>
                    ) : (
                      <span className="doe-badge-pool">풀링 후보</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Model Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
          <div>
            <div className="text-xs text-[#64748b]">표준오차 S</div>
            <div className="font-mono-num text-lg font-bold text-[#1e293b]">{reducedAnalysis.s.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-xs text-[#64748b]">R-제곱 (R²)</div>
            <div className="font-mono-num text-lg font-bold text-[#05b169]">{reducedAnalysis.r2.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-xs text-[#64748b]">R-제곱(수정, R² adj)</div>
            <div className="font-mono-num text-lg font-bold text-[#1e293b]">{reducedAnalysis.r2Adj.toFixed(2)}%</div>
          </div>
        </div>
      </div>

      {/* ANOVA with Lack of Fit */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#1e293b] mb-3">ANOVA (분산분석표 · 축소 모형)</h3>
        <div className="doe-table-wrap mb-4">
          <table className="doe-table">
            <thead>
              <tr>
                <th>출처 (Source)</th>
                <th>DF</th>
                <th>Adj SS</th>
                <th>Adj MS</th>
                <th>F</th>
                <th>P</th>
              </tr>
            </thead>
            <tbody>
              {reducedAnalysis.orderGroups.map(g => (
                <tr key={g.order}>
                  <td className="font-semibold text-left">{g.label}</td>
                  <td className="font-mono-num">{g.df}</td>
                  <td className="font-mono-num">{g.ss.toFixed(3)}</td>
                  <td className="font-mono-num">{g.ms.toFixed(3)}</td>
                  <td className="font-mono-num">{g.fVal !== null ? g.fVal.toFixed(2) : '-'}</td>
                  <td className="font-mono-num">{g.pVal !== null ? (g.pVal < 0.0001 ? '< 0.0001' : g.pVal.toFixed(4)) : '-'}</td>
                </tr>
              ))}
              <tr className="bg-[#f8fafc]">
                <td className="font-semibold text-left">잔차 오차 (Residual Error)</td>
                <td className="font-mono-num">{reducedAnalysis.errorDF}</td>
                <td className="font-mono-num">{reducedAnalysis.errorSS.toFixed(3)}</td>
                <td className="font-mono-num">{reducedAnalysis.errorDF > 0 ? reducedAnalysis.errorMS.toFixed(3) : '-'}</td>
                <td>-</td>
                <td>-</td>
              </tr>
              {reducedAnalysis.lackOfFitDF > 0 && (
                <tr>
                  <td className="text-left pl-6 text-[#64748b]">적합성 결여 (Lack of Fit)</td>
                  <td className="font-mono-num">{reducedAnalysis.lackOfFitDF}</td>
                  <td className="font-mono-num">{reducedAnalysis.lackOfFitSS.toFixed(3)}</td>
                  <td className="font-mono-num">{reducedAnalysis.lackOfFitMS.toFixed(3)}</td>
                  <td className="font-mono-num">{reducedAnalysis.lackOfFitF !== null ? reducedAnalysis.lackOfFitF.toFixed(2) : '-'}</td>
                  <td className="font-mono-num">{reducedAnalysis.lackOfFitP !== null ? reducedAnalysis.lackOfFitP.toFixed(4) : '-'}</td>
                </tr>
              )}
              {reducedAnalysis.pureErrorDF > 0 && (
                <tr>
                  <td className="text-left pl-6 text-[#64748b]">순수 오차 (Pure Error)</td>
                  <td className="font-mono-num">{reducedAnalysis.pureErrorDF}</td>
                  <td className="font-mono-num">{reducedAnalysis.pureErrorSS.toFixed(3)}</td>
                  <td className="font-mono-num">{reducedAnalysis.pureErrorMS.toFixed(3)}</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              )}
              <tr className="font-bold bg-[#f1f5f9]">
                <td className="text-left">전체 (Total)</td>
                <td className="font-mono-num">{reducedAnalysis.totalDF}</td>
                <td className="font-mono-num">{reducedAnalysis.totalSS.toFixed(3)}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="doe-callout mb-4">
          <strong>축소 모형 회귀식:</strong>{' '}
          <code className="font-mono-num text-xs md:text-sm">{formatCodedEquation(reducedAnalysis, design.responseName)}</code>
        </div>

        {/* Pooling History */}
        <button
          onClick={() => setShowHistory(v => !v)}
          className="doe-btn doe-btn-secondary text-xs mb-3"
        >
          {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          이전 결과 보기 및 순차 풀링 과정 ({poolingHistory.length}건)
        </button>

        {showHistory && (
          <div className="doe-table-wrap mb-4">
            <table className="doe-table">
              <thead>
                <tr>
                  <th>차수</th>
                  <th>풀링한 항</th>
                  <th>풀링 직전 P</th>
                  <th>오차 DF 변화</th>
                  <th>풀링 후 S</th>
                  <th>R-제곱(수정)</th>
                </tr>
              </thead>
              <tbody>
                {poolingHistory.length === 0 ? (
                  <tr><td colSpan={6} className="text-[#64748b]">아직 순차 풀링 이력이 없습니다.</td></tr>
                ) : (
                  poolingHistory.map(h => (
                    <tr key={h.round}>
                      <td className="font-mono-num">{h.round}차</td>
                      <td className="font-bold text-[#4555a2]">{h.term}</td>
                      <td className="font-mono-num">{h.pBefore !== null ? h.pBefore.toFixed(4) : '-'}</td>
                      <td className="font-mono-num">{h.dfBefore} → {h.dfAfter}</td>
                      <td className="font-mono-num">{h.sAfter !== undefined ? h.sAfter.toFixed(4) : '-'}</td>
                      <td className="font-mono-num">{h.r2AdjAfter !== undefined ? `${h.r2AdjAfter.toFixed(2)}%` : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between mt-4 pt-4 border-t border-[#e2e8f0]">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 통계 분석</button>
          <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 잔차분석 <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

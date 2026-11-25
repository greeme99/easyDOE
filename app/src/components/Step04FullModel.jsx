import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ParetoSvg, NormalProbSvg } from './SvgCharts';

export function formatCodedEquation(analysis, responseName = 'Y') {
  if (!analysis) return '';
  let eq = `${responseName} = ${analysis.factMean.toFixed(3)}`;
  analysis.activeTerms.forEach(t => {
    const sign = t.coef >= 0 ? ' + ' : ' − ';
    eq += `${sign}${Math.abs(t.coef).toFixed(3)}·${t.label}`;
  });
  return eq;
}

export default function Step04FullModel({ project, updateProject, fullAnalysis, onPrev, onNext }) {
  if (!fullAnalysis) {
    return (
      <div className="doe-card text-center py-12">
        <p className="text-[#64748b] mb-4">분석 가능한 데이터가 부족합니다.</p>
        <button onClick={onPrev} className="doe-btn doe-btn-secondary">← 이전 단계</button>
      </div>
    );
  }

  const { design, alpha, pooledKeys } = project;

  const togglePoolCandidate = (key) => {
    const exists = pooledKeys.includes(key);
    const next = exists ? pooledKeys.filter(k => k !== key) : [...pooledKeys, key];
    updateProject({ pooledKeys: next });
  };

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">STATISTICAL ANALYSIS / 04</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">4단계 · 통계 분석 (풀링 전 완전모형)</h2>
        <p className="text-sm text-[#e0e7ff]">모든 주효과 및 교호작용 항을 포함한 완전모형의 T-검정, P-value 및 ANOVA를 확인하고 풀링 후보를 검토합니다.</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="doe-card mb-0">
          <h3 className="font-editorial text-base text-[#1e293b] mb-3">효과 Pareto 도표</h3>
          <ParetoSvg termResults={fullAnalysis.termResults} tCrit={fullAnalysis.tCrit} />
        </div>
        <div className="doe-card mb-0">
          <h3 className="font-editorial text-base text-[#1e293b] mb-3">표준화 효과의 정규확률도</h3>
          <NormalProbSvg
            points={fullAnalysis.termResults.map(t => ({
              val: t.tVal !== null ? t.tVal : t.effect,
              label: t.key,
              sig: t.significant,
            }))}
            title="표준화 효과 정규확률도"
            xLabel={fullAnalysis.errorDF > 0 ? '표준화 효과 (T)' : '효과 (Effect)'}
          />
        </div>
      </div>

      {/* Effects & Coefficients Table */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3 mb-4">
          <div>
            <h3 className="font-editorial text-lg text-[#1e293b]">
              Y = {design.responseName}에 대한 추정된 효과 및 계수 (코드화된 단위)
            </h3>
            <p className="text-xs text-[#64748b]">
              선정한 풀링 후보: {pooledKeys.length ? pooledKeys.join(' · ') : '없음'} (실제 순차 풀링은 5단계에서 실행됩니다)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748b]">유의수준 α:</span>
            <select
              value={alpha}
              onChange={e => updateProject({ alpha: parseFloat(e.target.value) })}
              className="doe-input py-1.5 text-xs"
            >
              <option value={0.05}>5% (0.05)</option>
              <option value={0.1}>10% (0.10)</option>
            </select>
          </div>
        </div>

        <div className="doe-table-wrap">
          <table className="doe-table">
            <thead>
              <tr>
                <th>풀링 검토</th>
                <th>항 (Term)</th>
                <th>효과 (Effect)</th>
                <th>계수 (Coef)</th>
                <th>SE 계수</th>
                <th>T</th>
                <th>P</th>
                <th>기여율 (%)</th>
                <th>풀링 대상 선정</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#f8fafc]">
                <td>-</td>
                <td className="font-semibold text-left">상수 (Constant)</td>
                <td>-</td>
                <td className="font-mono-num font-bold">{fullAnalysis.factMean.toFixed(4)}</td>
                <td className="font-mono-num">{fullAnalysis.seCoef ? fullAnalysis.seCoef.toFixed(4) : '-'}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td><span className="doe-badge-muted">절편</span></td>
              </tr>
              {fullAnalysis.termResults.map(t => {
                const isCand = pooledKeys.includes(t.key);
                const canPool = t.order >= 2;
                return (
                  <tr key={t.key} className={isCand ? 'bg-blue-50/50' : ''}>
                    <td>
                      {canPool ? (
                        <input
                          type="checkbox"
                          checked={isCand}
                          onChange={() => togglePoolCandidate(t.key)}
                          className="accent-[#4555a2] w-4 h-4 cursor-pointer"
                        />
                      ) : (
                        <span className="text-xs text-[#64748b]">주효과</span>
                      )}
                    </td>
                    <td className="font-semibold text-left">{t.key} ({t.name})</td>
                    <td className="font-mono-num">{t.effect.toFixed(4)}</td>
                    <td className="font-mono-num font-bold">{t.coef.toFixed(4)}</td>
                    <td className="font-mono-num">{t.seCoef !== null && fullAnalysis.errorDF > 0 ? t.seCoef.toFixed(4) : '-'}</td>
                    <td className="font-mono-num">{t.tVal !== null ? t.tVal.toFixed(2) : '-'}</td>
                    <td className="font-mono-num font-semibold">
                      {t.pVal !== null ? (t.pVal < 0.0001 ? '< 0.0001' : t.pVal.toFixed(4)) : '-'}
                    </td>
                    <td className="font-mono-num font-semibold text-[#4555a2]">{t.contribution.toFixed(2)}%</td>
                    <td>
                      {fullAnalysis.errorDF === 0 ? (
                        <span className="doe-badge-pool">DF 0 (풀링 필요)</span>
                      ) : t.significant ? (
                        <span className="doe-badge-sig">유의함 (유지)</span>
                      ) : (
                        <span className="doe-badge-pool">풀링 대상</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Model Summary */}
        <div className="grid grid-cols-3 gap-4 mt-5 p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0]">
          <div>
            <div className="text-xs text-[#64748b]">표준오차 S</div>
            <div className="font-mono-num text-lg font-bold text-[#1e293b]">
              {fullAnalysis.errorDF > 0 ? fullAnalysis.s.toFixed(4) : 'N/A (DF=0)'}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#64748b]">R-제곱 (R²)</div>
            <div className="font-mono-num text-lg font-bold text-[#05b169]">{fullAnalysis.r2.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-xs text-[#64748b]">R-제곱(수정, R² adj)</div>
            <div className="font-mono-num text-lg font-bold text-[#1e293b]">
              {fullAnalysis.errorDF > 0 ? `${fullAnalysis.r2Adj.toFixed(2)}%` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* ANOVA Table */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#1e293b] mb-3">ANOVA (분산분석표 · 코드화된 단위)</h3>
        <div className="doe-table-wrap mb-4">
          <table className="doe-table">
            <thead>
              <tr>
                <th>출처 (Source)</th>
                <th>DF</th>
                <th>Seq SS</th>
                <th>Adj SS</th>
                <th>Adj MS</th>
                <th>F</th>
                <th>P</th>
              </tr>
            </thead>
            <tbody>
              {fullAnalysis.orderGroups.map(g => (
                <tr key={g.order}>
                  <td className="font-semibold text-left">{g.label}</td>
                  <td className="font-mono-num">{g.df}</td>
                  <td className="font-mono-num">{g.ss.toFixed(3)}</td>
                  <td className="font-mono-num">{g.ss.toFixed(3)}</td>
                  <td className="font-mono-num">{g.ms.toFixed(3)}</td>
                  <td className="font-mono-num">{g.fVal !== null ? g.fVal.toFixed(2) : '-'}</td>
                  <td className="font-mono-num">{g.pVal !== null ? (g.pVal < 0.0001 ? '< 0.0001' : g.pVal.toFixed(4)) : '-'}</td>
                </tr>
              ))}
              <tr className="bg-[#f8fafc]">
                <td className="font-semibold text-left">잔차 오차 (Residual Error)</td>
                <td className="font-mono-num">{fullAnalysis.errorDF}</td>
                <td className="font-mono-num">{fullAnalysis.errorSS.toFixed(3)}</td>
                <td className="font-mono-num">{fullAnalysis.errorSS.toFixed(3)}</td>
                <td className="font-mono-num">{fullAnalysis.errorDF > 0 ? fullAnalysis.errorMS.toFixed(3) : '-'}</td>
                <td>-</td>
                <td>-</td>
              </tr>
              {fullAnalysis.pureErrorDF > 0 && (
                <tr>
                  <td className="text-left pl-6 text-[#64748b]">순수 오차 (Pure Error)</td>
                  <td className="font-mono-num">{fullAnalysis.pureErrorDF}</td>
                  <td className="font-mono-num">{fullAnalysis.pureErrorSS.toFixed(3)}</td>
                  <td className="font-mono-num">{fullAnalysis.pureErrorSS.toFixed(3)}</td>
                  <td className="font-mono-num">{fullAnalysis.pureErrorMS.toFixed(3)}</td>
                  <td>-</td>
                  <td>-</td>
                </tr>
              )}
              <tr className="font-bold bg-[#f1f5f9]">
                <td className="text-left">전체 (Total)</td>
                <td className="font-mono-num">{fullAnalysis.totalDF}</td>
                <td className="font-mono-num">{fullAnalysis.totalSS.toFixed(3)}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="doe-callout">
          <strong>수학적 모형 (풀링 전):</strong>{' '}
          <code className="font-mono-num text-xs md:text-sm">{formatCodedEquation(fullAnalysis, design.responseName)}</code>
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-[#e2e8f0]">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · Graph 분석</button>
          <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 축소 모형 (순차 풀링) <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

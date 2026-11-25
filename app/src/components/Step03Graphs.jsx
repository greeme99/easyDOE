import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { MainEffectsSvg, InteractionMatrixSvg, CubePlotSvg } from './SvgCharts';

export default function Step03Graphs({ project, fullAnalysis, onPrev, onNext }) {
  const { design, runs } = project;
  if (!fullAnalysis) {
    return (
      <div className="doe-card text-center py-12">
        <p className="text-[#64748b] mb-4">2단계에서 최소 4개 이상의 유효한 측정값을 입력해주세요.</p>
        <button onClick={onPrev} className="doe-btn doe-btn-secondary">← 2단계로 이동</button>
      </div>
    );
  }

  const validRuns = runs.filter(r => !r.isCenter && Number.isFinite(parseFloat(r.y)));
  const mainTerms = fullAnalysis.termResults.filter(t => t.order === 1);
  const interTerms = fullAnalysis.termResults.filter(t => t.order >= 2);
  const topMain = [...mainTerms].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))[0];
  const topInter = [...interTerms].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))[0];

  // Best observed treatment mean
  const treatmentMeans = {};
  validRuns.forEach(r => {
    const key = design.factors.map(f => `${f.symbol}=${r.actual[f.symbol]}`).join(', ');
    if (!treatmentMeans[key]) treatmentMeans[key] = [];
    treatmentMeans[key].push(parseFloat(r.y));
  });
  let bestTreatment = { key: '-', mean: -Infinity };
  Object.entries(treatmentMeans).forEach(([key, arr]) => {
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (m > bestTreatment.mean) bestTreatment = { key, mean: m };
  });

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">GRAPH ANALYSIS / 03</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">3단계 · Graph 분석</h2>
        <p className="text-sm text-[#e0e7ff]">주효과도, 교호작용도 및 Cube Plot으로 인자별 영향 방향과 결합 효과를 직관적으로 탐색합니다.</p>
      </div>

      {/* 1. 주효과도 */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#1e293b] mb-3">1. 주효과도 (Main Effects Plot)</h3>
        <MainEffectsSvg factors={design.factors} runs={runs} grandMean={fullAnalysis.factMean} />
        <div className="doe-table-wrap mt-4">
          <table className="doe-table">
            <thead>
              <tr>
                <th>인자</th>
                <th>저수준 (−1) 평균</th>
                <th>고수준 (+1) 평균</th>
                <th>대비 (Contrast)</th>
                <th>주효과 (Effect)</th>
                <th>회귀계수 (β)</th>
                <th>제곱합 (SS)</th>
                <th>기여율 (%)</th>
              </tr>
            </thead>
            <tbody>
              {mainTerms.map((t, idx) => {
                const f = design.factors[idx];
                const lo = validRuns.filter(r => r.coded[f.symbol] === -1).map(r => parseFloat(r.y));
                const hi = validRuns.filter(r => r.coded[f.symbol] === 1).map(r => parseFloat(r.y));
                const mLo = lo.length ? lo.reduce((a, b) => a + b, 0) / lo.length : 0;
                const mHi = hi.length ? hi.reduce((a, b) => a + b, 0) / hi.length : 0;
                return (
                  <tr key={t.key}>
                    <td className="font-semibold">{t.key} · {t.name}</td>
                    <td className="font-mono-num">{mLo.toFixed(3)} ({f.lowVal})</td>
                    <td className="font-mono-num">{mHi.toFixed(3)} ({f.highVal})</td>
                    <td className="font-mono-num">{t.contrast.toFixed(2)}</td>
                    <td className={`font-mono-num font-bold ${t.effect >= 0 ? 'text-[#05b169]' : 'text-[#cf202f]'}`}>
                      {t.effect >= 0 ? '+' : ''}{t.effect.toFixed(3)}
                    </td>
                    <td className="font-mono-num">{t.coef >= 0 ? '+' : ''}{t.coef.toFixed(3)}</td>
                    <td className="font-mono-num">{t.ss.toFixed(3)}</td>
                    <td className="font-mono-num font-semibold text-[#4555a2]">{t.contribution.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {topMain && (
          <div className="doe-callout mt-4">
            <strong>주효과 그래프 해석:</strong>{' '}
            가장 기울기가 가파른 핵심 인자는 <strong>{topMain.key} ({topMain.name})</strong>이며, 효과 크기는{' '}
            <strong className="font-mono-num">{topMain.effect >= 0 ? '+' : ''}{topMain.effect.toFixed(3)}</strong>, 기여율은{' '}
            <strong className="font-mono-num">{topMain.contribution.toFixed(2)}%</strong> ({topMain.effect >= 0 ? '고수준(+1)에서 반응치 상승' : '저수준(−1)에서 반응치 상승'})입니다.
          </div>
        )}
      </div>

      {/* 2. 교호작용도 */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#1e293b] mb-3">2. 교호작용도 (Interaction Plot)</h3>
        <InteractionMatrixSvg factors={design.factors} runs={runs} />
        <div className="doe-table-wrap mt-4">
          <table className="doe-table">
            <thead>
              <tr>
                <th>교호작용 항</th>
                <th>구분</th>
                <th>대비 (Contrast)</th>
                <th>교호효과 (Effect)</th>
                <th>회귀계수 (β)</th>
                <th>제곱합 (SS)</th>
                <th>기여율 (%)</th>
              </tr>
            </thead>
            <tbody>
              {interTerms.map(t => (
                <tr key={t.key}>
                  <td className="font-semibold">{t.key} ({t.name})</td>
                  <td>{t.order}차 교호작용</td>
                  <td className="font-mono-num">{t.contrast.toFixed(2)}</td>
                  <td className={`font-mono-num font-bold ${t.effect >= 0 ? 'text-[#05b169]' : 'text-[#cf202f]'}`}>
                    {t.effect >= 0 ? '+' : ''}{t.effect.toFixed(3)}
                  </td>
                  <td className="font-mono-num">{t.coef >= 0 ? '+' : ''}{t.coef.toFixed(3)}</td>
                  <td className="font-mono-num">{t.ss.toFixed(3)}</td>
                  <td className="font-mono-num font-semibold text-[#4555a2]">{t.contribution.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {topInter && (
          <div className="doe-callout mt-4">
            <strong>교호작용 그래프 해석:</strong>{' '}
            가장 큰 교호작용 후보 항은 <strong>{topInter.key} ({topInter.name})</strong> (|Effect| ={' '}
            <strong className="font-mono-num">{Math.abs(topInter.effect).toFixed(3)}</strong>, 기여율 ={' '}
            <strong className="font-mono-num">{topInter.contribution.toFixed(2)}%</strong>)입니다. 두 직선이 평행에 가까울수록 교호작용이 미미하며, 실제 통계적 유의성은 4단계 ANOVA P-value로 판정합니다.
          </div>
        )}
      </div>

      {/* 3. Cube Plot */}
      {design.factors.length >= 3 && (
        <div className="doe-card">
          <h3 className="font-editorial text-lg text-[#1e293b] mb-3">3. Cube Plot (A × B × C 꼭짓점 평균)</h3>
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <CubePlotSvg factors={design.factors} runs={runs} />
            <div className="flex-1 p-5 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[#4555a2]">최고 관측 평균 조건</div>
              <div className="font-editorial text-2xl font-bold text-[#1e293b]">
                {bestTreatment.mean.toFixed(2)} {design.responseUnit}
              </div>
              <div className="text-sm text-[#475569]">조건: {bestTreatment.key}</div>
              <p className="text-xs text-[#64748b] pt-2">
                Cube Plot은 설계 영역의 8개 꼭짓점에서의 평균 반응치를 3차원 직육면체로 표시하여 최적 탐색 방향을 제시합니다.
              </p>
            </div>
          </div>

          <div className="flex justify-between mt-6 pt-4 border-t border-[#e2e8f0]">
            <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 결과 입력</button>
            <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 통계 분석 (풀링 전) <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {design.factors.length < 3 && (
        <div className="doe-card flex justify-between">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 결과 입력</button>
          <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 통계 분석 (풀링 전) <ArrowRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

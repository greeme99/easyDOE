import React, { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { ResidualFourInOneSvg } from './SvgCharts';
import { analyzeResidualsDiagnostics } from '../doeEngine';

export default function Step06Residuals({ reducedAnalysis, onPrev, onNext }) {
  const [showTable, setShowTable] = useState(false);

  const diag = useMemo(
    () => (reducedAnalysis ? analyzeResidualsDiagnostics(reducedAnalysis.observations) : null),
    [reducedAnalysis]
  );

  if (!reducedAnalysis || !diag) {
    return (
      <div className="doe-card text-center py-12">
        <p className="text-[#7c828a] mb-4">분석 가능한 데이터가 부족합니다.</p>
        <button onClick={onPrev} className="doe-btn doe-btn-secondary">← 이전 단계</button>
      </div>
    );
  }

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">RESIDUAL ANALYSIS / 06</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">6단계 · 잔차분석 (모형 타당성 진단)</h2>
        <p className="text-sm text-[#dbeafe]">정규성(Anderson-Darling), 등분산성(분산비), 독립성(자기상관)을 수치적으로 검정하고 4-in-1 진단 그래프로 검증합니다.</p>
      </div>

      <div className="doe-card">
        <ResidualFourInOneSvg observations={reducedAnalysis.observations} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div className="p-4 rounded-2xl bg-[#f7f7f7] border border-[#dee1e6]">
            <h4 className="font-semibold text-sm text-[#0a0b0d] mb-2">그래프별 정량 분석 결과</h4>
            <ul className="text-xs text-[#5b616e] space-y-2 list-disc pl-4">
              <li>
                <strong>① 정규확률도 (Normality)</strong>: Anderson-Darling AD = <span className="font-mono-num font-semibold">{diag.ad ? diag.ad.ad.toFixed(3) : '-'}</span>,
                P = <span className="font-mono-num font-semibold">{diag.ad ? diag.ad.pVal.toFixed(3) : '-'}</span>{' '}
                ({diag.normalOk ? '정규성 충족' : '정규성 주의'})
              </li>
              <li>
                <strong>② 잔차 대 적합치 (Homoscedasticity)</strong>: 상/하위 구간 분산비 = <span className="font-mono-num font-semibold">{diag.varRatio.toFixed(2)}</span>{' '}
                ({diag.homoOk ? '등분산성 양호 (< 4.0)' : '이분산성 주의'})
              </li>
              <li>
                <strong>③ 히스토그램</strong>: 잔차 N = <span className="font-mono-num font-semibold">{diag.n}</span>개, 최대 |표준화 잔차| = <span className="font-mono-num font-semibold">{diag.maxStd.toFixed(2)}</span>{' '}
                ({diag.outlierOk ? '특이점 없음' : '특이점 의심'})
              </li>
              <li>
                <strong>④ 관측순서도 (Independence)</strong>: Lag-1 자기상관 r = <span className="font-mono-num font-semibold">{diag.lag1.toFixed(3)}</span>{' '}
                ({diag.indepOk ? '독립성 충족 (|r| < 0.5)' : '순서 의존성 주의'})
              </li>
            </ul>
          </div>

          <div className={`p-4 rounded-2xl border ${diag.allOk ? 'bg-[#eef0f3] border-[#dee1e6]' : 'bg-amber-50 border-amber-200'}`}>
            <h4 className={`font-semibold text-sm flex items-center gap-1.5 mb-2 ${diag.allOk ? 'text-[#05b169]' : 'text-amber-800'}`}>
              {diag.allOk ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />} 종합 판정 결과
            </h4>
            <p className="text-xs text-[#0a0b0d] leading-relaxed">
              {diag.allOk
                ? `정규성(P=${diag.ad?.pVal.toFixed(3)}), 등분산성(분산비=${diag.varRatio.toFixed(2)}), 독립성(r=${diag.lag1.toFixed(3)}), 특이점(|d|=${diag.maxStd.toFixed(2)}) 기준을 모두 충족하여 수립된 축소 모형이 통계적으로 타당합니다.`
                : '일부 잔차 진단 지표가 기준치를 벗어났습니다. 이상치 여부 또는 누락된 교호작용 항을 점검하세요.'}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <button onClick={() => setShowTable(v => !v)} className="doe-btn doe-btn-secondary text-xs">
            {showTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            관측값·적합값·잔차 계산표 보기 ({reducedAnalysis.observations.length}건)
          </button>

          {showTable && (
            <div className="doe-table-wrap mt-3 max-h-[360px] overflow-y-auto">
              <table className="doe-table">
                <thead>
                  <tr>
                    <th>실행순서</th>
                    <th>표준순서</th>
                    <th>실제값 (Y)</th>
                    <th>적합치 (Ŷ)</th>
                    <th>잔차 (e = Y − Ŷ)</th>
                    <th>표준화 잔차 (d)</th>
                    <th>판정</th>
                  </tr>
                </thead>
                <tbody>
                  {reducedAnalysis.observations.map(o => (
                    <tr key={o.id}>
                      <td className="font-mono-num font-bold">{o.runOrder}</td>
                      <td className="font-mono-num text-[#7c828a]">{o.stdOrder}</td>
                      <td className="font-mono-num">{o.y.toFixed(2)}</td>
                      <td className="font-mono-num">{o.yHat.toFixed(3)}</td>
                      <td className={`font-mono-num font-bold ${o.resid >= 0 ? 'text-[#05b169]' : 'text-[#cf202f]'}`}>
                        {o.resid >= 0 ? '+' : ''}{o.resid.toFixed(3)}
                      </td>
                      <td className="font-mono-num">{o.stdResid.toFixed(2)}</td>
                      <td>
                        {Math.abs(o.stdResid) <= 2.5 ? (
                          <span className="doe-badge-sig">양호</span>
                        ) : (
                          <span className="doe-badge-pool">주의</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-[#dee1e6]">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 축소 모형</button>
          <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 수학적 모형 <ArrowRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { codedToActualVal, predictFromModel, oneSampleTTest, andersonDarlingTest } from '../doeEngine';
import { ConfirmationChartsSvg, ConfirmationHistogramSvg, NormalProbSvg } from './SvgCharts';

export default function Step09Confirmation({ project, updateProject, reducedAnalysis, onPrev, onNext }) {
  const { design, optimizer, confirmation } = project;
  const fileRef = useRef(null);
  const [countInput, setCountInput] = useState(confirmation.values?.length || 30);
  const [showFormula, setShowFormula] = useState(false);

  const selectedCoded = optimizer.selectedCoded?.length === design.factors.length
    ? optimizer.selectedCoded
    : design.factors.map(() => 0);

  const predictedY = useMemo(
    () => (reducedAnalysis ? predictFromModel(reducedAnalysis, selectedCoded) : 0),
    [reducedAnalysis, selectedCoded]
  );

  const validValues = useMemo(
    () => (confirmation.values || []).map(v => parseFloat(v)).filter(Number.isFinite),
    [confirmation.values]
  );

  const tResult = useMemo(() => {
    if (validValues.length < 2) return null;
    return oneSampleTTest({
      values: validValues,
      mu0: predictedY,
      alternative: confirmation.alternative || 'two-sided',
      alpha: confirmation.alpha || 0.05,
    });
  }, [validValues, predictedY, confirmation.alternative, confirmation.alpha]);

  const adResult = useMemo(() => andersonDarlingTest(validValues), [validValues]);

  const updateConf = (patch) => updateProject({ confirmation: { ...confirmation, ...patch } });

  const applyCount = () => {
    const n = Math.max(2, Math.min(100, parseInt(countInput, 10) || 30));
    const cur = confirmation.values || [];
    let next = [];
    if (cur.length >= n) {
      next = cur.slice(0, n);
    } else {
      next = [...cur];
      while (next.length < n) next.push('');
    }
    updateConf({ values: next });
  };

  const updateCell = (idx, val) => {
    const next = [...(confirmation.values || [])];
    next[idx] = val;
    updateConf({ values: next });
  };

  const clearValues = () => {
    if (confirm('재현 실험 입력 데이터를 모두 초기화하시겠습니까?')) {
      updateConf({ values: new Array(confirmation.values?.length || 30).fill('') });
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const extracted = [];
        for (let r = 0; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!row) continue;
          for (let c = 0; c < row.length; c++) {
            const v = parseFloat(row[c]);
            if (Number.isFinite(v)) extracted.push(v);
          }
        }
        if (extracted.length >= 2) {
          updateConf({ values: extracted.map(String) });
          setCountInput(extracted.length);
        } else {
          alert('엑셀 파일에서 2개 이상의 수치형 측정값을 찾을 수 없습니다.');
        }
      } catch (err) {
        alert('엑셀 파일 파싱에 실패했습니다.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const loadSample30 = () => {
    const sample30 = [
      48.5, 49.2, 49.8, 48.9, 49.1, 49.6, 48.7, 49.3, 49.0, 49.5,
      48.8, 49.4, 49.9, 49.1, 48.6, 49.7, 49.2, 48.9, 49.3, 49.0,
      49.6, 48.7, 49.4, 49.8, 48.9, 49.2, 49.5, 48.8, 49.3, 49.1,
    ];
    updateConf({ values: sample30.map(String) });
    setCountInput(30);
  };

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">CONFIRMATION EXPERIMENT / 09</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">9단계 · 재현 실험 및 가설검정</h2>
        <p className="text-sm text-[#e0e7ff]">최종 도출된 최적 공정 조건으로 확인 실험을 수행하고, 1-Sample t-Test로 모형 재현성을 통계적으로 입증합니다.</p>
      </div>

      {/* Confirmation Conditions */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3 mb-4">
          <div>
            <h3 className="font-editorial text-lg text-[#1e293b]">재현 실험 대상 공정 조건</h3>
            <p className="text-xs text-[#64748b]">8단계에서 확정된 공정 조건으로 실측 재현 실험을 진행합니다.</p>
          </div>
          <div className="p-2.5 px-4 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-xs text-[#64748b]">최적 조건 예측값 Ŷ: </span>
            <strong className="font-mono-num text-sm text-[#4555a2]">
              {predictedY.toFixed(2)} {design.responseUnit}
            </strong>
          </div>
        </div>

        <div className="doe-table-wrap mb-2">
          <table className="doe-table">
            <thead>
              <tr>
                {design.factors.map(f => (
                  <th key={f.symbol}>{f.symbol} · {f.name}</th>
                ))}
                <th>모형 예측치 (Ŷ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {design.factors.map((f, i) => (
                  <td key={f.symbol} className="font-mono-num">
                    <strong>{codedToActualVal(f, selectedCoded[i])}</strong> {f.unit}
                    <span className="text-[11px] text-[#64748b] ml-1">({selectedCoded[i] > 0 ? '+' : ''}{selectedCoded[i].toFixed(2)})</span>
                  </td>
                ))}
                <td className="font-mono-num font-bold text-[#4555a2]">
                  {predictedY.toFixed(2)} {design.responseUnit}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Entry & Upload */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3 mb-4">
          <div>
            <h3 className="font-editorial text-lg text-[#1e293b]">
              재현 실험 측정값 입력 ({validValues.length} / {(confirmation.values || []).length}회)
            </h3>
            <p className="text-xs text-[#64748b]">엑셀 파일 업로드 또는 아래 격자 표에 직접 측정값을 입력하세요.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileRef}
              onChange={handleExcelUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button onClick={() => fileRef.current?.click()} className="doe-btn doe-btn-secondary text-xs">
              <Upload size={14} /> 엑셀 업로드
            </button>
            <button onClick={loadSample30} className="doe-btn doe-btn-secondary text-xs">
              샘플 30회 불러오기
            </button>
            <button onClick={clearValues} className="doe-btn doe-btn-secondary text-xs text-[#cf202f]">
              <Trash2 size={14} /> 데이터 지우기
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-semibold text-[#64748b]">실험 횟수 N 설정:</span>
          <input
            type="number"
            min={2}
            max={100}
            value={countInput}
            onChange={e => setCountInput(e.target.value)}
            className="doe-input w-24 font-mono-num text-xs py-1"
          />
          <button onClick={applyCount} className="doe-btn doe-btn-dark text-xs py-1 px-3">
            칸 수 적용
          </button>
        </div>

        {/* 3-column Data Entry Table matching reference site */}
        <div className="doe-table-wrap max-h-[300px] overflow-y-auto mb-4">
          <table className="doe-table text-xs">
            <thead>
              <tr>
                <th>회차</th><th>실제 측정값</th>
                <th>회차</th><th>실제 측정값</th>
                <th>회차</th><th>실제 측정값</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const vals = confirmation.values || [];
                const rows = Math.ceil(vals.length / 3);
                const out = [];
                for (let r = 0; r < rows; r++) {
                  const i1 = r;
                  const i2 = r + rows;
                  const i3 = r + rows * 2;
                  out.push(
                    <tr key={r}>
                      <td className="font-mono-num font-semibold bg-[#f8fafc]">{i1 + 1}</td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          value={vals[i1] ?? ''}
                          onChange={e => updateCell(i1, e.target.value)}
                          className="doe-input py-1 px-2 text-xs w-28 text-center font-mono-num"
                        />
                      </td>
                      <td className="font-mono-num font-semibold bg-[#f8fafc]">{i2 < vals.length ? i2 + 1 : '-'}</td>
                      <td>
                        {i2 < vals.length && (
                          <input
                            type="number"
                            step="any"
                            value={vals[i2] ?? ''}
                            onChange={e => updateCell(i2, e.target.value)}
                            className="doe-input py-1 px-2 text-xs w-28 text-center font-mono-num"
                          />
                        )}
                      </td>
                      <td className="font-mono-num font-semibold bg-[#f8fafc]">{i3 < vals.length ? i3 + 1 : '-'}</td>
                      <td>
                        {i3 < vals.length && (
                          <input
                            type="number"
                            step="any"
                            value={vals[i3] ?? ''}
                            onChange={e => updateCell(i3, e.target.value)}
                            className="doe-input py-1 px-2 text-xs w-28 text-center font-mono-num"
                          />
                        )}
                      </td>
                    </tr>
                  );
                }
                return out;
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hypothesis Testing (1-Sample t-Test) Result */}
      {tResult && (
        <div className="doe-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3 mb-4">
            <div>
              <h3 className="font-editorial text-lg text-[#1e293b]">가설검정 (1표본 t-검정) 결과</h3>
              <p className="text-xs text-[#64748b]">
                귀무가설 H₀: μ = {predictedY.toFixed(2)} vs 대립가설 H₁: μ ≠ {predictedY.toFixed(2)} (유의수준 α = {tResult.alpha * 100}%)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#64748b]">검정 방향:</span>
              <select
                value={confirmation.alternative || 'two-sided'}
                onChange={e => updateConf({ alternative: e.target.value })}
                className="doe-input text-xs py-1.5"
              >
                <option value="two-sided">양측검정 (≠)</option>
                <option value="greater">단측검정 (&gt;)</option>
                <option value="less">단측검정 (&lt;)</option>
              </select>
            </div>
          </div>

          <div className="doe-table-wrap mb-4">
            <table className="doe-table">
              <thead>
                <tr>
                  <th>표본수 (N)</th>
                  <th>실측 평균 (X̄)</th>
                  <th>표본 표준편차 (S)</th>
                  <th>평균 표준오차 (SE)</th>
                  <th>편차 (X̄ − Ŷ)</th>
                  <th>95% 신뢰구간 (CI)</th>
                  <th>t-통계량</th>
                  <th>P-value</th>
                  <th>검정 판정</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono-num font-bold">{tResult.n}</td>
                  <td className="font-mono-num font-bold text-[#4555a2]">{tResult.mean.toFixed(3)}</td>
                  <td className="font-mono-num">{tResult.sd.toFixed(3)}</td>
                  <td className="font-mono-num">{tResult.se.toFixed(3)}</td>
                  <td className="font-mono-num">{(tResult.mean - predictedY).toFixed(3)}</td>
                  <td className="font-mono-num">[{tResult.ciLow.toFixed(2)}, {tResult.ciHigh.toFixed(2)}]</td>
                  <td className="font-mono-num font-bold">{tResult.tStat.toFixed(3)}</td>
                  <td className="font-mono-num font-bold">{tResult.pVal.toFixed(4)}</td>
                  <td>
                    {!tResult.rejectH0 ? (
                      <span className="doe-badge-sig">H₀ 채택 (재현 성공)</span>
                    ) : (
                      <span className="doe-badge-pool">H₀ 기각 (차이 존재)</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Conclusion Callout */}
          <div className={`p-5 rounded-2xl border mb-5 ${!tResult.rejectH0 ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-red-50 border-red-200'}`}>
            <h4 className={`font-semibold text-sm flex items-center gap-2 mb-1.5 ${!tResult.rejectH0 ? 'text-[#05b169]' : 'text-[#cf202f]'}`}>
              {!tResult.rejectH0 ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              통계적 가설검정 최종 결론
            </h4>
            <p className="text-xs text-[#1e293b] leading-relaxed">
              {!tResult.rejectH0
                ? `P-value = ${tResult.pVal.toFixed(4)} > 0.05 이므로 유의수준 5%에서 귀무가설 H₀를 기각하지 못합니다. 즉, 모형의 예측치(Ŷ = ${predictedY.toFixed(2)})와 실제 공정 재현 실측 평균(X̄ = ${tResult.mean.toFixed(2)}) 간에 통계적으로 유의한 차이가 없습니다. 최적 조건의 재현성이 완벽히 검증되었습니다.`
                : `P-value = ${tResult.pVal.toFixed(4)} ≤ 0.05 이므로 귀무가설 H₀가 기각되었습니다. 모형 예측치와 실측 결과 사이에 통계적 유의차(편차 = ${(tResult.mean - predictedY).toFixed(2)})가 존재하므로 공정 산포나 외부 환경 인자를 재검토하세요.`}
            </p>
          </div>

          {/* Formula Breakdown Accordion */}
          <div className="mb-5">
            <button onClick={() => setShowFormula(v => !v)} className="doe-btn doe-btn-secondary text-xs">
              {showFormula ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              검정 계산식 및 통계 산출 과정 보기
            </button>
            {showFormula && (
              <div className="mt-3 p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] text-xs space-y-2 font-mono-num text-[#475569]">
                <div>1. 평균 표준오차: SE = S / √N = {tResult.sd.toFixed(4)} / √{tResult.n} = {tResult.se.toFixed(4)}</div>
                <div>2. t-통계량: T = (X̄ − μ₀) / SE = ({tResult.mean.toFixed(4)} − {predictedY.toFixed(4)}) / {tResult.se.toFixed(4)} = {tResult.tStat.toFixed(4)}</div>
                <div>3. 자유도 DF = N − 1 = {tResult.df}, 양측 임계값 t_crit(0.025, {tResult.df}) = ±{tResult.tCrit.toFixed(3)}</div>
                <div>4. 실측 평균 95% 신뢰구간: X̄ ± t_crit × SE = {tResult.mean.toFixed(3)} ± {tResult.tCrit.toFixed(3)} × {tResult.se.toFixed(3)} = [{tResult.ciLow.toFixed(3)}, {tResult.ciHigh.toFixed(3)}]</div>
                {adResult && (
                  <div className="pt-2 border-t border-[#e2e8f0]">
                    5. Anderson-Darling 정규성 검정: AD = {adResult.ad.toFixed(4)}, P-value = {adResult.pVal.toFixed(4)}
                    {adResult.pVal >= 0.05 ? ' (정규분포 가정 충족)' : ' (정규분포 주의)'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirmation Charts */}
          <ConfirmationChartsSvg values={validValues} mu0={predictedY} tResult={tResult} />

          <div className="mt-4">
            <ConfirmationHistogramSvg values={validValues} mu0={predictedY} />
          </div>

          <div className="flex justify-between mt-6 pt-4 border-t border-[#e2e8f0]">
            <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 반응 최적화</button>
            <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 결과 리포트 작성 <ArrowRight size={16} /></button>
          </div>
        </div>
      )}

      {!tResult && (
        <div className="doe-card flex justify-between">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 반응 최적화</button>
          <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 결과 리포트 작성 <ArrowRight size={16} /></button>
        </div>
      )}
    </div>
  );
}

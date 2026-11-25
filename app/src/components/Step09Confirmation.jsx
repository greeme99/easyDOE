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
    const n = Math.max(2, Math.min(100, parseInt(countInput, 10) || 10));
    const cur = [...(confirmation.values || [])];
    while (cur.length < n) cur.push('');
    updateConf({ count: n, values: cur.slice(0, n) });
  };

  const handleUploadExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const nums = [];
        rows.forEach(r => {
          r.forEach(cell => {
            const n = parseFloat(cell);
            if (Number.isFinite(n)) nums.push(n);
          });
        });
        if (nums.length) {
          setCountInput(nums.length);
          updateConf({ count: nums.length, values: nums });
        }
      } catch {
        alert('엑셀 파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">CONFIRMATION EXPERIMENT / 09</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">9단계 · 재현 실험 및 가설검정</h2>
        <p className="text-sm text-[#a8acb3]">도출된 최적 조건에서 실제 재현 실험을 수행하고, 1표본 t검정 및 Anderson-Darling 정규성 검정으로 재현성을 입증합니다.</p>
      </div>

      {/* Selected Condition */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#0a0b0d] mb-3">선정된 재현 실험 조건</h3>
        <div className="doe-table-wrap">
          <table className="doe-table">
            <thead>
              <tr>
                {design.factors.map(f => (
                  <th key={f.symbol}>{f.symbol} · {f.name} ({f.unit})</th>
                ))}
                <th className="bg-[#eef0f3]">최적 조건 예측값 Ŷ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {design.factors.map((f, idx) => (
                  <td key={f.symbol} className="font-mono-num font-bold">
                    {codedToActualVal(f, selectedCoded[idx])} <span className="text-xs text-[#7c828a]">(x={selectedCoded[idx].toFixed(2)})</span>
                  </td>
                ))}
                <td className="font-mono-num font-bold text-[#0052ff] bg-[#ffffff]">
                  {predictedY.toFixed(3)} {design.responseUnit}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Measurement Grid */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dee1e6] pb-3 mb-4">
          <h3 className="font-editorial text-lg text-[#0a0b0d]">재현 실험 측정값 ({validValues.length} / {confirmation.values.length})</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min={2} max={100} value={countInput} onChange={e => setCountInput(e.target.value)} className="doe-input w-20 text-center" />
            <button onClick={applyCount} className="doe-btn doe-btn-secondary text-xs">입력칸 적용</button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUploadExcel} />
            <button onClick={() => fileRef.current?.click()} className="doe-btn doe-btn-secondary text-xs">
              <Upload size={14} /> 엑셀 업로드
            </button>
            <button onClick={() => updateConf({ values: confirmation.values.map(() => '') })} className="doe-btn doe-btn-secondary text-xs text-[#cf202f]">
              <Trash2 size={14} /> 데이터 지우기
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {confirmation.values.map((val, idx) => (
            <div key={idx} className="flex items-center gap-1.5 bg-[#ffffff] border border-[#dee1e6] rounded-lg px-2.5 py-1.5">
              <span className="text-xs font-mono-num text-[#7c828a] w-6">#{idx + 1}</span>
              <input
                type="number"
                step="any"
                value={val}
                onChange={e => {
                  const next = [...confirmation.values];
                  next[idx] = e.target.value;
                  updateConf({ values: next });
                }}
                className="w-full bg-transparent text-sm font-mono-num font-semibold text-[#0a0b0d] outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Comparison & Hypothesis Testing */}
      {tResult && (
        <div className="doe-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dee1e6] pb-3 mb-4">
            <h3 className="font-editorial text-lg text-[#0a0b0d]">예측값과 재현 실험 결과 비교 · 1표본 t검정</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="doe-badge-sig">1표본 t검정 (활성)</span>
              <span className="doe-badge-muted">2표본 t검정 · 비율검정 (2차 개발 예정)</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-4 p-3 rounded-lg bg-[#f7f7f7] border border-[#dee1e6]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">대립가설 H₁:</span>
              <select
                value={confirmation.alternative || 'two-sided'}
                onChange={e => updateConf({ alternative: e.target.value })}
                className="doe-input py-1 text-xs"
              >
                <option value="two-sided">μ ≠ {predictedY.toFixed(2)} (양측)</option>
                <option value="greater">μ &gt; {predictedY.toFixed(2)}</option>
                <option value="less">μ &lt; {predictedY.toFixed(2)}</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">유의수준 α:</span>
              <select
                value={confirmation.alpha || 0.05}
                onChange={e => updateConf({ alpha: parseFloat(e.target.value) })}
                className="doe-input py-1 text-xs"
              >
                <option value={0.05}>5% (0.05)</option>
                <option value={0.01}>1% (0.01)</option>
                <option value={0.1}>10% (0.10)</option>
              </select>
            </div>
          </div>

          <div className="doe-table-wrap mb-5">
            <table className="doe-table">
              <thead>
                <tr>
                  <th>N</th>
                  <th>예측값 (H₀)</th>
                  <th>실측 평균</th>
                  <th>표준편차</th>
                  <th>SE 평균</th>
                  <th>실측 95% 신뢰구간</th>
                  <th>T-통계량</th>
                  <th>P-value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-mono-num">{tResult.n}</td>
                  <td className="font-mono-num font-semibold">{predictedY.toFixed(3)}</td>
                  <td className="font-mono-num font-bold text-[#05b169]">{tResult.mean.toFixed(3)}</td>
                  <td className="font-mono-num">{tResult.sd.toFixed(3)}</td>
                  <td className="font-mono-num">{tResult.se.toFixed(3)}</td>
                  <td className="font-mono-num">({tResult.ciLow.toFixed(3)}, {tResult.ciHigh.toFixed(3)})</td>
                  <td className="font-mono-num font-bold">{tResult.tStat.toFixed(3)}</td>
                  <td className="font-mono-num font-bold">{tResult.pVal.toFixed(4)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={`p-4 rounded-lg border mb-5 flex items-start gap-2.5 ${
            !tResult.rejectH0 ? 'bg-[#eef0f3] border-[#dee1e6] text-[#05b169]' : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {!tResult.rejectH0 ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
            <div className="text-sm">
              <strong>가설검정 결론:</strong>{' '}
              {!tResult.rejectH0
                ? `P-value(${tResult.pVal.toFixed(4)}) ≥ α(${confirmation.alpha || 0.05}) 이므로 귀무가설(H₀)을 기각하지 못합니다. 재현 실험 실측 평균(${tResult.mean.toFixed(2)})은 모형 예측값(${predictedY.toFixed(2)})과 통계적으로 일치합니다.`
                : `P-value(${tResult.pVal.toFixed(4)}) < α(${confirmation.alpha || 0.05}) 이므로 귀무가설을 기각합니다. 실측 평균과 예측값 사이에 통계적 차이가 존재합니다.`}
            </div>
          </div>

          <ConfirmationChartsSvg values={validValues} mu0={predictedY} tResult={tResult} />

          <div className="mt-4">
            <ConfirmationHistogramSvg values={validValues} mu0={predictedY} />
          </div>

          <div className="mt-4">
            <button onClick={() => setShowFormula(v => !v)} className="doe-btn doe-btn-secondary text-xs">
              {showFormula ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              검정 계산식 보기
            </button>
            {showFormula && (
              <div className="mt-3 p-4 rounded-2xl bg-[#f7f7f7] border border-[#dee1e6] font-mono-num text-xs space-y-1.5 text-[#0a0b0d]">
                <div>1) 평균 표준오차: SE = s / √N = {tResult.sd.toFixed(4)} / √{tResult.n} = {tResult.se.toFixed(4)}</div>
                <div>2) T-통계량: T = (X̄ − μ₀) / SE = ({tResult.mean.toFixed(4)} − {predictedY.toFixed(4)}) / {tResult.se.toFixed(4)} = {tResult.tStat.toFixed(4)} (DF = {tResult.df})</div>
                <div>3) 95% 신뢰구간: ({tResult.ciLow.toFixed(4)}, {tResult.ciHigh.toFixed(4)})</div>
              </div>
            )}
          </div>

          {adResult && (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <NormalProbSvg
                points={validValues.map(v => ({ val: v, sig: false }))}
                title="정규성 검정 · Anderson-Darling"
                xLabel={`${design.responseName} (${design.responseUnit})`}
              />
              <div className="p-4 rounded-lg bg-[#f7f7f7] border border-[#dee1e6] space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#0052ff]">Anderson-Darling 정규성 검정</div>
                <div className="text-sm font-mono-num">
                  N = {adResult.n}, &nbsp; AD = {adResult.ad.toFixed(3)}, &nbsp; P-value = {adResult.pVal.toFixed(3)}
                </div>
                <p className="text-xs text-[#7c828a]">
                  {adResult.pVal >= 0.05
                    ? 'P ≥ 0.05 이므로 재현 실험 데이터는 정규분포를 따릅니다 (t-검정 가정 충족).'
                    : 'P < 0.05 이므로 정규성 가정에 주의가 필요합니다 (N ≥ 30인 경우 중심극한정리 적용 가능).'}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t border-[#dee1e6]">
            <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 반응 최적화</button>
            <button onClick={onNext} className="doe-btn doe-btn-primary">다음 단계 · 결과 리포트 작성 <ArrowRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Shuffle, RotateCcw, ArrowRight, CheckCircle2 } from 'lucide-react';
import { FACTOR_SYMBOLS, generateDesignRuns } from '../doeEngine';

export default function Step01Design({ project, updateProject, onNext }) {
  const { design, runs } = project;
  const [subStep, setSubStep] = useState(1);

  const rebuildRuns = (nextDesign) => {
    const existingY = {};
    runs.forEach(r => { existingY[r.id] = r.y; });
    const nextRuns = generateDesignRuns({
      factors: nextDesign.factors,
      replicates: nextDesign.replicates,
      centerPoints: nextDesign.centerPoints,
      seed: nextDesign.seed,
      randomize: nextDesign.randomize,
      existingY,
    });
    updateProject({ design: nextDesign, runs: nextRuns });
  };

  const setFactorCount = (cnt) => {
    const nextCount = parseInt(cnt, 10);
    const nextFactors = [];
    for (let i = 0; i < nextCount; i++) {
      const sym = FACTOR_SYMBOLS[i];
      const prev = design.factors[i];
      nextFactors.push(prev || {
        symbol: sym,
        name: `인자 ${sym}`,
        unit: '-',
        type: 'numeric',
        lowVal: '10',
        highVal: '20',
        currentVal: '15',
      });
    }
    rebuildRuns({ ...design, factorCount: nextCount, factors: nextFactors });
  };

  const updateFactor = (idx, field, val) => {
    const nextFactors = design.factors.map((f, i) => (i === idx ? { ...f, [field]: val } : f));
    rebuildRuns({ ...design, factors: nextFactors });
  };

  const exportDesignExcel = () => {
    const rows = runs.map(r => {
      const row = {
        실행순서: r.runOrder,
        표준순서: r.stdOrder,
        반복: r.isCenter ? '중심점' : r.rep,
      };
      design.factors.forEach(f => {
        row[`${f.symbol} (${f.name}${f.unit && f.unit !== '-' ? `, ${f.unit}` : ''})`] = r.actual[f.symbol];
      });
      row[`${design.responseName} (${design.responseUnit})`] = r.y ?? '';
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '실험설계표');
    XLSX.writeFile(wb, `${project.name}_실험설계표.xlsx`);
  };

  const totalBase = 1 << design.factorCount;
  const totalRuns = totalBase * design.replicates + design.centerPoints;

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">EXPERIMENT DESIGN / 01</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">1단계 · 실험설계</h2>
        <p className="text-sm text-[#a8acb3]">요인수, 수준, 반복수, 중심점 및 인자/반응치 정보를 설정하여 표준 또는 무작위 실험계획표를 생성합니다.</p>
      </div>

      {/* Step-by-Step Guided Card */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dee1e6] pb-3 mb-5">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#0052ff]">STEP BY STEP · 실험설계 조건 입력</span>
            <h3 className="font-editorial text-lg text-[#0a0b0d]">단계별 설계 조건 설정 ({String(subStep).padStart(2, '0')} / 08)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSubStep(1)} className="doe-btn doe-btn-secondary text-xs py-1.5 px-3">1스텝으로 이동</button>
            <button onClick={() => setSubStep(s => Math.max(1, s - 1))} disabled={subStep === 1} className="doe-btn doe-btn-secondary text-xs py-1.5 px-3">이전 스텝</button>
            <button onClick={() => setSubStep(s => Math.min(8, s + 1))} disabled={subStep === 8} className="doe-btn doe-btn-primary text-xs py-1.5 px-3">다음 스텝</button>
          </div>
        </div>

        {/* 8 Substep Pills */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 mb-5">
          {[
            '01 DOE TYPE', '02 FACTORS', '03 LEVELS', '04 REPLICATES',
            '05 CENTER PT', '06 NAMES', '07 LEVELS/TYPE', '08 RESPONSE'
          ].map((lbl, i) => (
            <button
              key={lbl}
              onClick={() => setSubStep(i + 1)}
              className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition ${
                subStep === i + 1
                  ? 'bg-[#0052ff] text-white border-[#0052ff]'
                  : 'bg-[#f7f7f7] text-[#5b616e] border-[#dee1e6] hover:bg-[#eef0f3]'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Substep Content */}
        <div className="p-5 rounded-lg bg-[#f7f7f7] border border-[#dee1e6]">
          {subStep === 1 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#0a0b0d]">01 · DOE 종류</label>
              <select
                value={design.doeType}
                onChange={e => updateProject({ design: { ...design, doeType: e.target.value } })}
                className="doe-input w-full max-w-md"
              >
                <option value="full_factorial">완전요인실험 (Full Factorial Design)</option>
                <option value="fractional" disabled>부분요인실험 · 2단계 개발 예정</option>
                <option value="rsm" disabled>반응표면실험(RSM) · 2단계 개발 예정</option>
              </select>
              <p className="text-xs text-[#7c828a]">모든 주효과 및 교호작용을 교락 없이 정밀하게 추정하는 완전요인설계를 사용합니다.</p>
            </div>
          )}

          {subStep === 2 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#0a0b0d]">02 · 인자수 (Factors)</label>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={design.factorCount}
                  onChange={e => setFactorCount(e.target.value)}
                  className="doe-input w-48"
                >
                  {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}개</option>)}
                </select>
                <span className="doe-badge-sig">2^{design.factorCount} · {totalBase}개 완전요인 처리조합</span>
              </div>
            </div>
          )}

          {subStep === 3 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#0a0b0d]">03 · 인자별 수준수 (Levels)</label>
              <select value={design.levels} disabled className="doe-input w-full max-w-md">
                <option value={2}>2수준 (−1 / +1)</option>
                <option value={3} disabled>3수준 · 후속 개발 예정</option>
              </select>
            </div>
          )}

          {subStep === 4 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#0a0b0d]">04 · 처리조합당 반복수 (Replications)</label>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={design.replicates}
                  onChange={e => rebuildRuns({ ...design, replicates: parseInt(e.target.value, 10) })}
                  className="doe-input w-48"
                >
                  {[1, 2, 3, 4].map(r => <option key={r} value={r}>{r}회</option>)}
                </select>
                <span className="doe-badge-sig">{totalBase}개 조합 × {design.replicates}회 = {totalBase * design.replicates}회</span>
              </div>
            </div>
          )}

          {subStep === 5 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#0a0b0d]">05 · 중심점 추가 횟수 (Center Points)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={design.centerPoints}
                  onChange={e => rebuildRuns({ ...design, centerPoints: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="doe-input w-32"
                />
                <span className="text-xs text-[#7c828a]">중심점(0) 추가 시 순수 오차 추정에 활용됩니다 (곡률 검정은 후속 개발 단계에서 지원).</span>
              </div>
            </div>
          )}

          {subStep === 6 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#0a0b0d]">06 · 인자 이름 및 단위</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {design.factors.map((f, idx) => (
                  <div key={f.symbol} className="p-3 bg-white rounded-lg border border-[#dee1e6] space-y-2">
                    <div className="text-xs font-bold text-[#0052ff]">인자 {f.symbol}</div>
                    <input
                      type="text"
                      value={f.name}
                      onChange={e => updateFactor(idx, 'name', e.target.value)}
                      placeholder="인자 이름"
                      className="doe-input w-full"
                    />
                    <input
                      type="text"
                      value={f.unit}
                      onChange={e => updateFactor(idx, 'unit', e.target.value)}
                      placeholder="단위 (예: ℃, bar)"
                      className="doe-input w-full"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {subStep === 7 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#0a0b0d]">07 · 데이터 타입 및 수준 (-1 / +1 / 현재 조건)</label>
              <div className="doe-table-wrap">
                <table className="doe-table">
                  <thead>
                    <tr>
                      <th>기호</th>
                      <th>인자명</th>
                      <th>데이터 타입</th>
                      <th>낮은 수준 (−1)</th>
                      <th>높은 수준 (+1)</th>
                      <th>현재 조건 (선택)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {design.factors.map((f, idx) => (
                      <tr key={f.symbol}>
                        <td className="font-bold">{f.symbol}</td>
                        <td>{f.name}</td>
                        <td>
                          <select
                            value={f.type}
                            onChange={e => updateFactor(idx, 'type', e.target.value)}
                            className="doe-input"
                          >
                            <option value="numeric">수치형</option>
                            <option value="categorical">범주형</option>
                          </select>
                        </td>
                        <td><input className="doe-input w-24 text-center" value={f.lowVal} onChange={e => updateFactor(idx, 'lowVal', e.target.value)} /></td>
                        <td><input className="doe-input w-24 text-center" value={f.highVal} onChange={e => updateFactor(idx, 'highVal', e.target.value)} /></td>
                        <td><input className="doe-input w-24 text-center" value={f.currentVal || ''} onChange={e => updateFactor(idx, 'currentVal', e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subStep === 8 && (
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#0a0b0d]">08 · 반응치 (Response Y) 정의</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
                <div>
                  <span className="block text-xs text-[#7c828a] mb-1">반응치 이름</span>
                  <input
                    type="text"
                    value={design.responseName}
                    onChange={e => updateProject({ design: { ...design, responseName: e.target.value } })}
                    className="doe-input w-full"
                  />
                </div>
                <div>
                  <span className="block text-xs text-[#7c828a] mb-1">단위</span>
                  <input
                    type="text"
                    value={design.responseUnit}
                    onChange={e => updateProject({ design: { ...design, responseUnit: e.target.value } })}
                    className="doe-input w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Design Result Card */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dee1e6] pb-3 mb-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-[#05b169]">DESIGN RESULT · 완성된 실험설계</span>
            <h3 className="font-editorial text-lg text-[#0a0b0d]">
              {design.factorCount}인자 × 2수준 × {design.replicates}반복 + 중심점 {design.centerPoints}회 = 총 {totalRuns}회
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              value={design.seed}
              onChange={e => updateProject({ design: { ...design, seed: parseInt(e.target.value, 10) || 1 } })}
              className="doe-input w-20 text-center"
              title="무작위 순서 기준값(Seed)"
            />
            <button onClick={() => rebuildRuns({ ...design, randomize: true })} className="doe-btn doe-btn-secondary text-xs">
              <Shuffle size={14} /> 무작위 실행순서
            </button>
            <button onClick={() => rebuildRuns({ ...design, randomize: false })} className="doe-btn doe-btn-secondary text-xs">
              <RotateCcw size={14} /> 표준순서로 복원
            </button>
            <button onClick={exportDesignExcel} className="doe-btn doe-btn-dark text-xs">
              <Download size={14} /> 설계표 엑셀 저장
            </button>
          </div>
        </div>

        {/* Factor Summary */}
        <div className="doe-table-wrap mb-5">
          <table className="doe-table">
            <thead>
              <tr>
                <th>기호</th>
                <th>인자명</th>
                <th>단위</th>
                <th>타입</th>
                <th>낮은 수준 (−1)</th>
                <th>높은 수준 (+1)</th>
                <th>현재 조건</th>
              </tr>
            </thead>
            <tbody>
              {design.factors.map(f => (
                <tr key={f.symbol}>
                  <td className="font-bold text-[#0052ff]">{f.symbol}</td>
                  <td className="font-semibold">{f.name}</td>
                  <td>{f.unit}</td>
                  <td>{f.type === 'numeric' ? '수치형' : '범주형'}</td>
                  <td className="font-mono-num">{f.lowVal}</td>
                  <td className="font-mono-num">{f.highVal}</td>
                  <td className="font-mono-num text-[#7c828a]">{f.currentVal || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Full Design Matrix */}
        <div className="doe-table-wrap max-h-[380px] overflow-y-auto">
          <table className="doe-table">
            <thead>
              <tr>
                <th>실행순서</th>
                <th>표준순서</th>
                <th>반복</th>
                {design.factors.map(f => (
                  <th key={f.symbol}>{f.symbol} · {f.name} ({f.unit})</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id}>
                  <td className="font-mono-num font-bold">{r.runOrder}</td>
                  <td className="font-mono-num text-[#7c828a]">{r.stdOrder}</td>
                  <td>{r.isCenter ? <span className="doe-badge-pool">중심점</span> : r.rep}</td>
                  {design.factors.map(f => (
                    <td key={f.symbol} className="font-mono-num">
                      {r.actual[f.symbol]} <span className="text-[11px] text-[#7c828a]">({r.coded[f.symbol] > 0 ? '+1' : r.coded[f.symbol] < 0 ? '−1' : '0'})</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-[#dee1e6]">
          <button onClick={onNext} className="doe-btn doe-btn-primary">
            <CheckCircle2 size={16} /> 다음 단계 · 실험 결과 입력 <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

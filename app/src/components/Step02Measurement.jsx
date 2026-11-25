import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export default function Step02Measurement({ project, updateProject, onPrev, onNext }) {
  const { design, runs } = project;
  const fullFileRef = useRef(null);
  const yFileRef = useRef(null);
  const [checkMsg, setCheckMsg] = useState(null);

  const handleYChange = (runId, value) => {
    const nextRuns = runs.map(r => (r.id === runId ? { ...r, y: value } : r));
    updateProject({ runs: nextRuns });
    setCheckMsg(null);
  };

  const runInputCheck = () => {
    const missing = runs.filter(r => r.y === '' || r.y === null || !Number.isFinite(parseFloat(r.y)));
    if (missing.length === 0) {
      setCheckMsg({ ok: true, text: `총 ${runs.length}개 실행의 측정값이 모두 유효하게 입력되었습니다. 다음 단계로 진행할 수 있습니다.` });
    } else {
      setCheckMsg({ ok: false, text: `미입력 또는 유효하지 않은 측정값이 ${missing.length}건 있습니다. (실행순서: ${missing.map(m => m.runOrder).join(', ')})` });
    }
  };

  const downloadYTemplate = () => {
    const rows = runs.map(r => ({
      실행순서: r.runOrder,
      표준순서: r.stdOrder,
      [`${design.responseName} (${design.responseUnit})`]: r.y ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Y값_입력양식');
    XLSX.writeFile(wb, `${project.name}_Y값_양식.xlsx`);
  };

  const exportMeasuredExcel = () => {
    const rows = runs.map(r => {
      const row = { 실행순서: r.runOrder, 표준순서: r.stdOrder, 반복: r.isCenter ? '중심점' : r.rep };
      design.factors.forEach(f => { row[`${f.symbol} (${f.name})`] = r.actual[f.symbol]; });
      row[`${design.responseName} (${design.responseUnit})`] = r.y === '' ? '' : parseFloat(r.y);
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '실험데이터');
    XLSX.writeFile(wb, `${project.name}_실험결과.xlsx`);
  };

  const handleUploadExcel = (e, mode) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        if (!rows.length) return;
        const nextRuns = runs.map((r, idx) => {
          const row = rows.find(rw => Number(rw['실행순서']) === r.runOrder || Number(rw['표준순서']) === r.stdOrder) || rows[idx];
          if (!row) return r;
          const keys = Object.keys(row);
          const yKey = keys[keys.length - 1];
          const val = row[yKey];
          return val !== undefined && val !== '' ? { ...r, y: parseFloat(val) } : r;
        });
        updateProject({ runs: nextRuns });
        setCheckMsg({ ok: true, text: `${mode === 'full' ? '설계표 전체' : 'Y값'} 엑셀(${file.name})을 성공적으로 반영했습니다.` });
      } catch {
        setCheckMsg({ ok: false, text: '엑셀 파일을 읽는 중 오류가 발생했습니다.' });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const validCount = runs.filter(r => r.y !== '' && Number.isFinite(parseFloat(r.y))).length;

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">MEASUREMENT / 02</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">2단계 · 실험 결과 입력</h2>
        <p className="text-sm text-[#e0e7ff]">측정된 반응치({design.responseName}, {design.responseUnit})를 엑셀로 일괄 업로드하거나 표에 직접 입력하세요.</p>
      </div>

      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#1e293b] mb-3">측정값 파일 업로드 (.xlsx)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-[#f7f7f7] border border-dashed border-[#dee1e6] flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm text-[#1e293b]">① 설계표 전체 업로드</div>
              <div className="text-xs text-[#7c828a]">마지막 열의 반응치 Y를 자동 매칭합니다.</div>
            </div>
            <input ref={fullFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleUploadExcel(e, 'full')} />
            <button onClick={() => fullFileRef.current?.click()} className="doe-btn doe-btn-secondary text-xs">
              <Upload size={14} /> 파일 선택
            </button>
          </div>
          <div className="p-4 rounded-lg bg-[#f7f7f7] border border-dashed border-[#dee1e6] flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-sm text-[#1e293b]">② Y값만 업로드</div>
              <button onClick={downloadYTemplate} className="text-xs text-[#0052ff] underline font-semibold mt-0.5">
                Y값 입력 양식 엑셀 받기
              </button>
            </div>
            <input ref={yFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleUploadExcel(e, 'y')} />
            <button onClick={() => yFileRef.current?.click()} className="doe-btn doe-btn-secondary text-xs">
              <Upload size={14} /> 파일 선택
            </button>
          </div>
        </div>
      </div>

      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dee1e6] pb-3 mb-4">
          <div>
            <h3 className="font-editorial text-lg text-[#1e293b]">
              {design.responseName} ({design.responseUnit}) 측정값 ({validCount} / {runs.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={runInputCheck} className="doe-btn doe-btn-secondary text-xs">
              <CheckCircle2 size={14} /> 입력 점검
            </button>
            <button onClick={exportMeasuredExcel} className="doe-btn doe-btn-dark text-xs">
              <Download size={14} /> 실험 데이터 엑셀 저장
            </button>
          </div>
        </div>

        {checkMsg && (
          <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 text-sm ${
            checkMsg.ok ? 'bg-[#eef0f3] border-[#dee1e6] text-[#05b169]' : 'bg-red-50 border-red-200 text-[#cf202f]'
          }`}>
            {checkMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{checkMsg.text}</span>
          </div>
        )}

        <div className="doe-table-wrap max-h-[440px] overflow-y-auto">
          <table className="doe-table">
            <thead>
              <tr>
                <th>실행순서</th>
                <th>표준순서</th>
                <th>반복</th>
                {design.factors.map(f => (
                  <th key={f.symbol}>{f.symbol} · {f.name}</th>
                ))}
                <th className="bg-[#eef0f3]">{design.responseName} ({design.responseUnit})</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id}>
                  <td className="font-mono-num font-bold">{r.runOrder}</td>
                  <td className="font-mono-num text-[#7c828a]">{r.stdOrder}</td>
                  <td>{r.isCenter ? '중심점' : r.rep}</td>
                  {design.factors.map(f => (
                    <td key={f.symbol} className="font-mono-num">{r.actual[f.symbol]}</td>
                  ))}
                  <td className="bg-[#ffffff]">
                    <input
                      type="number"
                      step="any"
                      value={r.y}
                      onChange={e => handleYChange(r.id, e.target.value)}
                      className="doe-input w-28 text-center font-mono-num font-bold text-[#003ecc]"
                      placeholder="값 입력"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-[#dee1e6]">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary">
            <ArrowLeft size={16} /> 이전 단계 · 실험설계
          </button>
          <button onClick={onNext} disabled={validCount < 4} className="doe-btn doe-btn-primary">
            다음 단계 · Graph 분석 <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

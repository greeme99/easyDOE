import React, { useState, useMemo } from 'react';
import PptxGenJS from 'pptxgenjs';
import { ArrowLeft, Download, RefreshCw, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import {
  codedToActualVal,
  predictFromModel,
  predictionIntervals,
  oneSampleTTest,
  andersonDarlingTest,
  analyzeResidualsDiagnostics,
} from '../doeEngine';
import { formatCodedEquation } from './Step04FullModel';
import { formatUncodedEquation } from './Step07MathModel';
import {
  MainEffectsSvg,
  ParetoSvg,
  ResidualFourInOneSvg,
  ConfirmationChartsSvg,
  ConfirmationHistogramSvg,
  NormalProbSvg,
} from './SvgCharts';

const SLIDES = [
  { id: 1, title: '표지 · DOE 분석 완료 보고서' },
  { id: 2, title: '1·2단계 · 실험설계 및 실험결과' },
  { id: 3, title: '3단계 · Graph 분석' },
  { id: 4, title: '4단계 · 통계분석 (풀링 전 완전모형)' },
  { id: 5, title: '5단계 · 통계분석 (순차 풀링 축소모형)' },
  { id: 6, title: '6단계 · 잔차분석 (모형의 적합성)' },
  { id: 7, title: '7단계 · 최종 분석결과 종합정리' },
  { id: 8, title: '8단계 · 최적화' },
  { id: 9, title: '9단계 · 재현실험' },
  { id: 10, title: '9단계 · 가설검정' },
];

export default function Step10Report({ project, updateProject, fullAnalysis, reducedAnalysis, onPrev }) {
  const { design, runs, optimizer, confirmation, report, poolingHistory = [] } = project;
  const [slideIdx, setSlideIdx] = useState(0);
  const [exporting, setExporting] = useState(false);

  const selectedCoded = optimizer.selectedCoded?.length === design.factors.length
    ? optimizer.selectedCoded
    : design.factors.map(() => 0);

  const predY = useMemo(
    () => (reducedAnalysis ? predictFromModel(reducedAnalysis, selectedCoded) : 0),
    [reducedAnalysis, selectedCoded]
  );

  const intervals = useMemo(
    () => (reducedAnalysis ? predictionIntervals(reducedAnalysis, selectedCoded) : null),
    [reducedAnalysis, selectedCoded]
  );

  const validConf = useMemo(
    () => (confirmation.values || []).map(v => parseFloat(v)).filter(Number.isFinite),
    [confirmation.values]
  );

  const tResult = useMemo(() => {
    if (validConf.length < 2) return null;
    return oneSampleTTest({
      values: validConf,
      mu0: predY,
      alternative: confirmation.alternative || 'two-sided',
      alpha: confirmation.alpha || 0.05,
    });
  }, [validConf, predY, confirmation.alternative, confirmation.alpha]);

  const adResult = useMemo(() => andersonDarlingTest(validConf), [validConf]);
  const residDiag = useMemo(
    () => (reducedAnalysis ? analyzeResidualsDiagnostics(reducedAnalysis.observations) : null),
    [reducedAnalysis]
  );

  const updateReport = (patch) => updateProject({ report: { ...report, ...patch } });

  const exportPPT = async () => {
    setExporting(true);
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      pptx.title = report.title || project.name;

      // Helper for consistent slide header
      const makeSlide = (title, num) => {
        const s = pptx.addSlide();
        s.background = { color: 'FFFFFF' };
        s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.78, fill: { color: '0052FF' } });
        s.addText(title, { x: 0.5, y: 0.14, w: 7.8, h: 0.5, color: 'FFFFFF', fontSize: 17, bold: true });
        s.addText(`SLIDE ${num} / 10`, { x: 8.3, y: 0.18, w: 1.3, h: 0.4, color: 'DBEAFE', fontSize: 10, align: 'right' });
        return s;
      };

      const tblOpts = (x, y, w) => ({
        x, y, w,
        fontSize: 10,
        border: { pt: 0.75, color: 'DEE1E6' },
        fill: { color: 'FFFFFF' },
        color: '0A0B0D',
        align: 'center',
        valign: 'middle',
      });

      // Slide 1: Cover
      const s1 = pptx.addSlide();
      s1.background = { color: '003EC9' };
      s1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.22, h: 5.625, fill: { color: 'FFFFFF' } });
      s1.addText('easyDOE · 2^k FULL FACTORIAL ANALYSIS REPORT', { x: 0.8, y: 1.15, w: 8.5, h: 0.4, color: 'DBEAFE', fontSize: 12, bold: true });
      s1.addText(report.title || project.name, { x: 0.8, y: 1.7, w: 8.5, h: 1.2, color: 'FFFFFF', fontSize: 28, bold: true });
      s1.addText(`작성자: ${report.author}   |   작성일: ${report.date}   |   반응치: ${design.responseName} (${design.responseUnit})`, {
        x: 0.8, y: 3.3, w: 8.5, h: 0.45, color: 'DBEAFE', fontSize: 13,
      });
      s1.addText(`최적 예측치: ${predY.toFixed(2)} ${design.responseUnit}   |   수정 R²: ${reducedAnalysis?.r2Adj.toFixed(2) ?? '-'}%`, {
        x: 0.8, y: 3.9, w: 8.5, h: 0.45, color: 'FFFFFF', fontSize: 14, bold: true,
      });

      // Slide 2: Design & Measurements
      const s2 = makeSlide('2. 1·2단계 · 실험설계 및 실험결과', 2);
      s2.addText(`설계 요약: 2^${design.factorCount} 완전요인실험 × ${design.replicates}반복 + 중심점 ${design.centerPoints}회 = 총 ${runs.length}회`, {
        x: 0.5, y: 1.0, w: 9, h: 0.35, fontSize: 12, bold: true, color: '0A0B0D',
      });
      const factorRows = [
        [
          { text: '기호', options: { bold: true, fill: 'F7F7F7' } },
          { text: '인자명', options: { bold: true, fill: 'F7F7F7' } },
          { text: '단위', options: { bold: true, fill: 'F7F7F7' } },
          { text: '낮은 수준(-1)', options: { bold: true, fill: 'F7F7F7' } },
          { text: '높은 수준(+1)', options: { bold: true, fill: 'F7F7F7' } },
        ],
        ...design.factors.map(f => [f.symbol, f.name, f.unit, String(f.lowVal), String(f.highVal)]),
      ];
      s2.addTable(factorRows, tblOpts(0.5, 1.5, 9));

      // Slide 3: Graph Analysis
      const s3 = makeSlide('3. 3단계 · Graph 분석 (주효과 및 교호작용)', 3);
      if (fullAnalysis) {
        const effRows = [
          [
            { text: '항', options: { bold: true, fill: 'F7F7F7' } },
            { text: '구분', options: { bold: true, fill: 'F7F7F7' } },
            { text: '효과 (Effect)', options: { bold: true, fill: 'F7F7F7' } },
            { text: '회귀계수 (β)', options: { bold: true, fill: 'F7F7F7' } },
          ],
          ...fullAnalysis.termResults.map(t => [
            t.key,
            t.order === 1 ? '주효과' : `${t.order}차 교호작용`,
            t.effect.toFixed(3),
            t.coef.toFixed(3),
          ]),
        ];
        s3.addTable(effRows, tblOpts(0.5, 1.1, 9));
      }

      // Slide 4: Full Model ANOVA
      const s4 = makeSlide('4. 4단계 · 통계분석 (풀링 전 완전모형)', 4);
      if (fullAnalysis) {
        s4.addText(`S = ${fullAnalysis.s.toFixed(4)}   |   R² = ${fullAnalysis.r2.toFixed(2)}%   |   R²(수정) = ${fullAnalysis.r2Adj.toFixed(2)}%`, {
          x: 0.5, y: 1.0, w: 9, h: 0.35, fontSize: 12, bold: true, color: '0052FF',
        });
        const fullRows = [
          [
            { text: '항', options: { bold: true, fill: 'F7F7F7' } },
            { text: '효과', options: { bold: true, fill: 'F7F7F7' } },
            { text: '계수', options: { bold: true, fill: 'F7F7F7' } },
            { text: 'T', options: { bold: true, fill: 'F7F7F7' } },
            { text: 'P-value', options: { bold: true, fill: 'F7F7F7' } },
          ],
          ...fullAnalysis.termResults.map(t => [
            t.key,
            t.effect.toFixed(3),
            t.coef.toFixed(3),
            t.tVal !== null ? t.tVal.toFixed(2) : '-',
            t.pVal !== null ? t.pVal.toFixed(4) : '-',
          ]),
        ];
        s4.addTable(fullRows, tblOpts(0.5, 1.45, 9));
      }

      // Slide 5: Reduced Model
      const s5 = makeSlide('5. 5단계 · 통계분석 (순차 풀링 축소모형)', 5);
      if (reducedAnalysis) {
        s5.addText(`S = ${reducedAnalysis.s.toFixed(4)}   |   R² = ${reducedAnalysis.r2.toFixed(2)}%   |   R²(수정) = ${reducedAnalysis.r2Adj.toFixed(2)}%   |   오차 기여율 = ${reducedAnalysis.errorContribution.toFixed(2)}%`, {
          x: 0.5, y: 1.0, w: 9, h: 0.35, fontSize: 11.5, bold: true, color: '0052FF',
        });
        const redRows = [
          [
            { text: '유지 항', options: { bold: true, fill: 'F7F7F7' } },
            { text: '계수 (β)', options: { bold: true, fill: 'F7F7F7' } },
            { text: '기여율 (%)', options: { bold: true, fill: 'F7F7F7' } },
            { text: 'P-value', options: { bold: true, fill: 'F7F7F7' } },
          ],
          ...reducedAnalysis.activeTerms.map(t => [
            `${t.key} (${t.name})`,
            t.coef.toFixed(4),
            `${t.contribution.toFixed(2)}%`,
            t.pVal !== null ? (t.pVal < 0.0001 ? '< 0.0001' : t.pVal.toFixed(4)) : '-',
          ]),
        ];
        s5.addTable(redRows, tblOpts(0.5, 1.45, 9));
      }

      // Slide 6: Residuals
      const s6 = makeSlide('6. 6단계 · 잔차분석 (모형의 적합성)', 6);
      if (residDiag) {
        const resRows = [
          [
            { text: '진단 항목', options: { bold: true, fill: 'F7F7F7' } },
            { text: '산출 통계량', options: { bold: true, fill: 'F7F7F7' } },
            { text: '판정 기준', options: { bold: true, fill: 'F7F7F7' } },
            { text: '결과', options: { bold: true, fill: 'F7F7F7' } },
          ],
          ['정규성 (AD)', `AD=${residDiag.ad?.ad.toFixed(3) ?? '-'}, P=${residDiag.ad?.pVal.toFixed(3) ?? '-'}`, 'P ≥ 0.05', residDiag.normalOk ? '양호' : '주의'],
          ['등분산성', `분산비 = ${residDiag.varRatio.toFixed(2)}`, '분산비 < 4.0', residDiag.homoOk ? '양호' : '주의'],
          ['독립성', `Lag-1 r = ${residDiag.lag1.toFixed(3)}`, '|r| < 0.5', residDiag.indepOk ? '양호' : '주의'],
          ['특이점 점검', `최대 |d| = ${residDiag.maxStd.toFixed(2)}`, '|d| < 3.0', residDiag.outlierOk ? '양호' : '주의'],
        ];
        s6.addTable(resRows, tblOpts(0.5, 1.2, 9));
      }

      // Slide 7: Mathematical Model
      const s7 = makeSlide('7. 7단계 · 최종 분석결과 종합정리', 7);
      s7.addText(`코드화 회귀식 (Coded Units):\n${formatCodedEquation(reducedAnalysis, design.responseName)}`, {
        x: 0.5, y: 1.1, w: 9, h: 1.2, fontSize: 12, color: '0A0B0D', fill: { color: 'F7F7F7' }, margin: 10,
      });
      s7.addText(`실제 단위 회귀식 (Uncoded Units):\n${formatUncodedEquation(design.factors, reducedAnalysis, design.responseName)}`, {
        x: 0.5, y: 2.5, w: 9, h: 1.2, fontSize: 12, color: '0A0B0D', fill: { color: 'F7F7F7' }, margin: 10,
      });

      // Slide 8: Optimization
      const s8 = makeSlide('8. 8단계 · 반응 최적화', 8);
      const optRows = [
        [
          { text: '인자', options: { bold: true, fill: 'F7F7F7' } },
          { text: '코드값', options: { bold: true, fill: 'F7F7F7' } },
          { text: '최적 실제 조건', options: { bold: true, fill: 'F7F7F7' } },
        ],
        ...design.factors.map((f, i) => [f.name, selectedCoded[i].toFixed(2), `${codedToActualVal(f, selectedCoded[i])} ${f.unit}`]),
      ];
      s8.addTable(optRows, tblOpts(0.5, 1.1, 9));
      if (intervals) {
        s8.addText(`예측 평균 Ŷ = ${intervals.yHat.toFixed(3)} ${design.responseUnit}   |   95% CI: (${intervals.ciLow.toFixed(3)}, ${intervals.ciHigh.toFixed(3)})   |   95% PI: (${intervals.piLow.toFixed(3)}, ${intervals.piHigh.toFixed(3)})`, {
          x: 0.5, y: 3.8, w: 9, h: 0.5, fontSize: 12, bold: true, color: '0052FF',
        });
      }

      // Slide 9: Confirmation
      const s9 = makeSlide('9. 9단계 · 재현실험', 9);
      if (tResult) {
        const cRows = [
          [
            { text: 'N', options: { bold: true, fill: 'F7F7F7' } },
            { text: '예측값 (Ŷ)', options: { bold: true, fill: 'F7F7F7' } },
            { text: '실측 평균', options: { bold: true, fill: 'F7F7F7' } },
            { text: '표준편차', options: { bold: true, fill: 'F7F7F7' } },
            { text: '실측 95% CI', options: { bold: true, fill: 'F7F7F7' } },
          ],
          [String(tResult.n), predY.toFixed(3), tResult.mean.toFixed(3), tResult.sd.toFixed(3), `(${tResult.ciLow.toFixed(3)}, ${tResult.ciHigh.toFixed(3)})`],
        ];
        s9.addTable(cRows, tblOpts(0.5, 1.4, 9));
      }

      // Slide 10: Hypothesis Test
      const s10 = makeSlide('10. 9단계 · 가설검정', 10);
      if (tResult) {
        const hRows = [
          [
            { text: '검정 구분', options: { bold: true, fill: 'F7F7F7' } },
            { text: '통계량', options: { bold: true, fill: 'F7F7F7' } },
            { text: 'P-value', options: { bold: true, fill: 'F7F7F7' } },
            { text: '판정', options: { bold: true, fill: 'F7F7F7' } },
          ],
          ['1표본 t검정', `T = ${tResult.tStat.toFixed(3)} (DF=${tResult.df})`, tResult.pVal.toFixed(4), !tResult.rejectH0 ? 'H₀ 채택 (일치)' : 'H₀ 기각 (차이)'],
          ['Anderson-Darling 정규성', `AD = ${adResult?.ad.toFixed(3) ?? '-'}`, adResult?.pVal.toFixed(3) ?? '-', (adResult?.pVal ?? 1) >= 0.05 ? '정규분포 충족' : '주의'],
        ];
        s10.addTable(hRows, tblOpts(0.5, 1.4, 9));
      }

      await pptx.writeFile({ fileName: `${report.title || project.name}_DOE_Report.pptx` });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">RESULT REPORT / 10</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">10단계 · 결과 리포트 작성</h2>
        <p className="text-sm text-[#dbeafe]">10장 슬라이드(표·그래프·수식·가설검정 포함)를 실시간 미리보고 파워포인트(.pptx) 파일로 저장합니다.</p>
      </div>

      {/* Report Metadata */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#0a0b0d] mb-3">보고서 작성 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#7c828a] mb-1">보고서 제목</label>
            <input type="text" value={report.title} onChange={e => updateReport({ title: e.target.value })} className="doe-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#7c828a] mb-1">작성자</label>
            <input type="text" value={report.author} onChange={e => updateReport({ author: e.target.value })} className="doe-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#7c828a] mb-1">작성일</label>
            <input type="date" value={report.date} onChange={e => updateReport({ date: e.target.value })} className="doe-input w-full" />
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dee1e6] pb-3 mb-4">
          <h3 className="font-editorial text-lg text-[#0a0b0d]">보고서 미리보기 (16:9 슬라이드)</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setSlideIdx(s => s)} className="doe-btn doe-btn-secondary text-xs">
              <RefreshCw size={14} /> 보고서 새로고침
            </button>
            <button onClick={exportPPT} disabled={exporting} className="doe-btn doe-btn-primary text-xs">
              <Download size={14} /> {exporting ? 'PPT 생성 중...' : 'PPT 저장 (.pptx)'}
            </button>
          </div>
        </div>

        {/* Slide Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setSlideIdx(i => Math.max(0, i - 1))} disabled={slideIdx === 0} className="doe-btn doe-btn-secondary py-1.5 px-2.5">
              <ChevronLeft size={16} />
            </button>
            <select value={slideIdx} onChange={e => setSlideIdx(parseInt(e.target.value, 10))} className="doe-input py-1.5 text-xs">
              {SLIDES.map((s, idx) => (
                <option key={s.id} value={idx}>{idx + 1} / 10 · {s.title}</option>
              ))}
            </select>
            <button onClick={() => setSlideIdx(i => Math.min(9, i + 1))} disabled={slideIdx === 9} className="doe-btn doe-btn-secondary py-1.5 px-2.5">
              <ChevronRight size={16} />
            </button>
          </div>
          <span className="text-xs font-mono-num text-[#7c828a]">{slideIdx + 1} / 10</span>
        </div>

        {/* 2x5 TOC Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setSlideIdx(idx)}
              className={`p-2.5 rounded-2xl text-left text-xs border transition ${
                slideIdx === idx
                  ? 'bg-[#0052ff] text-white border-[#0052ff]'
                  : 'bg-[#f7f7f7] text-[#5b616e] border-[#dee1e6] hover:bg-[#eef0f3]'
              }`}
            >
              <div className={`font-bold text-[10px] ${slideIdx === idx ? 'text-[#dbeafe]' : 'text-[#0052ff]'}`}>SLIDE {String(idx + 1).padStart(2, '0')}</div>
              <div className="truncate font-medium">{s.title}</div>
            </button>
          ))}
        </div>

        {/* 16:9 Live Slide Preview with Rich Tables & SVGs */}
        <div className="min-h-[420px] w-full rounded-2xl border border-[#dee1e6] overflow-hidden bg-white flex flex-col">
          {slideIdx === 0 ? (
            <div className="flex-1 bg-gradient-to-br from-[#0033a8] to-[#0052ff] text-white p-8 md:p-12 flex flex-col justify-center">
              <div className="text-xs font-bold tracking-widest uppercase text-[#dbeafe] mb-3">
                easyDOE · 2^k FULL FACTORIAL ANALYSIS REPORT
              </div>
              <h2 className="font-editorial text-2xl md:text-4xl font-normal mb-4">{report.title || project.name}</h2>
              <div className="text-sm text-[#dbeafe] flex flex-wrap gap-6 mt-4">
                <span>작성자: {report.author}</span>
                <span>작성일: {report.date}</span>
                <span>반응치: {design.responseName} ({design.responseUnit})</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8 max-w-xl">
                <div className="p-3 rounded-xl bg-white/15">
                  <div className="text-[11px] text-[#dbeafe]">수정 R²</div>
                  <div className="font-mono-num text-lg font-bold">{reducedAnalysis?.r2Adj.toFixed(2) ?? '-'}%</div>
                </div>
                <div className="p-3 rounded-xl bg-white/15">
                  <div className="text-[11px] text-[#dbeafe]">최적 예측치 Ŷ</div>
                  <div className="font-mono-num text-lg font-bold">{predY.toFixed(2)} {design.responseUnit}</div>
                </div>
                <div className="p-3 rounded-xl bg-white/15">
                  <div className="text-[11px] text-[#dbeafe]">재현 실측 평균</div>
                  <div className="font-mono-num text-lg font-bold">{tResult ? tResult.mean.toFixed(2) : '-'} {design.responseUnit}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="bg-[#0052ff] text-white px-6 py-3.5 flex items-center justify-between">
                <span className="font-editorial text-base md:text-lg">{SLIDES[slideIdx].title}</span>
                <span className="text-xs text-[#dbeafe] font-mono-num">SLIDE {slideIdx + 1} / 10</span>
              </div>
              <div className="p-6 flex-1 overflow-y-auto text-sm text-[#0a0b0d]">
                {slideIdx === 1 && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-[#f7f7f7] border border-[#dee1e6]">
                      설계 모형: <strong>2^{design.factorCount} 완전요인실험 × {design.replicates}반복 + 중심점 {design.centerPoints}회</strong> (총 {runs.length}회)
                    </div>
                    <div className="doe-table-wrap">
                      <table className="doe-table">
                        <thead><tr><th>기호</th><th>인자명</th><th>단위</th><th>낮은 수준 (−1)</th><th>높은 수준 (+1)</th></tr></thead>
                        <tbody>
                          {design.factors.map(f => (
                            <tr key={f.symbol}><td>{f.symbol}</td><td>{f.name}</td><td>{f.unit}</td><td>{f.lowVal}</td><td>{f.highVal}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {slideIdx === 2 && fullAnalysis && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <MainEffectsSvg factors={design.factors} runs={runs} grandMean={fullAnalysis.factMean} />
                    <div className="doe-table-wrap">
                      <table className="doe-table">
                        <thead><tr><th>항</th><th>효과</th><th>계수 (β)</th></tr></thead>
                        <tbody>
                          {fullAnalysis.termResults.map(t => (
                            <tr key={t.key}><td>{t.key}</td><td className="font-mono-num">{t.effect.toFixed(3)}</td><td className="font-mono-num">{t.coef.toFixed(3)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {slideIdx === 3 && fullAnalysis && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <ParetoSvg termResults={fullAnalysis.termResults} tCrit={fullAnalysis.tCrit} />
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-[#f7f7f7] border border-[#dee1e6] font-mono-num text-xs">
                        S = {fullAnalysis.s.toFixed(4)} | R² = {fullAnalysis.r2.toFixed(2)}% | R²(adj) = {fullAnalysis.r2Adj.toFixed(2)}%
                      </div>
                      <div className="doe-table-wrap">
                        <table className="doe-table">
                          <thead><tr><th>항</th><th>T</th><th>P-value</th></tr></thead>
                          <tbody>
                            {fullAnalysis.termResults.map(t => (
                              <tr key={t.key}><td>{t.key}</td><td className="font-mono-num">{t.tVal?.toFixed(2) ?? '-'}</td><td className="font-mono-num">{t.pVal?.toFixed(4) ?? '-'}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {slideIdx === 4 && reducedAnalysis && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-[#f7f7f7] border border-[#dee1e6] font-mono-num text-xs">
                      S = {reducedAnalysis.s.toFixed(4)} | R² = {reducedAnalysis.r2.toFixed(2)}% | R²(adj) = {reducedAnalysis.r2Adj.toFixed(2)}% | 오차 기여율 = {reducedAnalysis.errorContribution.toFixed(2)}%
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="doe-table-wrap">
                        <table className="doe-table">
                          <thead><tr><th>유지 항</th><th>계수 (β)</th><th>기여율</th><th>P-value</th></tr></thead>
                          <tbody>
                            {reducedAnalysis.activeTerms.map(t => (
                              <tr key={t.key}><td>{t.key}</td><td className="font-mono-num">{t.coef.toFixed(3)}</td><td className="font-mono-num">{t.contribution.toFixed(2)}%</td><td className="font-mono-num">{t.pVal !== null ? t.pVal.toFixed(4) : '-'}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="doe-table-wrap">
                        <table className="doe-table">
                          <thead><tr><th>차수</th><th>풀링 항</th><th>DF 변화</th></tr></thead>
                          <tbody>
                            {poolingHistory.map(h => (
                              <tr key={h.round}><td>{h.round}차</td><td>{h.term}</td><td>{h.dfBefore} → {h.dfAfter}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {slideIdx === 5 && reducedAnalysis && (
                  <div className="space-y-4">
                    <ResidualFourInOneSvg observations={reducedAnalysis.observations} />
                    {residDiag && (
                      <div className="p-3 rounded-xl bg-[#eef0f3] text-xs">
                        정규성 AD P={residDiag.ad?.pVal.toFixed(3)} | 등분산성 분산비={residDiag.varRatio.toFixed(2)} | 독립성 r={residDiag.lag1.toFixed(3)} | 최대 |d|={residDiag.maxStd.toFixed(2)}
                      </div>
                    )}
                  </div>
                )}

                {slideIdx === 6 && reducedAnalysis && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-[#f7f7f7] border border-[#dee1e6]">
                        <div className="text-xs font-bold text-[#0052ff] mb-1">Coded Units</div>
                        <code className="font-mono-num text-xs break-all">{formatCodedEquation(reducedAnalysis, design.responseName)}</code>
                      </div>
                      <div className="p-3 rounded-xl bg-[#f7f7f7] border border-[#dee1e6]">
                        <div className="text-xs font-bold text-[#05b169] mb-1">Uncoded Units</div>
                        <code className="font-mono-num text-xs break-all">{formatUncodedEquation(design.factors, reducedAnalysis, design.responseName)}</code>
                      </div>
                    </div>
                    <ParetoSvg termResults={reducedAnalysis.termResults} tCrit={reducedAnalysis.tCrit} />
                  </div>
                )}

                {slideIdx === 7 && (
                  <div className="space-y-4">
                    <div className="doe-table-wrap">
                      <table className="doe-table">
                        <thead><tr><th>인자</th><th>코드값</th><th>최적 실제 조건</th></tr></thead>
                        <tbody>
                          {design.factors.map((f, i) => (
                            <tr key={f.symbol}><td>{f.symbol} · {f.name}</td><td className="font-mono-num">{selectedCoded[i].toFixed(2)}</td><td className="font-mono-num font-bold">{codedToActualVal(f, selectedCoded[i])} {f.unit}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {intervals && (
                      <div className="p-4 rounded-xl bg-[#0052ff] text-white font-mono-num text-xs flex flex-wrap gap-6">
                        <span>예측 평균 Ŷ = {intervals.yHat.toFixed(3)} {design.responseUnit}</span>
                        <span>95% CI: ({intervals.ciLow.toFixed(3)}, {intervals.ciHigh.toFixed(3)})</span>
                        <span>95% PI: ({intervals.piLow.toFixed(3)}, {intervals.piHigh.toFixed(3)})</span>
                      </div>
                    )}
                  </div>
                )}

                {slideIdx === 8 && (
                  <div className="space-y-4">
                    <ConfirmationChartsSvg values={validConf} mu0={predY} tResult={tResult} />
                    <ConfirmationHistogramSvg values={validConf} mu0={predY} />
                  </div>
                )}

                {slideIdx === 9 && tResult && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    <div className="space-y-3">
                      <div className="doe-table-wrap">
                        <table className="doe-table">
                          <thead><tr><th>검정</th><th>통계량</th><th>P-value</th><th>판정</th></tr></thead>
                          <tbody>
                            <tr><td>1표본 t검정</td><td className="font-mono-num">{tResult.tStat.toFixed(3)}</td><td className="font-mono-num">{tResult.pVal.toFixed(4)}</td><td>{!tResult.rejectH0 ? 'H₀ 채택' : 'H₀ 기각'}</td></tr>
                            <tr><td>AD 정규성</td><td className="font-mono-num">{adResult?.ad.toFixed(3) ?? '-'}</td><td className="font-mono-num">{adResult?.pVal.toFixed(3) ?? '-'}</td><td>{(adResult?.pVal ?? 1) >= 0.05 ? '정규' : '주의'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="p-3 rounded-xl bg-[#eef0f3] text-xs">
                        결론: {!tResult.rejectH0 ? '예측값과 재현 실험 실측 평균이 통계적으로 일치합니다.' : '예측값과 실측 평균 사이에 통계적 차이가 있습니다.'}
                      </div>
                    </div>
                    <NormalProbSvg points={validConf.map(v => ({ val: v, sig: false }))} title="정규성 검정 · Anderson-Darling" xLabel={design.responseName} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-[#dee1e6]">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 재현 실험</button>
          <button onClick={exportPPT} disabled={exporting} className="doe-btn doe-btn-primary">
            <FileText size={16} /> PPT 저장 완료
          </button>
        </div>
      </div>
    </div>
  );
}

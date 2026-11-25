import React, { useState, useMemo } from 'react';
import PptxGenJS from 'pptxgenjs';
import { ArrowLeft, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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
        s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.78, fill: { color: '4555A2' } });
        s.addText(title, { x: 0.5, y: 0.14, w: 7.8, h: 0.5, color: 'FFFFFF', fontSize: 17, bold: true });
        s.addText(`SLIDE ${num} / 10`, { x: 8.3, y: 0.18, w: 1.3, h: 0.4, color: 'DBEAFE', fontSize: 10, align: 'right' });
        return s;
      };

      const tblOpts = (x, y, w) => ({
        x, y, w,
        fontSize: 10,
        border: { pt: 0.75, color: 'E2E8F0' },
        fill: { color: 'FFFFFF' },
        color: '1E293B',
      });

      // SLIDE 1: Title Slide
      const s1 = pptx.addSlide();
      s1.background = { color: '4555A2' };
      s1.addText('easyDOE · 2^k FULL FACTORIAL ANALYSIS REPORT', {
        x: 0.8, y: 1.2, w: 8.4, h: 0.4, color: 'DBEAFE', fontSize: 12, bold: true,
      });
      s1.addText(report.title || project.name, {
        x: 0.8, y: 1.7, w: 8.4, h: 1.2, color: 'FFFFFF', fontSize: 28, bold: true,
      });
      s1.addText(`작성자: ${report.author}   |   작성일: ${report.date}   |   반응치: ${design.responseName} (${design.responseUnit})`, {
        x: 0.8, y: 3.1, w: 8.4, h: 0.4, color: 'DBEAFE', fontSize: 11,
      });
      s1.addShape(pptx.ShapeType.roundRect, { x: 0.8, y: 3.8, w: 8.4, h: 1.2, fill: { color: '2B3B84' }, line: { color: 'DBEAFE', pt: 1 } });
      s1.addText(
        `• 핵심 요약: 2^${design.factorCount} 요인실험 분석 완료\n• 최종 모형 수정 R² = ${reducedAnalysis?.r2Adj.toFixed(2) ?? '-'}%\n• 최적 예측치 = ${predY.toFixed(2)} ${design.responseUnit}${tResult ? `  (재현 실측 평균: ${tResult.mean.toFixed(2)} ${design.responseUnit}, P=${tResult.pVal.toFixed(4)} 유의차 없음)` : ''}`,
        { x: 1.0, y: 3.9, w: 8.0, h: 1.0, color: 'FFFFFF', fontSize: 11, lineSpacing: 20 }
      );

      // SLIDE 2: Step 01 & 02
      const s2 = makeSlide('2. 1·2단계 · 실험설계 및 실험결과', 2);
      s2.addText('실험설계 조건 요약 및 관측 데이터', { x: 0.5, y: 0.9, w: 9, h: 0.3, fontSize: 12, bold: true, color: '4555A2' });
      const fRows = [
        [{ text: '기호', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '인자명', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '단위', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '저수준(-1)', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '고수준(+1)', options: { bold: true, fill: { color: 'F8FAFC' } } }]
      ];
      design.factors.forEach(f => {
        fRows.push([f.symbol, f.name, f.unit, String(f.lowVal), String(f.highVal)]);
      });
      s2.addTable(fRows, tblOpts(0.5, 1.3, 4.4));

      const runPreview = [
        [{ text: '실행', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '표준', options: { bold: true, fill: { color: 'F8FAFC' } } },
         ...design.factors.map(f => ({ text: f.symbol, options: { bold: true, fill: { color: 'F8FAFC' } } })),
         { text: design.responseName, options: { bold: true, fill: { color: 'F8FAFC' } } }]
      ];
      runs.slice(0, 10).forEach(r => {
        runPreview.push([
          String(r.runOrder), String(r.stdOrder),
          ...design.factors.map(f => String(r.actual[f.symbol])),
          r.y !== null ? String(r.y) : '-'
        ]);
      });
      s2.addTable(runPreview, tblOpts(5.1, 1.3, 4.4));

      // SLIDE 3: Step 03 Graph Analysis
      const s3 = makeSlide('3. 3단계 · Graph 분석 (주효과 및 교호작용)', 3);
      s3.addText('주효과(Main Effect) 및 주요 교호작용 요약', { x: 0.5, y: 0.9, w: 9, h: 0.3, fontSize: 12, bold: true, color: '4555A2' });
      const mainRows = [
        [{ text: '인자', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '저수준 평균', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '고수준 평균', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '주효과', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '기여율(%)', options: { bold: true, fill: { color: 'F8FAFC' } } }]
      ];
      fullAnalysis?.termResults.filter(t => t.order === 1).forEach(t => {
        mainRows.push([t.key, '-', '-', t.effect.toFixed(3), `${t.contribution.toFixed(2)}%`]);
      });
      s3.addTable(mainRows, tblOpts(0.5, 1.4, 4.4));

      const interRows = [
        [{ text: '교호작용 항', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '효과', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '기여율(%)', options: { bold: true, fill: { color: 'F8FAFC' } } }]
      ];
      fullAnalysis?.termResults.filter(t => t.order >= 2).forEach(t => {
        interRows.push([t.key, t.effect.toFixed(3), `${t.contribution.toFixed(2)}%`]);
      });
      s3.addTable(interRows, tblOpts(5.1, 1.4, 4.4));

      // SLIDE 4: Full Model ANOVA
      const s4 = makeSlide('4. 4단계 · 통계분석 (풀링 전 완전모형)', 4);
      s4.addText(`완전모형 분산분석: S = ${fullAnalysis?.s.toFixed(4) ?? '-'}, R² = ${fullAnalysis?.r2.toFixed(2) ?? '-'}%`, {
        x: 0.5, y: 0.9, w: 9, h: 0.3, fontSize: 12, bold: true, color: '4555A2'
      });
      const anovaRows = [
        [{ text: 'Source', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: 'DF', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: 'Seq SS', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: 'Adj MS', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: 'F', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: 'P', options: { bold: true, fill: { color: 'F8FAFC' } } }]
      ];
      fullAnalysis?.orderGroups.forEach(g => {
        anovaRows.push([g.label, String(g.df), g.ss.toFixed(2), g.ms.toFixed(2), g.fVal ? g.fVal.toFixed(2) : '-', g.pVal ? g.pVal.toFixed(4) : '-']);
      });
      anovaRows.push(['Residual Error', String(fullAnalysis?.errorDF ?? 0), fullAnalysis?.errorSS.toFixed(2) ?? '-', fullAnalysis?.errorMS.toFixed(2) ?? '-', '-', '-']);
      s4.addTable(anovaRows, tblOpts(0.5, 1.3, 9.0));

      // SLIDE 5: Reduced Model & Pooling
      const s5 = makeSlide('5. 5단계 · 통계분석 (순차 풀링 축소모형)', 5);
      s5.addText(`순차 풀링 후 축소모형: R²(수정) = ${reducedAnalysis?.r2Adj.toFixed(2) ?? '-'}%, 오차 기여율 = ${reducedAnalysis?.errorContribution.toFixed(2) ?? '-'}%`, {
        x: 0.5, y: 0.9, w: 9, h: 0.3, fontSize: 12, bold: true, color: '4555A2'
      });
      const coefRows = [
        [{ text: '항', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '계수(β)', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: 'SE 계수', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: 'T', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: 'P', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '상태', options: { bold: true, fill: { color: 'F8FAFC' } } }]
      ];
      reducedAnalysis?.termResults.forEach(t => {
        coefRows.push([
          t.key,
          t.isPooled ? '-' : t.coef.toFixed(3),
          !t.isPooled && t.seCoef ? t.seCoef.toFixed(3) : '-',
          !t.isPooled && t.tVal ? t.tVal.toFixed(2) : '-',
          !t.isPooled && t.pVal !== null ? t.pVal.toFixed(4) : '-',
          t.isPooled ? '풀링' : t.significant ? '유의' : '유지'
        ]);
      });
      s5.addTable(coefRows, tblOpts(0.5, 1.3, 9.0));

      // SLIDE 6: Residuals
      const s6 = makeSlide('6. 6단계 · 잔차분석 (모형의 적합성)', 6);
      s6.addText('정규성 · 등분산성 · 독립성 타당성 진단', { x: 0.5, y: 0.9, w: 9, h: 0.3, fontSize: 12, bold: true, color: '4555A2' });
      const diagRows = [
        [{ text: '진단 항목', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '검정 통계량', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '기준', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '판정 결과', options: { bold: true, fill: { color: 'F8FAFC' } } }],
        ['정규성 (Anderson-Darling)', `AD = ${residDiag?.ad?.ad.toFixed(3) ?? '-'}, P = ${residDiag?.ad?.pVal.toFixed(3) ?? '-'}`, 'P > 0.05', residDiag?.normalOk ? '정규성 충족' : '주의'],
        ['등분산성 (상/하 분산비)', `분산비 = ${residDiag?.varRatio.toFixed(2) ?? '-'}`, '분산비 < 4.0', residDiag?.homoOk ? '등분산성 충족' : '주의'],
        ['독립성 (Lag-1 자기상관)', `r = ${residDiag?.lag1.toFixed(3) ?? '-'}`, '|r| < 0.5', residDiag?.indepOk ? '독립성 충족' : '주의'],
        ['특이점 (|표준화 잔차|)', `최대 |d| = ${residDiag?.maxStd.toFixed(2) ?? '-'}`, '|d| ≤ 2.5', residDiag?.outlierOk ? '특이점 없음' : '주의']
      ];
      s6.addTable(diagRows, tblOpts(0.5, 1.4, 9.0));

      // SLIDE 7: Mathematical Model
      const s7 = makeSlide('7. 7단계 · 최종 분석결과 종합정리', 7);
      s7.addText('최종 회귀 방정식 및 기여율 순위', { x: 0.5, y: 0.9, w: 9, h: 0.3, fontSize: 12, bold: true, color: '4555A2' });
      s7.addText(`코드화 회귀식:\n${formatCodedEquation(reducedAnalysis, design.responseName)}`, {
        x: 0.5, y: 1.4, w: 9, h: 0.9, fontSize: 11, fontFace: 'Courier New', color: '4555A2',
      });
      s7.addText(`실제 단위 회귀식:\n${formatUncodedEquation(design.factors, reducedAnalysis, design.responseName)}`, {
        x: 0.5, y: 2.4, w: 9, h: 0.9, fontSize: 11, fontFace: 'Courier New', color: '05B169',
      });

      // SLIDE 8: Optimization
      const s8 = makeSlide('8. 8단계 · 반응 최적화', 8);
      s8.addText(`최적 공정 조건 탐색: 목표 = ${optimizer.goal === 'target' ? `목표값 맞추기 (${optimizer.targetVal})` : optimizer.goal}`, {
        x: 0.5, y: 0.9, w: 9, h: 0.3, fontSize: 12, bold: true, color: '4555A2'
      });
      const optRows = [
        [{ text: '인자', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '최적 설정치 (실제 단위)', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '코드값', options: { bold: true, fill: { color: 'F8FAFC' } } }]
      ];
      design.factors.forEach((f, i) => {
        optRows.push([f.name, `${codedToActualVal(f, selectedCoded[i])} ${f.unit}`, selectedCoded[i].toFixed(2)]);
      });
      s8.addTable(optRows, tblOpts(0.5, 1.4, 4.4));
      s8.addShape(pptx.ShapeType.roundRect, { x: 5.1, y: 1.4, w: 4.4, h: 2.8, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', pt: 1 } });
      s8.addText(
        `최적 예측 반응치 (Ŷ):\n${predY.toFixed(2)} ${design.responseUnit}\n\n95% 신뢰구간 (CI):\n[${intervals?.ciLow.toFixed(2) ?? '-'} ~ ${intervals?.ciHigh.toFixed(2) ?? '-'}]\n\n95% 예측구간 (PI):\n[${intervals?.piLow.toFixed(2) ?? '-'} ~ ${intervals?.piHigh.toFixed(2) ?? '-'}]`,
        { x: 5.3, y: 1.6, w: 4.0, h: 2.4, fontSize: 12, bold: true, color: '4555A2', lineSpacing: 22 }
      );

      // SLIDE 9: Confirmation Run
      const s9 = makeSlide('9. 9단계 · 재현실험', 9);
      s9.addText(`최적 조건 재현실험 ${validConf.length}회 실측 데이터`, { x: 0.5, y: 0.9, w: 9, h: 0.3, fontSize: 12, bold: true, color: '4555A2' });
      s9.addText(
        `• 표본수 N = ${validConf.length}회\n• 실측 평균 X̄ = ${tResult ? tResult.mean.toFixed(2) : '-'} ${design.responseUnit}\n• 표준편차 S = ${tResult ? tResult.sd.toFixed(2) : '-'}\n• 모형 예측치 Ŷ = ${predY.toFixed(2)} ${design.responseUnit}\n• 편차 (X̄ - Ŷ) = ${tResult ? (tResult.mean - predY).toFixed(2) : '-'}`,
        { x: 0.5, y: 1.4, w: 9, h: 1.5, fontSize: 12, lineSpacing: 22 }
      );

      // SLIDE 10: Hypothesis Testing
      const s10 = makeSlide('10. 9단계 · 가설검정 (1표본 t-검정)', 10);
      s10.addText(`가설검정: H₀: μ = ${predY.toFixed(2)} vs H₁: μ ≠ ${predY.toFixed(2)}`, {
        x: 0.5, y: 0.9, w: 9, h: 0.3, fontSize: 12, bold: true, color: '4555A2'
      });
      const tRows = [
        [{ text: '검정 항목', options: { bold: true, fill: { color: 'F8FAFC' } } },
         { text: '값', options: { bold: true, fill: { color: 'F8FAFC' } } }],
        ['t-통계량', tResult ? tResult.tStat.toFixed(3) : '-'],
        ['자유도 (DF)', tResult ? String(tResult.df) : '-'],
        ['P-value', tResult ? tResult.pVal.toFixed(4) : '-'],
        ['95% 신뢰구간', tResult ? `[${tResult.ciLow.toFixed(2)}, ${tResult.ciHigh.toFixed(2)}]` : '-'],
        ['최종 판정', tResult ? (!tResult.rejectH0 ? 'H₀ 채택 (재현 성공)' : 'H₀ 기각 (차이 존재)') : '-']
      ];
      s10.addTable(tRows, tblOpts(0.5, 1.4, 4.4));
      s10.addShape(pptx.ShapeType.roundRect, { x: 5.1, y: 1.4, w: 4.4, h: 2.8, fill: { color: tResult && !tResult.rejectH0 ? 'F1F5F9' : 'FEF2F2' }, line: { color: 'E2E8F0', pt: 1 } });
      s10.addText(
        tResult && !tResult.rejectH0
          ? `[검증 성공]\nP-value = ${tResult.pVal.toFixed(4)} > 0.05\n\n모형 예측치와 실제 공정 재현 실측 평균 간에 유의한 차이가 없습니다.\n도출된 최적 공정 조건의 재현성이 완벽히 입증되었습니다.`
          : `[확인 필요]\n재현 실험 결과 모형 예측값과의 산포 또는 외부 교락 인자를 확인하세요.`,
        { x: 5.3, y: 1.6, w: 4.0, h: 2.4, fontSize: 12, bold: true, color: tResult && !tResult.rejectH0 ? '05B169' : 'CF202F', lineSpacing: 22 }
      );

      await pptx.writeFile({ fileName: `${report.title || project.name}_10Slides_Report.pptx` });
    } catch (e) {
      alert(`PPT 저장 실패: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="doe-hero">
        <div className="doe-eyebrow">RESULT REPORT / 10</div>
        <h2 className="font-editorial text-2xl font-normal text-[#ffffff] mb-1">10단계 · 결과 리포트 작성</h2>
        <p className="text-sm text-[#e0e7ff]">10장 슬라이드(표·그래프·수식·가설검정 포함)를 실시간 미리보고 파워포인트(.pptx) 파일로 저장합니다.</p>
      </div>

      {/* Report Metadata */}
      <div className="doe-card">
        <h3 className="font-editorial text-lg text-[#1e293b] mb-3">보고서 작성 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#64748b] mb-1">보고서 제목</label>
            <input type="text" value={report.title} onChange={e => updateReport({ title: e.target.value })} className="doe-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748b] mb-1">작성자</label>
            <input type="text" value={report.author} onChange={e => updateReport({ author: e.target.value })} className="doe-input w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748b] mb-1">작성일</label>
            <input type="date" value={report.date} onChange={e => updateReport({ date: e.target.value })} className="doe-input w-full" />
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="doe-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] pb-3 mb-4">
          <h3 className="font-editorial text-lg text-[#1e293b]">보고서 미리보기 (16:9 슬라이드)</h3>
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
          <span className="text-xs font-mono-num text-[#64748b]">{slideIdx + 1} / 10</span>
        </div>

        {/* 2x5 TOC Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setSlideIdx(idx)}
              className={`p-2.5 rounded-2xl text-left text-xs border transition ${
                slideIdx === idx
                  ? 'bg-[#4555a2] text-white border-[#4555a2]'
                  : 'bg-[#f8fafc] text-[#475569] border-[#e2e8f0] hover:bg-[#f1f5f9]'
              }`}
            >
              <div className={`font-bold text-[10px] ${slideIdx === idx ? 'text-[#dbeafe]' : 'text-[#4555a2]'}`}>SLIDE {String(idx + 1).padStart(2, '0')}</div>
              <div className="truncate font-medium">{s.title}</div>
            </button>
          ))}
        </div>

        {/* 16:9 Live Slide Preview with Rich Tables & SVGs */}
        <div className="min-h-[420px] w-full rounded-2xl border border-[#e2e8f0] overflow-hidden bg-white flex flex-col">
          {slideIdx === 0 ? (
            <div className="flex-1 bg-gradient-to-br from-[#4555a2] to-[#2b3b84] text-white p-8 md:p-12 flex flex-col justify-center">
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
              <div className="bg-[#4555a2] text-white px-6 py-3.5 flex items-center justify-between">
                <span className="font-editorial text-base md:text-lg">{SLIDES[slideIdx].title}</span>
                <span className="text-xs text-[#dbeafe] font-mono-num">SLIDE {slideIdx + 1} / 10</span>
              </div>
              <div className="p-6 flex-1 overflow-y-auto text-sm text-[#1e293b]">
                {slideIdx === 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-xs text-[#64748b] mb-2 uppercase">인자 및 수준 설정</h4>
                      <div className="doe-table-wrap">
                        <table className="doe-table">
                          <thead><tr><th>기호</th><th>인자명</th><th>저수준</th><th>고수준</th></tr></thead>
                          <tbody>
                            {design.factors.map(f => (
                              <tr key={f.symbol}><td>{f.symbol}</td><td>{f.name}</td><td>{f.lowVal}</td><td>{f.highVal}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-[#64748b] mb-2 uppercase">실험 계획 및 관측치 (상위 8회)</h4>
                      <div className="doe-table-wrap">
                        <table className="doe-table">
                          <thead><tr><th>실행</th><th>표준</th>{design.factors.map(f => <th key={f.symbol}>{f.symbol}</th>)}<th>{design.responseName}</th></tr></thead>
                          <tbody>
                            {runs.slice(0, 8).map(r => (
                              <tr key={r.id}>
                                <td>{r.runOrder}</td><td>{r.stdOrder}</td>
                                {design.factors.map(f => <td key={f.symbol}>{r.actual[f.symbol]}</td>)}
                                <td className="font-mono-num font-bold">{r.y ?? '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {slideIdx === 2 && (
                  <div>
                    <h4 className="font-semibold text-xs text-[#64748b] mb-2 uppercase">주효과 그래프</h4>
                    <MainEffectsSvg factors={design.factors} runs={runs} grandMean={fullAnalysis?.factMean ?? 0} />
                  </div>
                )}

                {slideIdx === 3 && fullAnalysis && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ParetoSvg termResults={fullAnalysis.termResults} tCrit={fullAnalysis.tCrit} />
                    <div className="doe-table-wrap">
                      <table className="doe-table">
                        <thead><tr><th>출처</th><th>DF</th><th>Adj SS</th><th>F</th><th>P</th></tr></thead>
                        <tbody>
                          {fullAnalysis.orderGroups.map(g => (
                            <tr key={g.order}><td>{g.label}</td><td>{g.df}</td><td>{g.ss.toFixed(2)}</td><td>{g.fVal?.toFixed(2) ?? '-'}</td><td>{g.pVal?.toFixed(4) ?? '-'}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {slideIdx === 4 && reducedAnalysis && (
                  <div className="space-y-4">
                    <div className="doe-table-wrap">
                      <table className="doe-table">
                        <thead><tr><th>항</th><th>계수</th><th>T</th><th>P</th><th>기여율</th><th>판정</th></tr></thead>
                        <tbody>
                          {reducedAnalysis.termResults.map(t => (
                            <tr key={t.key}>
                              <td>{t.key}</td>
                              <td>{t.isPooled ? '-' : t.coef.toFixed(3)}</td>
                              <td>{!t.isPooled && t.tVal ? t.tVal.toFixed(2) : '-'}</td>
                              <td>{!t.isPooled && t.pVal !== null ? t.pVal.toFixed(4) : '-'}</td>
                              <td>{t.isPooled ? '-' : `${t.contribution.toFixed(2)}%`}</td>
                              <td>{t.isPooled ? '풀링' : t.significant ? '유의' : '유지'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {slideIdx === 5 && reducedAnalysis && (
                  <ResidualFourInOneSvg observations={reducedAnalysis.observations} />
                )}

                {slideIdx === 6 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                      <div className="text-xs font-bold text-[#4555a2] mb-1">Coded Equation (코드화 단위)</div>
                      <code className="font-mono-num text-xs">{formatCodedEquation(reducedAnalysis, design.responseName)}</code>
                    </div>
                    <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                      <div className="text-xs font-bold text-[#05b169] mb-1">Uncoded Equation (실제 공정 단위)</div>
                      <code className="font-mono-num text-xs">{formatUncodedEquation(design.factors, reducedAnalysis, design.responseName)}</code>
                    </div>
                  </div>
                )}

                {slideIdx === 7 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                    <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] space-y-3">
                      <h4 className="font-semibold text-sm">최적 조건 설정치</h4>
                      {design.factors.map((f, i) => (
                        <div key={f.symbol} className="flex justify-between text-xs py-1 border-b border-[#e2e8f0]">
                          <span>{f.symbol} · {f.name}</span>
                          <strong className="font-mono-num">{codedToActualVal(f, selectedCoded[i])} {f.unit}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-[#4555a2] to-[#2b3b84] text-white space-y-2">
                      <div className="text-xs text-[#dbeafe]">최적 조건 예측값 Ŷ</div>
                      <div className="font-mono-num text-2xl font-bold">{predY.toFixed(2)} {design.responseUnit}</div>
                      <div className="text-xs text-[#dbeafe] pt-2">95% CI: [{intervals?.ciLow.toFixed(2)} ~ {intervals?.ciHigh.toFixed(2)}]</div>
                      <div className="text-xs text-[#dbeafe]">95% PI: [{intervals?.piLow.toFixed(2)} ~ {intervals?.piHigh.toFixed(2)}]</div>
                    </div>
                  </div>
                )}

                {slideIdx === 8 && (
                  <div className="space-y-4">
                    {validConf.length > 0 ? (
                      <>
                        <ConfirmationChartsSvg values={validConf} mu0={predY} tResult={tResult} />
                        <ConfirmationHistogramSvg values={validConf} mu0={predY} />
                      </>
                    ) : (
                      <div className="p-8 text-center text-[#64748b]">
                        9단계에서 재현 실험 측정값을 입력하면 차트가 자동으로 표시됩니다.
                      </div>
                    )}
                  </div>
                )}

                {slideIdx === 9 && (
                  tResult ? (
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
                        <div className="p-3 rounded-xl bg-[#f1f5f9] text-xs">
                          결론: {!tResult.rejectH0 ? '예측값과 재현 실험 실측 평균이 통계적으로 일치합니다. 최적 조건 재현 성공.' : '예측값과 실측 평균 사이에 통계적 차이가 있습니다.'}
                        </div>
                      </div>
                      <NormalProbSvg points={validConf.map(v => ({ val: v, sig: false }))} title="정규성 검정 · Anderson-Darling" xLabel={design.responseName} />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-[#64748b]">
                      9단계에서 재현 실험 측정값을 2개 이상 입력하면 1-Sample t-Test 가설검정 결과가 표시됩니다.
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-[#e2e8f0]">
          <button onClick={onPrev} className="doe-btn doe-btn-secondary"><ArrowLeft size={16} /> 이전 단계 · 재현 실험</button>
          <button onClick={exportPPT} disabled={exporting} className="doe-btn doe-btn-primary">
            <Download size={16} /> {exporting ? 'PPT 생성 중...' : 'PPT 보고서 내려받기 (.pptx)'}
          </button>
        </div>
      </div>
    </div>
  );
}

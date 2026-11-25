import React, { useRef } from 'react';
import { Upload, FolderOpen, Play, ArrowRight, FileJson, Trash2, X } from 'lucide-react';

const STEPS_PREVIEW = [
  { num: '01', title: '실험설계', desc: '2^k 요인·수준·반복수·중심점 조건 설정 및 설계표 생성' },
  { num: '02', title: '실험 결과 입력', desc: '엑셀 업로드 또는 직접 입력 후 데이터 유효성 점검' },
  { num: '03', title: 'Graph 분석', desc: '주효과도·교호작용도·Cube Plot 시각화 및 효과 계산' },
  { num: '04', title: '통계 분석 (풀링 전)', desc: '파레토도·정규확률도·ANOVA 및 풀링 후보 검토' },
  { num: '05', title: '축소 모형 (순차 풀링)', desc: '비유의 항 순차 풀링·기여율·Lack of Fit 검증' },
  { num: '06', title: '잔차분석', desc: '4-in-1 잔차 진단 그래프 및 모형 타당성 자동 판정' },
  { num: '07', title: '수학적 모형', desc: '코드화/실제 단위 회귀식 도출 및 조건 대입 시뮬레이션' },
  { num: '08', title: '반응 최적화', desc: '망대/망소/망목 목표 탐색·슬라이더 예측·신뢰구간(CI/PI)' },
  { num: '09', title: '재현 실험 및 가설검정', desc: '실측 30회 비교·1표본 t검정·Anderson-Darling 정규성' },
  { num: '10', title: '결과 리포트 작성', desc: '10장 슬라이드 미리보기 및 PPTX 파워포인트 저장' },
];

export function StartScreen({ savedProjects, onStartNew, onLoadProject, onOpenSaveModal }) {
  return (
    <div className="max-w-6xl mx-auto py-4">
      <div className="doe-hero">
        <div className="doe-eyebrow">DOE AGENT · FULL FACTORIAL WORKFLOW</div>
        <h2 className="font-editorial text-2xl md:text-3xl font-normal text-[#ffffff] mb-3">
          실험설계부터 최적 조건 검증까지
        </h2>
        <p className="text-[#a8acb3] text-sm md:text-base max-w-2xl mb-6">
          실험 데이터를 분석하여 주요 인자를 파악하고, 최적 조건을 찾아 재현 실험으로 확인한 뒤 10장 분량의 PPT 보고서까지 한 번에 완성합니다.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={onStartNew} className="doe-btn doe-btn-primary">
            <Play size={16} /> 실험설계 시작하기
          </button>
          {savedProjects.length > 0 && (
            <button onClick={() => onLoadProject(savedProjects[0])} className="doe-btn doe-btn-secondary">
              <ArrowRight size={16} /> 이전 작업 이어하기 ({savedProjects[0].name})
            </button>
          )}
          <button onClick={onOpenSaveModal} className="doe-btn doe-btn-secondary">
            <FolderOpen size={16} /> 저장 목록 ({savedProjects.length})
          </button>
        </div>
      </div>

      <div className="doe-card">
        <div className="flex items-center justify-between border-b border-[#dee1e6] pb-3 mb-4">
          <h3 className="font-editorial text-lg text-[#0a0b0d]">DOE LAB 10단계 분석 프로세스</h3>
          <span className="text-xs text-[#7c828a]">브라우저 단독 실행 · 서버/로그인 불필요</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {STEPS_PREVIEW.map(st => (
            <div key={st.num} className="p-3.5 rounded-lg border border-[#dee1e6] bg-[#ffffff]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-6 h-6 rounded-full bg-[#0052ff] text-[#ffffff] text-xs font-bold flex items-center justify-center">
                  {st.num}
                </span>
                <span className="font-semibold text-sm text-[#0a0b0d]">{st.title}</span>
              </div>
              <p className="text-xs text-[#7c828a] leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SaveListModal({ isOpen, onClose, savedProjects, onSelectProject, onDeleteProject, onImportFile }) {
  const fileRef = useRef(null);
  if (!isOpen) return null;

  const handleFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        onImportFile(parsed);
        onClose();
      } catch {
        alert('유효한 .doe.json 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#ffffff] border border-[#dee1e6] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#dee1e6]">
          <div>
            <h3 className="font-editorial text-xl text-[#0a0b0d]">저장한 실험</h3>
            <p className="text-xs text-[#7c828a]">저장 위치: 이 브라우저 로컬 스토리지 · 다른 사람의 작업과 분리됨</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#eef0f3] text-[#7c828a]">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-3 bg-[#f7f7f7] border-b border-[#dee1e6] flex items-center justify-between">
          <span className="text-xs text-[#7c828a]">외부 백업(.doe.json) 파일을 불러올 수 있습니다.</span>
          <input ref={fileRef} type="file" accept=".json,.doe.json" className="hidden" onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()} className="doe-btn doe-btn-secondary text-xs py-1.5 px-3">
            <Upload size={14} /> 실험 파일 가져오기 (.doe.json)
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3">
          {savedProjects.map(p => (
            <div
              key={p.id}
              className="p-4 rounded-lg border border-[#dee1e6] bg-white hover:border-[#0052ff] transition flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { onSelectProject(p); onClose(); }}>
                <div className="flex items-center gap-2 mb-1">
                  <FileJson size={16} className="text-[#0052ff] shrink-0" />
                  <span className="font-semibold text-sm text-[#0a0b0d] truncate">{p.name}</span>
                  <span className="doe-badge-sig">{p.tag || '저장됨'}</span>
                </div>
                <div className="text-xs text-[#7c828a] flex flex-wrap gap-3">
                  <span>반응치: {p.design?.responseName} ({p.design?.responseUnit})</span>
                  <span>총 {p.runs?.length || 0}회 실험</span>
                  <span>{p.revision || 1}차 저장</span>
                  <span>{new Date(p.updatedAt).toLocaleString('ko-KR')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onSelectProject(p); onClose(); }}
                  className="doe-btn doe-btn-primary text-xs py-1.5 px-3"
                >
                  불러오기
                </button>
                {p.id !== 'sample_film_49' && (
                  <button
                    onClick={() => onDeleteProject(p.id)}
                    className="p-2 text-[#cf202f] hover:bg-red-50 rounded-lg"
                    title="삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

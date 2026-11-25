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
        <h2 className="font-editorial text-2xl md:text-3xl font-normal text-[#ffffff] mb-6">
          실험설계 ~ 최적조건 검증 ~ 보고서 작성까지 All-In-One 솔루션
        </h2>
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

      {/* 10-Step Workflow Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-8">
        {STEPS_PREVIEW.map(st => (
          <div key={st.num} className="doe-card p-4 mb-0 flex flex-col justify-between hover:border-[#4555a2]">
            <div>
              <span className="font-mono-num text-xs font-bold text-[#4555a2] block mb-1">
                STEP {st.num}
              </span>
              <h3 className="font-editorial text-sm font-semibold text-[#1e293b] mb-1.5">{st.title}</h3>
              <p className="text-xs text-[#64748b] leading-relaxed">{st.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SaveListModal({ isOpen, onClose, savedProjects, onSelectProject, onDeleteProject, onImportFile }) {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        onImportFile(parsed);
        onClose();
      } catch (err) {
        alert('올바른 .doe.json 파일이 아닙니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl border border-[#e2e8f0] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f8fafc]">
          <div>
            <h3 className="font-editorial text-lg text-[#1e293b]">실험 저장 목록</h3>
            <p className="text-xs text-[#64748b]">로컬 브라우저에 저장된 실험 프로젝트 관리 및 .doe.json 파일 불러오기</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[#e2e8f0] text-[#64748b]">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          {savedProjects.length === 0 ? (
            <div className="text-center py-12 text-[#64748b] text-sm">
              저장된 실험 프로젝트가 없습니다.
            </div>
          ) : (
            savedProjects.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between p-4 rounded-2xl border border-[#e2e8f0] bg-white hover:border-[#4555a2] hover:shadow-sm transition"
              >
                <div className="flex-1 cursor-pointer mr-3" onClick={() => { onSelectProject(p); onClose(); }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#1e293b]">{p.name}</span>
                    <span className="doe-badge-pool">{p.revision || 1}차 저장</span>
                  </div>
                  <div className="text-xs text-[#64748b] mt-1 flex flex-wrap gap-3">
                    <span>인자: {p.design?.factorCount}개</span>
                    <span>반복: {p.design?.replicates}회</span>
                    <span>수정일: {new Date(p.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { onSelectProject(p); onClose(); }}
                    className="doe-btn doe-btn-secondary text-xs py-1.5 px-3"
                  >
                    열기
                  </button>
                  {savedProjects.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`'${p.name}' 실험을 삭제하시겠습니까?`)) {
                          onDeleteProject(p.id);
                        }
                      }}
                      className="p-2 text-[#cf202f] hover:bg-red-50 rounded-lg"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#e2e8f0] bg-[#f8fafc] flex flex-wrap items-center justify-between gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,.doe.json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="doe-btn doe-btn-secondary text-xs"
          >
            <Upload size={14} /> .doe.json 파일 불러오기
          </button>
          <button onClick={onClose} className="doe-btn doe-btn-dark text-xs">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

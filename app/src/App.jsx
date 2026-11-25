import React, { useState, useEffect, useMemo } from 'react';
import { Save, FolderOpen, PlusCircle, Home } from 'lucide-react';
import {
  analyzeDOE,
  createSampleFilmProject,
  createDefaultBlankProject,
} from './doeEngine';
import { StartScreen, SaveListModal } from './components/StartScreen';
import Step01Design from './components/Step01Design';
import Step02Measurement from './components/Step02Measurement';
import Step03Graphs from './components/Step03Graphs';
import Step04FullModel from './components/Step04FullModel';
import Step05ReducedModel from './components/Step05ReducedModel';
import Step06Residuals from './components/Step06Residuals';
import Step07MathModel from './components/Step07MathModel';
import Step08Optimizer from './components/Step08Optimizer';
import Step09Confirmation from './components/Step09Confirmation';
import Step10Report from './components/Step10Report';

const LS_PROJECTS_KEY = 'doe_lab_saved_projects_v2';

const STEP_ITEMS = [
  { id: 1, title: '실험설계' },
  { id: 2, title: '실험 결과 입력' },
  { id: 3, title: 'Graph 분석' },
  { id: 4, title: '통계 분석 (풀링 전)' },
  { id: 5, title: '축소 모형 (순차 풀링)' },
  { id: 6, title: '잔차분석' },
  { id: 7, title: '수학적 모형' },
  { id: 8, title: '반응 최적화' },
  { id: 9, title: '재현 실험 및 가설검정' },
  { id: 10, title: '결과 리포트 작성' },
];

function loadSavedProjects() {
  try {
    const raw = localStorage.getItem(LS_PROJECTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [createSampleFilmProject()];
}

export default function App() {
  const [savedProjects, setSavedProjects] = useState(loadSavedProjects);
  const [project, setProject] = useState(() => savedProjects[0] || createSampleFilmProject());
  const [view, setView] = useState('start'); // 'start' | 'workspace'
  const [currentStep, setCurrentStep] = useState(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState(1);
  const [isDirty, setIsDirty] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LS_PROJECTS_KEY, JSON.stringify(savedProjects));
    } catch {
      // ignore quota errors
    }
  }, [savedProjects]);

  const updateProject = (patch) => {
    setProject(prev => ({
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
    setIsDirty(true);
  };

  const goToStep = (step) => {
    setCurrentStep(step);
    setMaxVisitedStep(m => Math.max(m, step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProject = (downloadFile = true) => {
    const nextRev = (project.revision || 0) + (isDirty ? 1 : 0);
    const updated = {
      ...project,
      revision: nextRev,
      updatedAt: new Date().toISOString(),
    };
    setProject(updated);
    setSavedProjects(prev => {
      const exists = prev.some(p => p.id === updated.id);
      if (exists) return prev.map(p => (p.id === updated.id ? updated : p));
      return [updated, ...prev];
    });
    setIsDirty(false);

    if (downloadFile) {
      const blob = new Blob([JSON.stringify(updated, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${updated.name}_${updated.revision}차.doe.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleStartNew = () => {
    const fresh = createDefaultBlankProject();
    setProject(fresh);
    setIsDirty(true);
    setMaxVisitedStep(1);
    setCurrentStep(1);
    setView('workspace');
  };

  const handleLoadProject = (proj) => {
    setProject(proj);
    setIsDirty(false);
    setMaxVisitedStep(10);
    setCurrentStep(1);
    setView('workspace');
  };

  const handleDeleteProject = (id) => {
    setSavedProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleImportFile = (imported) => {
    if (!imported || !imported.design || !imported.runs) {
      alert('유효한 DOE 프로젝트 파일 형식이 아닙니다.');
      return;
    }
    const next = { ...imported, id: imported.id || `imp_${Date.now()}` };
    setSavedProjects(prev => [next, ...prev.filter(p => p.id !== next.id)]);
    handleLoadProject(next);
  };

  // Real-time statistical analysis
  const fullAnalysis = useMemo(() => {
    return analyzeDOE({
      factors: project.design.factors,
      runs: project.runs,
      pooledKeys: [],
      alpha: project.alpha || 0.05,
    });
  }, [project.design.factors, project.runs, project.alpha]);

  const reducedAnalysis = useMemo(() => {
    return analyzeDOE({
      factors: project.design.factors,
      runs: project.runs,
      pooledKeys: project.pooledKeys || [],
      alpha: project.alpha || 0.05,
    });
  }, [project.design.factors, project.runs, project.pooledKeys, project.alpha]);

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#5b616e]">
      {/* Persistent Top Header */}
      <header className="bg-white border-b border-[#dee1e6] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0052ff] text-[#ffffff] font-bold text-xs flex items-center justify-center tracking-wider">
              DOE
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold text-[#0052ff] leading-tight">
                현장에서 쉽게 즉시 사용하는 easyDOE
              </h1>
              <div className="text-xs text-[#7c828a]">
                {project.name}_{project.revision || 1}차.doe.json ·{' '}
                {isDirty ? (
                  <span className="text-[#0052ff] font-semibold">변경 사항 있음 · 실험 저장 필요</span>
                ) : (
                  <span className="text-[#05b169]">저장 완료</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => handleSaveProject(true)} className="doe-btn doe-btn-primary text-xs py-2 px-3">
              <Save size={14} /> 실험 저장
            </button>
            <button onClick={() => setShowSaveModal(true)} className="doe-btn doe-btn-secondary text-xs py-2 px-3">
              <FolderOpen size={14} /> 저장 목록
            </button>
            <button onClick={handleStartNew} className="doe-btn doe-btn-secondary text-xs py-2 px-3">
              <PlusCircle size={14} /> 새 실험 시작
            </button>
            {view === 'workspace' && (
              <button onClick={() => setView('start')} className="doe-btn doe-btn-dark text-xs py-2 px-3">
                <Home size={14} /> 시작 화면
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {view === 'start' ? (
          <StartScreen
            savedProjects={savedProjects}
            onStartNew={handleStartNew}
            onLoadProject={handleLoadProject}
            onOpenSaveModal={() => setShowSaveModal(true)}
          />
        ) : (
          <>
            {/* 10-Step Navigation Grid */}
            <nav aria-label="DOE 분석 10단계" className="step-nav-grid mb-6">
              {STEP_ITEMS.map(st => {
                const isActive = currentStep === st.id;
                const isCompleted = !isActive && st.id <= maxVisitedStep;
                return (
                  <button
                    key={st.id}
                    onClick={() => goToStep(st.id)}
                    className={`step-nav-btn ${isActive ? 'active' : isCompleted ? 'completed' : ''}`}
                  >
                    <span className="step-nav-num">{String(st.id).padStart(2, '0')}</span>
                    <span className="step-nav-title">{st.title}</span>
                  </button>
                );
              })}
            </nav>

            {currentStep === 1 && (
              <Step01Design project={project} updateProject={updateProject} onNext={() => goToStep(2)} />
            )}
            {currentStep === 2 && (
              <Step02Measurement project={project} updateProject={updateProject} onPrev={() => goToStep(1)} onNext={() => goToStep(3)} />
            )}
            {currentStep === 3 && (
              <Step03Graphs project={project} fullAnalysis={fullAnalysis} onPrev={() => goToStep(2)} onNext={() => goToStep(4)} />
            )}
            {currentStep === 4 && (
              <Step04FullModel project={project} updateProject={updateProject} fullAnalysis={fullAnalysis} onPrev={() => goToStep(3)} onNext={() => goToStep(5)} />
            )}
            {currentStep === 5 && (
              <Step05ReducedModel project={project} updateProject={updateProject} reducedAnalysis={reducedAnalysis} onPrev={() => goToStep(4)} onNext={() => goToStep(6)} />
            )}
            {currentStep === 6 && (
              <Step06Residuals reducedAnalysis={reducedAnalysis} onPrev={() => goToStep(5)} onNext={() => goToStep(7)} />
            )}
            {currentStep === 7 && (
              <Step07MathModel project={project} reducedAnalysis={reducedAnalysis} onPrev={() => goToStep(6)} onNext={() => goToStep(8)} />
            )}
            {currentStep === 8 && (
              <Step08Optimizer project={project} updateProject={updateProject} reducedAnalysis={reducedAnalysis} onPrev={() => goToStep(7)} onNext={() => goToStep(9)} />
            )}
            {currentStep === 9 && (
              <Step09Confirmation project={project} updateProject={updateProject} reducedAnalysis={reducedAnalysis} onPrev={() => goToStep(8)} onNext={() => goToStep(10)} />
            )}
            {currentStep === 10 && (
              <Step10Report project={project} updateProject={updateProject} fullAnalysis={fullAnalysis} reducedAnalysis={reducedAnalysis} onPrev={() => goToStep(9)} />
            )}
          </>
        )}
      </main>

      <SaveListModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        savedProjects={savedProjects}
        onSelectProject={handleLoadProject}
        onDeleteProject={handleDeleteProject}
        onImportFile={handleImportFile}
      />
    </div>
  );
}

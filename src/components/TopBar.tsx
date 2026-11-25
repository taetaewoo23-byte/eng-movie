import { RotateCcw } from 'lucide-react';
import { AppStep } from '../types';

interface TopBarProps {
  currentStep: AppStep;
  maxReachedStep: AppStep;
  onSelectStep: (step: AppStep) => void;
  onReset: () => void;
}

const STEPS: Array<{ id: AppStep; label: string; shortLabel: string }> = [
  { id: 'expressions', label: '1. Expressions', shortLabel: '1. Words' },
  { id: 'scene', label: '2. Scene', shortLabel: '2. Scene' },
  { id: 'storyboard', label: '3. Storyboard', shortLabel: '3. Script' },
  { id: 'video', label: '4. Video', shortLabel: '4. Video' },
  { id: 'final', label: '5. Final', shortLabel: '5. Final' },
];

const STEP_ORDER: AppStep[] = ['expressions', 'scene', 'storyboard', 'video', 'final'];

export function TopBar({
  currentStep,
  maxReachedStep,
  onSelectStep,
  onReset,
}: TopBarProps) {
  const maxIdx = STEP_ORDER.indexOf(maxReachedStep);

  return (
    <header className="sticky top-0 z-30 h-14 bg-[#F6F8F7]/92 backdrop-blur-md border-b border-[#D7E0DC]">
      <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectStep('expressions')}
          className="font-display text-xl font-bold tracking-tight text-[#1E292B] whitespace-nowrap shrink-0 min-h-[44px] flex items-center"
        >
          my im
        </button>

        {/* Zone 2: 5 concise single-line step links */}
        <nav
          aria-label="Film creation steps"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {STEPS.map((step, idx) => {
            const unlocked = idx <= maxIdx;
            const active = currentStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && onSelectStep(step.id)}
                className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors ${
                  active
                    ? 'border-[#3F5E96] text-[#1E292B] font-semibold'
                    : unlocked
                    ? 'border-transparent text-[#526063] hover:text-[#1E292B]'
                    : 'border-transparent text-[#9BA8AA] cursor-not-allowed'
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile compact step indicator in center */}
        <div className="md:hidden text-sm font-medium text-[#526063] whitespace-nowrap truncate">
          {STEPS.find((s) => s.id === currentStep)?.label}
        </div>

        {/* Zone 3: Single primary action */}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-sm font-medium text-[#1E292B] bg-[#EBF0ED] hover:bg-[#DFE6E2] transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New Film</span>
        </button>
      </div>
    </header>
  );
}

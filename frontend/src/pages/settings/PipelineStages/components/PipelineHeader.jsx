import { GitBranch, Plus, Zap } from 'lucide-react';
import Button from '../../../../components/common/Button';

const PipelineHeader = ({ totalPipelines, totalStages, onAddPipeline, onAddStage }) => {
  return (
    <div className="flex items-center justify-between mb-6 rounded-2xl ">
      <div className="flex items-center gap-4">
        {/* <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-200 flex-shrink-0">
          <GitBranch size={18} />
        </div> */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline & Stages</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{totalPipelines}</span> Pipelines
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400">
              <span className="font-semibold text-slate-600">{totalStages}</span> Stages
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onAddStage}
          variant="secondary"
          size="sm"
          startIcon={<Plus size={12} />}
        >
          New Stage
        </Button>
        <Button
          variant="primary"
          onClick={onAddPipeline}
          size="sm"
          startIcon={<Zap size={12} />}
        >
          New Pipeline
        </Button>
      </div>
    </div>
  );
};

export default PipelineHeader;
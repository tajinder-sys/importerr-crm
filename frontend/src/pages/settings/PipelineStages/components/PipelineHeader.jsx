import { Plus, Zap } from 'lucide-react';
import Button from '../../../../components/common/ui/Button';
import PageHeader from '../../../../components/common/ui/PageHeader';

const PipelineHeader = ({ totalPipelines, totalStages, onAddPipeline, onAddStage }) => {
  return (
    <PageHeader
      className="mb-6 rounded-2xl"
      title="Pipeline & Stages"
      meta={(
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="text-xs text-slate-400">
            <span className="font-semibold text-slate-600">{totalPipelines}</span> Pipelines
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-400">
            <span className="font-semibold text-slate-600">{totalStages}</span> Stages
          </span>
        </div>
      )}
      actions={(
        <>
          <Button onClick={onAddStage} variant="secondary" size="sm" startIcon={<Plus size={12} />}>
            New Stage
          </Button>
          <Button variant="primary" onClick={onAddPipeline} size="sm" startIcon={<Zap size={12} />}>
            New Pipeline
          </Button>
        </>
      )}
    />
  );
};

export default PipelineHeader;
import { Plus } from 'lucide-react';
import LeadCard from './LeadCard';

/**
 * List layout: one collapsible row per lead (LeadCard accordion variant),
 * grouped by pipeline stage. Same data as the kanban board.
 */
const LeadsAccordionView = ({
  stages,
  leadsByStage,
  isLoading,
  onEdit,
  onAddLead,
  onNotify,
}) => {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      {stages.map((stage) => {
        const leads = leadsByStage[stage._id] || [];
        const accent = stage.color || '#6366f1';

        return (
          <section
            key={stage._id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div
              className="flex items-center justify-between border-b border-slate-100 border-t-[3px] bg-white px-4 py-3"
              style={{ borderTopColor: accent }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full shadow-sm"
                  style={{ backgroundColor: accent }}
                />
                <h2 className="truncate text-sm font-bold text-slate-800">{stage.name}</h2>
                <span
                  className="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: `${accent}18`,
                    color: accent,
                  }}
                >
                  {leads.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAddLead(stage.pipelineId._id, stage._id)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                title="Add lead to this stage"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-2 bg-slate-50/80 p-3">
              {isLoading && (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl border border-slate-100 bg-white p-4"
                    >
                      <div className="flex gap-3">
                        <div className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-2/3 rounded bg-slate-100" />
                          <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && leads.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
                  <p className="text-xs font-medium text-slate-400">No leads in this stage</p>
                  <button
                    type="button"
                    onClick={() => onAddLead(stage.pipelineId._id, stage._id)}
                    className="mt-2 text-[11px] font-semibold hover:underline"
                    style={{ color: accent }}
                  >
                    Add first lead
                  </button>
                </div>
              )}

              {!isLoading &&
                leads.map((lead) => (
                  <LeadCard
                    key={lead._id}
                    lead={lead}
                    variant="accordion"
                    accordionGroupName={`stage-${stage._id}`}
                    onEdit={onEdit}
                    onNotify={onNotify}
                  />
                ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default LeadsAccordionView;

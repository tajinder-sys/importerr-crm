import api from './api';
import { API_ROUTES } from './apiRoutes';

/** Attach active stages to each pipeline (for lead form stage dropdown). */
export async function enrichPipelinesWithStages(pipelines = []) {
  return Promise.all(
    pipelines.map(async (p) => {
      if (p?.stages?.length) return p;
      try {
        const sr = await api.get(API_ROUTES.stages.list, { params: { pipelineId: p._id } });
        const stages = (sr?.data?.stages || []).filter((s) => s.isActive);
        return { ...p, stages };
      } catch {
        return { ...p, stages: [] };
      }
    }),
  );
}

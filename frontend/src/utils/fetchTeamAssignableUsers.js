import api from './api';
import { API_ROUTES } from './apiRoutes';

/**
 * Active CRM team_member + team_manager users, `_id` and `name` only.
 * @param {{ teamId?: string, pipelineId?: string }} [opts] — Prefer `pipelineId` (lead pipeline); else `team_id` for admin-wide team filter. Team managers are scoped server-side.
 * @returns {Promise<Array<{ _id: string, name: string }>>}
 */
export async function fetchTeamAssignableUsers(opts = {}) {
  const teamId = opts.teamId ? String(opts.teamId).trim() : '';
  const pipelineId = opts.pipelineId ? String(opts.pipelineId).trim() : '';
  const params = {};
  if (pipelineId) params.pipeline_id = pipelineId;
  else if (teamId) params.team_id = teamId;
  const res = await api.get(API_ROUTES.users.teamAssignable, {
    params: Object.keys(params).length ? params : undefined,
  });
  return res?.data?.users ?? [];
}

const User = require('../models/User');
const { USER_ROLES } = require('../utils/constants');
const { getCatalogEntry } = require('../utils/notificationCatalog');

const toId = (value) => (value ? String(value) : null);

async function fetchUsersByIds(ids) {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  if (!unique.length) return [];
  return User.find({ _id: { $in: unique }, isActive: true })
    .select('_id role team_id')
    .lean();
}

async function fetchTeamManagers(teamId) {
  if (!teamId) return [];
  return User.find({
    team_id: teamId,
    role: USER_ROLES.TEAM_MANAGER,
    isActive: true,
  })
    .select('_id role team_id')
    .lean();
}

async function fetchAllTeamManagers() {
  return User.find({ role: USER_ROLES.TEAM_MANAGER, isActive: true })
    .select('_id role team_id')
    .lean();
}

async function fetchAllAdmins() {
  return User.find({ role: USER_ROLES.ADMIN, isActive: true })
    .select('_id role team_id')
    .lean();
}

/**
 * Build candidate recipients from event context using catalog recipientStrategy.
 */
async function resolveCandidateUsers(typeKey, context = {}) {
  const entry = getCatalogEntry(typeKey);
  if (!entry) return [];

  const strategy = entry.recipientStrategy;
  const ids = new Set();

  const add = (id) => {
    if (id) ids.add(String(id));
  };

  switch (strategy) {
    case 'assignee':
      add(context.assigneeUserId);
      break;

    case 'assignee_and_previous':
      add(context.assigneeUserId);
      add(context.previousAssigneeUserId);
      break;

    case 'explicit':
      (context.recipientUserIds || []).forEach(add);
      break;

    case 'team_managers':
      (await fetchTeamManagers(context.teamId)).forEach((u) => add(u._id));
      break;

    case 'all_team_managers':
      (await fetchAllTeamManagers()).forEach((u) => add(u._id));
      break;

    case 'assignee_and_team_managers':
      add(context.assigneeUserId);
      (await fetchTeamManagers(context.teamId)).forEach((u) => add(u._id));
      break;

    case 'assignee_and_all_team_managers':
      add(context.assigneeUserId);
      (await fetchAllTeamManagers()).forEach((u) => add(u._id));
      break;

    case 'team_managers_and_admins':
      if (context.teamId) {
        (await fetchTeamManagers(context.teamId)).forEach((u) => add(u._id));
      } else {
        (await fetchAllTeamManagers()).forEach((u) => add(u._id));
      }
      (await fetchAllAdmins()).forEach((u) => add(u._id));
      break;

    case 'all_admins':
      (await fetchAllAdmins()).forEach((u) => add(u._id));
      break;

    default:
      break;
  }

  const actorId = toId(context.actorUserId);
  if (actorId) ids.delete(actorId);

  return fetchUsersByIds([...ids]);
}

/**
 * Filter candidates by admin-configured policy (enabled + role toggles).
 */
function filterByPolicy(candidates, policy) {
  if (!policy?.enabled) return [];
  return candidates.filter((user) => Boolean(policy.roles?.[user.role]));
}

module.exports = {
  resolveCandidateUsers,
  filterByPolicy,
};

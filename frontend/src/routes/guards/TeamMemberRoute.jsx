import RoleRoute from './RoleRoute';
import { USER_ROLES } from '../../utils/constants';

/** Team manager or team member (not admin) */
const TeamMemberRoute = ({ children }) => (
  <RoleRoute allowedRoles={[USER_ROLES.TEAM_MANAGER, USER_ROLES.TEAM_MEMBER]}>
    {children}
  </RoleRoute>
);

export default TeamMemberRoute;

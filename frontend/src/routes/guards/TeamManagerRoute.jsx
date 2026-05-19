import RoleRoute from './RoleRoute';
import { USER_ROLES } from '../../utils/constants';

const TeamManagerRoute = ({ children }) => (
  <RoleRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.TEAM_MANAGER]}>
    {children}
  </RoleRoute>
);

export default TeamManagerRoute;

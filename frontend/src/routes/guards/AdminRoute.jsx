import RoleRoute from './RoleRoute';
import { USER_ROLES } from '../../utils/constants';

const AdminRoute = ({ children }) => (
  <RoleRoute allowedRoles={[USER_ROLES.ADMIN]}>{children}</RoleRoute>
);

export default AdminRoute;

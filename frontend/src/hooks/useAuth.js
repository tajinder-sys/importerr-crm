import { useDispatch, useSelector } from 'react-redux';
import { clearAuthError, loginWithCredentials, logoutAccount } from '../store/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  return {
    ...auth,
    login: (email, password) =>
      dispatch(loginWithCredentials({ email, password })).unwrap(),
    logout: () => dispatch(logoutAccount()),
    clearError: () => dispatch(clearAuthError()),
  };
}

import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UsersRound } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/common/ui/Card';
import { UiPageTitle, UiPageDescription, UiSectionTitle } from '../components/common/ui';
import Alert from '../components/common/ui/Alert';
import Loading from '../components/common/ui/Loading';
import Chip from '../components/common/ui/Chip';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES } from '../utils/constants';
import { formatPhone } from '../utils/helpers';
import { getChipVariant } from '../utils/chipConstants';
import api from '../utils/api';
import { API_ROUTES } from '../utils/apiRoutes';

const MyTeam = () => {
  const { user } = useAuth();
  const allowed =
    user?.role === USER_ROLES.TEAM_MANAGER || user?.role === USER_ROLES.TEAM_MEMBER;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(API_ROUTES.users.myTeam);
      if (res?.success) {
        setTeam(res.data?.team || null);
        setMembers(Array.isArray(res.data?.users) ? res.data.users : []);
      } else {
        setError(res?.message || 'Failed to load team');
      }
    } catch (err) {
      setError(err?.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  if (!allowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 px-4 py-6 dark:bg-slate-900 sm:px-6 md:px-8">
      <div className="mx-auto space-y-6">
        <div>
          <UiPageTitle className="flex items-center gap-2">
            <UsersRound className="h-7 w-7 text-primary-600" />
            My team
          </UiPageTitle>
          <UiPageDescription>
            Active managers and members on your team. Contact an admin to add or change users.
          </UiPageDescription>
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        {loading ? (
          <Loading label="Loading team…" />
        ) : !team ? (
          <Alert variant="warning">
            No team is assigned to your account. Ask an admin to assign you to a team.
          </Alert>
        ) : (
          <>
            <Card className="rounded-2xl border-gray-200 shadow-sm">
              <CardHeader className="border-gray-100">
                <UiSectionTitle>{team.name}</UiSectionTitle>
                {team.description ? (
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{team.description}</p>
                ) : null}
                {team.status && team.status !== 'active' ? (
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                    Team status: {team.status}
                  </p>
                ) : null}
              </CardHeader>
            </Card>

            <Card className="rounded-2xl border-gray-200 shadow-sm">
              <CardHeader className="border-gray-100">
                <UiSectionTitle>Team members ({members.length})</UiSectionTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {members.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                    No active team members found.
                  </p>
                ) : (
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-slate-700 dark:text-slate-400">
                        <th className="pb-3 pr-4 font-semibold">Name</th>
                        <th className="pb-3 pr-4 font-semibold">Email</th>
                        <th className="pb-3 pr-4 font-semibold">Phone</th>
                        <th className="pb-3 pr-4 font-semibold">Role</th>
                        <th className="pb-3 font-semibold">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {members.map((m) => (
                        <tr key={m._id} className="text-gray-800 dark:text-slate-200">
                          <td className="py-3 pr-4 font-medium">{m.name}</td>
                          <td className="py-3 pr-4 text-gray-600 dark:text-slate-400">{m.email}</td>
                          <td className="py-3 pr-4 text-gray-600 dark:text-slate-400">
                            {m.phone ? formatPhone(m.phone) : '—'}
                          </td>
                          <td className="py-3 pr-4">
                            <Chip label={m.role} variant={getChipVariant('ROLE', m.role)} />
                          </td>
                          <td className="py-3">
                            <Chip
                              label={m.priority || 'medium'}
                              variant={getChipVariant('PRIORITY', m.priority || 'medium')}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default MyTeam;

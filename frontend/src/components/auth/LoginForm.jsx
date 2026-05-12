import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Users, ChartNoAxesCombined } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import Input from '../common/Input';
import Alert from '../common/Alert';
import { validateEmail, validateRequired } from '../../utils/helpers';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const appLogo = '/images/image.png';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const emailError = validateRequired(formData.email, 'Email');
    if (emailError) newErrors.email = emailError;
    else if (!validateEmail(formData.email)) newErrors.email = 'Invalid email format';
    
    const passwordError = validateRequired(formData.password, 'Password');
    if (passwordError) newErrors.password = passwordError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
          <div className="hidden border-r border-slate-200 bg-slate-50 p-12 lg:flex lg:items-center">
            <div className="mx-auto max-w-md">
            <img src={appLogo} alt="Importerr CRM" className="mb-8 h-12 w-auto rounded-md" />
            <h1 className="text-3xl font-semibold leading-tight text-slate-900">
              Built for modern teams managing leads at scale
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Importerr CRM centralizes lead tracking, ownership, and follow-ups so your team can close deals faster
              with better visibility.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-white p-2 text-slate-700 ring-1 ring-slate-200">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">Team-first workflow</p>
                  <p className="text-xs text-slate-600">Assign and manage members from one place.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-white p-2 text-slate-700 ring-1 ring-slate-200">
                  <ChartNoAxesCombined className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">Faster conversions</p>
                  <p className="text-xs text-slate-600">Prioritize leads and act with clear context.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-white p-2 text-slate-700 ring-1 ring-slate-200">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">Secure access</p>
                  <p className="text-xs text-slate-600">Admin-controlled accounts for your organization.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

          <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
            <div className="w-full max-w-md">
              <div className="mb-8 border-b border-slate-100 pb-6">
                <div className="mb-5 lg:hidden">
                  <img src={appLogo} alt="Importerr CRM" className="h-12 w-auto rounded-md object-contain" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-700">Welcome Back</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Sign in to Importerr CRM</h2>
                <p className="mt-2 text-sm text-slate-500">Use your admin or team member credentials to continue.</p>
              </div>
              <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 lg:hidden">
                Secure login for authorized team members only.
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <Alert variant="error" dismissible onDismiss={clearError}>
                    {error}
                  </Alert>
                )}

                <div className="space-y-4">
                  <Input
                    name="email"
                    type="email"
                    label="Email address"
                    value={formData.email}
                    onChange={handleChange}
                    error={errors.email}
                    required
                    autoComplete="email"
                    placeholder="Enter your email"
                  />

                  <Input
                    name="password"
                    type="password"
                    label="Password"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                      Need help?
                    </a>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  loading={isLoading}
                  disabled={isLoading}
                >
                  Sign in
                </Button>

                <p className="text-center text-xs text-gray-500">
                  Need access? Contact the system administrator.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

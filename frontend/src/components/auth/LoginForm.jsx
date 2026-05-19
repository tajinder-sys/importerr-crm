import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTE_PATHS } from '../../routes/paths';
import { ShieldCheck, Users, ChartNoAxesCombined, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validateRequired } from '../../utils/helpers';

const LoginForm = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (error) clearError();
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
      const redirectTo = location.state?.from?.pathname || ROUTE_PATHS.DASHBOARD;
      navigate(redirectTo, { replace: true });
    } catch (e){
      console.error('Login failed:', e);
    }
  };

  const features = [
    { icon: Users, title: 'Team-first workflow', desc: 'Assign and manage leads across your team from one place.' },
    { icon: ChartNoAxesCombined, title: 'Faster conversions', desc: 'Prioritize leads and act with full context.' },
    { icon: ShieldCheck, title: 'Secure access', desc: 'Role-based access control for your organization.' },
  ];

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col bg-primary-700 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-white/10" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div>
            <img
              src="/images/transprint_light_logo.png"
              alt="Importerr CRM"
              className="w-48 h-auto object-contain"
            />
          </div>

          {/* Middle content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight">
                Manage leads.<br />Close deals faster.
              </h1>
              <p className="mt-4 text-base text-primary-200 leading-relaxed max-w-sm">
                Importerr CRM centralizes lead tracking, team assignments, and follow-ups so you never miss an opportunity.
              </p>
            </div>

            <div className="space-y-5">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-primary-200 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-primary-300">
            © {new Date().getFullYear()} Importerr CRM. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <img src="/images/image.png" alt="Importerr CRM" className="h-10 w-auto" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <span className="inline-block rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 mb-4">
              Welcome back
            </span>
            <h2 className="text-3xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">Enter your credentials to access your account.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  name="email" type="email" value={formData.email}
                  onChange={handleChange} autoComplete="email"
                  placeholder="you@company.com"
                  className={`w-full rounded-xl border pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white'}`}
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  name="password" type={showPass ? 'text' : 'password'} value={formData.password}
                  onChange={handleChange} autoComplete="current-password"
                  placeholder="Enter your password"
                  className={`w-full rounded-xl border pl-10 pr-14 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:bg-white'}`}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-primary-600 transition-colors">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>}
            </div>

            {/* Remember + Help */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-primary-600" />
                <span className="text-sm text-slate-600">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-700">Need help?</a>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Signing in…</>
              ) : (
                <>Sign in <ArrowRight className="h-4 w-4" /></>
              )}
            </button>

            <p className="text-center text-xs text-slate-400">
              Need access? Contact your system administrator.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

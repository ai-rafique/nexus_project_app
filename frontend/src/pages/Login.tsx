import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [requireTotp, setRequireTotp] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(data.email, data.password, requireTotp ? totpCode : undefined);
      if (result.requireTotp) {
        setRequireTotp(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const { email, password } = getValues();
      await login(email, password, totpCode);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Invalid 2FA code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>NEXUS</h1>
        <h2>Sign in to your account</h2>

        {!requireTotp ? (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <span className="error">{errors.email.message}</span>}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <span className="error">{errors.password.message}</span>}
            </div>

            {error && <div className="alert-error">{error}</div>}

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTotpSubmit}>
            <p>Enter the 6-digit code from your authenticator app.</p>
            <div className="field">
              <label htmlFor="totp">Authentication code</label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                autoFocus
              />
            </div>
            {error && <div className="alert-error">{error}</div>}
            <button type="submit" disabled={isSubmitting || totpCode.length !== 6}>
              {isSubmitting ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" onClick={() => setRequireTotp(false)}>
              Back
            </button>
          </form>
        )}

        <p style={{ marginTop: '1rem' }}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

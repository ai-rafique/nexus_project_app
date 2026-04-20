import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [requireTotp, setRequireTotp] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setError(''); setLoading(true);
    try {
      const result = await login(data.email, data.password);
      if (result.requireTotp) setRequireTotp(true);
      else navigate('/dashboard');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Login failed');
    } finally { setLoading(false); }
  };

  const onTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { email, password } = getValues();
      await login(email, password, totpCode);
      navigate('/dashboard');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid code');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-brand-600">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-brand-600 tracking-tight">NEXUS</h1>
          <h2 className="text-base text-muted-foreground mt-1">Sign in to your account</h2>
        </div>

        {!requireTotp ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register('email')} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <form onSubmit={onTotpSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
            <div className="space-y-1.5">
              <Label htmlFor="totp">Authentication code</Label>
              <Input id="totp" type="text" inputMode="numeric" maxLength={6} value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)} autoFocus />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
              {loading ? 'Verifying…' : 'Verify'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setRequireTotp(false)}>
              Back
            </Button>
          </form>
        )}

        <p className="mt-6 text-sm text-center text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}

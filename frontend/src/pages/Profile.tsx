import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { User, Lock, Camera, Trash2, Upload } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { profileApi } from '@/api/profile';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarBust, setAvatarBust] = useState(Date.now());

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    email:     user?.email     ?? '',
  });

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });

  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (user) {
      setProfileForm({ firstName: user.firstName, lastName: user.lastName, email: user.email });
    }
  }, [user]);

  const profileMut = useMutation({
    mutationFn: () => profileApi.update(profileForm),
    onSuccess: async () => {
      await refreshUser();
      toast.success('Profile updated');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update profile';
      toast.error(msg);
    },
  });

  const passwordMut = useMutation({
    mutationFn: () => profileApi.updatePassword({
      currentPassword: pwForm.currentPassword,
      newPassword:     pwForm.newPassword,
    }),
    onSuccess: () => {
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwError('');
      toast.success('Password updated');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to update password';
      toast.error(msg);
    },
  });

  const avatarMut = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: async () => {
      await refreshUser();
      setAvatarBust(Date.now());
      toast.success('Avatar updated');
    },
    onError: () => toast.error('Failed to upload avatar'),
  });

  const deleteAvatarMut = useMutation({
    mutationFn: profileApi.deleteAvatar,
    onSuccess: async () => {
      await refreshUser();
      setAvatarBust(Date.now());
      toast.success('Avatar removed');
    },
    onError: () => toast.error('Failed to remove avatar'),
  });

  const handlePasswordSubmit = () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setPwError('');
    passwordMut.mutate();
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U';

  return (
    <AppShell>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account information and security</p>
        </div>

        <div className="space-y-6">
          {/* Avatar + basic info header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Profile Information</CardTitle>
              </div>
              <CardDescription>Update your name, email, and profile photo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-brand-600 flex items-center justify-center ring-2 ring-border">
                    {user?.hasAvatar ? (
                      <img
                        src={profileApi.avatarUrl(avatarBust)}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">{initials}</span>
                    )}
                  </div>
                  <button
                    className="absolute -bottom-1 -right-1 bg-brand-600 text-white rounded-full p-1.5 shadow hover:bg-brand-700 transition-colors"
                    onClick={() => fileRef.current?.click()}
                    title="Upload photo"
                  >
                    <Camera className="h-3 w-3" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={user?.globalRole === 'super_admin' ? 'default' : 'secondary'}>
                      {user?.globalRole === 'super_admin' ? 'Super Admin' : 'Member'}
                    </Badge>
                    {user?.isTotpEnabled && <Badge variant="success">2FA On</Badge>}
                  </div>
                  {user?.hasAvatar && (
                    <button
                      onClick={() => deleteAvatarMut.mutate()}
                      disabled={deleteAvatarMut.isPending}
                      className="text-xs text-red-500 hover:text-red-600 mt-1.5 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) avatarMut.mutate(file);
                  e.target.value = '';
                }}
              />

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => profileMut.mutate()}
                  disabled={profileMut.isPending}
                >
                  {profileMut.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Change Password</CardTitle>
              </div>
              <CardDescription>Minimum 8 characters. Use a strong, unique password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-pw">Current Password</Label>
                <Input
                  id="current-pw"
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-pw">New Password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-pw">Confirm New Password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                />
              </div>
              {pwError && <p className="text-xs text-red-600">{pwError}</p>}
              <div className="flex justify-end">
                <Button
                  onClick={handlePasswordSubmit}
                  disabled={passwordMut.isPending || !pwForm.currentPassword || !pwForm.newPassword}
                >
                  {passwordMut.isPending ? 'Updating…' : 'Update Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Image, Upload, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { settingsApi } from '@/api/settings';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Settings() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState('');
  const [logoBust, setLogoBust] = useState(Date.now());

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  useEffect(() => {
    if (settings) setCompanyName(settings.companyName);
  }, [settings]);

  const updateMut = useMutation({
    mutationFn: () => settingsApi.update({ companyName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const logoMut = useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setLogoBust(Date.now());
      toast.success('Logo uploaded');
    },
    onError: () => toast.error('Failed to upload logo'),
  });

  const deleteLogoMut = useMutation({
    mutationFn: settingsApi.deleteLogo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setLogoBust(Date.now());
      toast.success('Logo removed');
    },
    onError: () => toast.error('Failed to remove logo'),
  });

  return (
    <AppShell>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your organisation's workspace</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-36 bg-white border rounded-lg animate-pulse" />
            <div className="h-48 bg-white border rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Company Name */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Company Information</CardTitle>
                </div>
                <CardDescription>Used in PDF document headers and exports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      className="mt-1.5"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Engineering Ltd"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => updateMut.mutate()}
                      disabled={updateMut.isPending || companyName === settings?.companyName}
                    >
                      {updateMut.isPending ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Logo */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Company Logo</CardTitle>
                </div>
                <CardDescription>PNG, JPEG, or SVG — max 2 MB. Appears on PDF exports.</CardDescription>
              </CardHeader>
              <CardContent>
                {settings?.hasLogo ? (
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg mb-4">
                    <img
                      src={settingsApi.logoUrl(logoBust)}
                      alt="Company logo"
                      className="h-14 max-w-[160px] object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">Logo uploaded</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{settings.logoMimeType ?? 'image'}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      onClick={() => deleteLogoMut.mutate()}
                      disabled={deleteLogoMut.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg mb-4 text-muted-foreground text-sm">
                    No logo uploaded
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) logoMut.mutate(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={logoMut.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoMut.isPending ? 'Uploading…' : settings?.hasLogo ? 'Replace Logo' : 'Upload Logo'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

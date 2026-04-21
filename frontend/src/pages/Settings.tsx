import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/api/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Settings() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState('');
  const [saved, setSaved] = useState(false);

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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const logoMut = useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const deleteLogoMut = useMutation({
    mutationFn: settingsApi.deleteLogo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  if (isLoading) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">System Settings</h1>

      <div className="bg-[#16213e] border border-[#0f3460]/40 rounded-lg p-6 space-y-6">
        {/* Company name */}
        <div>
          <Label className="text-gray-300">Company Name</Label>
          <div className="flex gap-3 mt-2">
            <Input
              className="bg-[#1a1a2e] border-[#0f3460] text-white flex-1"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Button
              onClick={() => updateMut.mutate()}
              disabled={updateMut.isPending || companyName === settings?.companyName}
            >
              {saved ? 'Saved!' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Logo */}
        <div>
          <Label className="text-gray-300">Company Logo</Label>
          <p className="text-xs text-gray-500 mb-3">Used in PDF exports. PNG, JPEG, or SVG, max 2 MB.</p>

          {settings?.logoPath ? (
            <div className="flex items-center gap-4">
              <img
                src={settingsApi.logoUrl()}
                alt="Company logo"
                className="h-12 object-contain bg-white rounded p-1"
              />
              <Button
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                onClick={() => deleteLogoMut.mutate()}
                disabled={deleteLogoMut.isPending}
              >
                Remove Logo
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No logo set.</p>
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
            variant="ghost"
            className="mt-3"
            onClick={() => fileRef.current?.click()}
            disabled={logoMut.isPending}
          >
            {logoMut.isPending ? 'Uploading…' : settings?.logoPath ? 'Replace Logo' : 'Upload Logo'}
          </Button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Save } from 'lucide-react';
import { SettingsData } from '../types';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsData | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
        const { data } = await supabase.from('settings').select('*').single();
        if (data) setSettings(data);
        else {
            // Init empty settings if none exist
            setSettings({
                pgName: '',
                address: '',
                defaultRentDay: 1,
                managerName: '',
                managerPhone: ''
            });
        }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings) {
        // Upsert logic
        const { error } = await supabase.from('settings').upsert({ ...settings, id: settings.id || 1 });
        if (!error) alert('Settings saved successfully!');
        else alert('Error saving settings');
    }
  };

  if (!settings) return <div className="p-10 text-center">Loading settings...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
         <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
         <p className="text-sm text-muted-foreground">Manage your PG details and preferences.</p>
      </div>

      <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">PG Name</label>
            <input 
              type="text" 
              value={settings.pgName}
              onChange={e => setSettings({...settings, pgName: e.target.value})}
              className="w-full p-2 bg-background border border-border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <textarea 
              value={settings.address}
              onChange={e => setSettings({...settings, address: e.target.value})}
              className="w-full p-2 bg-background border border-border rounded-md"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Manager Name</label>
                <input 
                type="text" 
                value={settings.managerName}
                onChange={e => setSettings({...settings, managerName: e.target.value})}
                className="w-full p-2 bg-background border border-border rounded-md"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Manager Phone</label>
                <input 
                type="text" 
                value={settings.managerPhone}
                onChange={e => setSettings({...settings, managerPhone: e.target.value})}
                className="w-full p-2 bg-background border border-border rounded-md"
                />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Default Rent Payment Day</label>
            <input 
              type="number" 
              value={settings.defaultRentDay}
              onChange={e => setSettings({...settings, defaultRentDay: Number(e.target.value)})}
              className="w-full p-2 bg-background border border-border rounded-md"
              min={1}
              max={31}
            />
            <p className="text-xs text-muted-foreground">Day of the month when rent is expected.</p>
          </div>

          <div className="pt-4">
             <button type="submit" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                <Save className="w-4 h-4" />
                Save Changes
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
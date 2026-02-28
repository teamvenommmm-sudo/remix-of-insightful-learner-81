import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Brain, Shield, Zap, Database, Bell } from "lucide-react";

type SettingRow = { id: string; setting_key: string; setting_value: { value: any }; description: string };

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, SettingRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("system_settings").select("*").then(({ data }) => {
      const map: Record<string, SettingRow> = {};
      (data || []).forEach((s: any) => { map[s.setting_key] = s; });
      setSettings(map);
      setLoading(false);
    });
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], setting_value: { value } },
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    for (const [key, s] of Object.entries(settings)) {
      await supabase.from("system_settings").update({
        setting_value: s.setting_value,
        updated_at: new Date().toISOString(),
      }).eq("setting_key", key);
    }
    toast({ title: "Settings saved", description: "All system settings have been updated." });
    setSaving(false);
  };

  const val = (key: string) => settings[key]?.setting_value?.value;

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Settings className="h-7 w-7" /> System Settings</h1>
          <p className="text-muted-foreground">Configure AI models, thresholds, and system behavior</p>
        </div>
        <Button onClick={saveAll} disabled={saving}>{saving ? "Saving..." : "Save All Settings"}</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" /> AI Configuration</CardTitle>
            <CardDescription>Configure the AI model used for cognitive analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>AI Model</Label>
              <Select value={val("ai_model") || ""} onValueChange={(v) => updateSetting("ai_model", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (Fast)</SelectItem>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash (Balanced)</SelectItem>
                  <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro (Best Quality)</SelectItem>
                  <SelectItem value="openai/gpt-5-mini">GPT-5 Mini (Balanced)</SelectItem>
                  <SelectItem value="openai/gpt-5">GPT-5 (Best Quality)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Risk Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Risk Thresholds</CardTitle>
            <CardDescription>Define when students are flagged as at-risk</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>At-Risk Accuracy Threshold (%)</Label>
              <Input
                type="number" min={0} max={100}
                value={val("risk_threshold") ?? 40}
                onChange={(e) => updateSetting("risk_threshold", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">Students below this accuracy are flagged</p>
            </div>
          </CardContent>
        </Card>

        {/* Cognitive Drift */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Cognitive Drift</CardTitle>
            <CardDescription>Tune drift detection sensitivity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Drift Sensitivity (CSI deduction per type change)</Label>
              <Input
                type="number" min={1} max={50}
                value={val("drift_sensitivity") ?? 15}
                onChange={(e) => updateSetting("drift_sensitivity", Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Breakthrough Detection Threshold</Label>
              <Input
                type="number" min={0} max={1} step={0.05}
                value={val("breakthrough_threshold") ?? 0.6}
                onChange={(e) => updateSetting("breakthrough_threshold", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">Error probability above which a correct answer triggers a breakthrough event</p>
            </div>
            <div>
              <Label>Session Fatigue Threshold</Label>
              <Input
                type="number" min={0} max={1} step={0.05}
                value={val("session_fatigue_threshold") ?? 0.15}
                onChange={(e) => updateSetting("session_fatigue_threshold", Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">Accuracy drop % to detect fatigue</p>
            </div>
          </CardContent>
        </Card>

        {/* System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> System</CardTitle>
            <CardDescription>General system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Real-Time Updates</Label>
                <p className="text-xs text-muted-foreground">Enable live dashboard updates via WebSocket</p>
              </div>
              <Switch
                checked={val("realtime_enabled") ?? true}
                onCheckedChange={(v) => updateSetting("realtime_enabled", v)}
              />
            </div>
            <div>
              <Label>Data Retention (Days)</Label>
              <Input
                type="number" min={30} max={3650}
                value={val("data_retention_days") ?? 365}
                onChange={(e) => updateSetting("data_retention_days", Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

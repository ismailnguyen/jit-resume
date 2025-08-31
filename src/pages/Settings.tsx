import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, TestTube, Trash2, AlertTriangle } from "lucide-react";
import { clearAllData } from "@/lib/storage";

const Settings = () => {
  const { settings, setSettings, clearAllData: clearStoreData } = useStore();
  const { toast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  const handleApiKeyChange = (value: string) => {
    setSettings({ openAIApiKey: value || null });
  };

  const testApiKey = async () => {
    if (!settings.openAIApiKey) {
      toast({
        title: "No API Key",
        description: "Please enter an API key first.",
        variant: "destructive",
      });
      return;
    }

    setTestingKey(true);
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${settings.openAIApiKey}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Your API key is working correctly.",
          variant: "default",
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "API Key Test Failed",
        description: "Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleClearAllData = async () => {
    setClearingData(true);
    try {
      await clearAllData();
      clearStoreData();
      toast({
        title: "Data Cleared",
        description: "All your data has been removed from this device.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear all data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setClearingData(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure your preferences and API settings.
        </p>
      </div>

      {/* OpenAI API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>OpenAI API Configuration</CardTitle>
          <CardDescription>
            Your API key is stored locally and only used to generate résumés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={settings.openAIApiKey || ""}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="sk-..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={testApiKey}
                disabled={!settings.openAIApiKey || testingKey}
                variant="outline"
              >
                <TestTube className="h-4 w-4 mr-1" />
                {testingKey ? "Testing..." : "Test Key"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                OpenAI Platform
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">AI Model</Label>
            <Select
              value={settings.model}
              onValueChange={(value: typeof settings.model) => setSettings({ model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recommended)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini</SelectItem>
                <SelectItem value="gpt-4.1">GPT-4.1</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              GPT-4o Mini offers the best balance of quality and cost for most users.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resume Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Resume Preferences</CardTitle>
          <CardDescription>
            Customize how your résumés are generated and formatted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pdfTheme">PDF Theme</Label>
            <Select
              value={settings.pdfTheme}
              onValueChange={(value: typeof settings.pdfTheme) => setSettings({ pdfTheme: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Modern: clean sans-serif. Classic: serif and traditional spacing. Compact: tighter layout to fit more on one page.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultLanguage">Default Language</Label>
            <Select
              value={settings.defaultLanguage}
              onValueChange={(value: typeof settings.defaultLanguage) => setSettings({ defaultLanguage: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include Contact Links</Label>
              <p className="text-xs text-muted-foreground">
                Include social media and portfolio links in résumé header
              </p>
            </div>
            <Switch
              checked={settings.includeContactLinks}
              onCheckedChange={(checked) => setSettings({ includeContactLinks: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Anonymize Location</Label>
              <p className="text-xs text-muted-foreground">
                Only show city and country, not full address
              </p>
            </div>
            <Switch
              checked={settings.anonymizeLocation}
              onCheckedChange={(checked) => setSettings({ anonymizeLocation: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Data Management</CardTitle>
          <CardDescription>
            Manage your local data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This will permanently delete all your résumés, personal details, and settings from this device.
              Your data cannot be recovered after this action.
            </AlertDescription>
          </Alert>
          <Button
            variant="destructive"
            onClick={handleClearAllData}
            disabled={clearingData}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {clearingData ? "Clearing..." : "Clear All Data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings as SettingsIcon, User, Globe, Video } from "lucide-react";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  language: string;
  zoom_api_key: string | null;
  zoom_api_secret: string | null;
  zoom_account_id: string | null;
  whatsapp_phone_number_id: string | null;
  whatsapp_token: string | null;
}

const Settings = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    language: "en",
    zoom_api_key: "",
    zoom_api_secret: "",
    zoom_account_id: "",
    whatsapp_phone_number_id: "",
    whatsapp_token: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        email: data.email || "",
        language: data.language || "en",
        zoom_api_key: data.zoom_api_key || "",
        zoom_api_secret: data.zoom_api_secret || "",
        zoom_account_id: data.zoom_account_id || "",
        whatsapp_phone_number_id: data.whatsapp_phone_number_id || "",
        whatsapp_token: data.whatsapp_token || "",
      });
      // Update i18n language
      if (data.language) {
        i18n.changeLanguage(data.language);
      }
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        email: formData.email,
        language: formData.language,
        whatsapp_phone_number_id: formData.whatsapp_phone_number_id || null,
        whatsapp_token: formData.whatsapp_token || null,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("settings.profileUpdated"),
      });
      i18n.changeLanguage(formData.language);
      loadProfile();
    }
    setLoading(false);
  };

  const handleConnectZoom = async () => {
    if (!formData.zoom_api_key || !formData.zoom_api_secret || !formData.zoom_account_id) {
      toast({
        title: "Error",
        description: "Please enter Client ID, Client Secret, and Account ID",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        zoom_api_key: formData.zoom_api_key,
        zoom_api_secret: formData.zoom_api_secret,
        zoom_account_id: formData.zoom_account_id,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error connecting Zoom",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("settings.zoomConnectedSuccess"),
      });
      loadProfile();
    }
    setLoading(false);
  };

  const handleDisconnectZoom = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        zoom_api_key: null,
        zoom_api_secret: null,
        zoom_account_id: null,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error disconnecting Zoom",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("settings.zoomDisconnectedSuccess"),
      });
      setFormData({ ...formData, zoom_api_key: "", zoom_api_secret: "", zoom_account_id: "" });
      loadProfile();
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isZoomConnected = profile?.zoom_api_key && profile?.zoom_api_secret && profile?.zoom_account_id;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            {t("settings.title")}
          </h1>
          <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("settings.profile")}
            </CardTitle>
            <CardDescription>{t("settings.updateProfile")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">{t("settings.fullName")}</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("settings.email")}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="teacher@example.com"
              />
            </div>
            <Button onClick={handleUpdateProfile} disabled={loading}>
              {t("settings.updateProfile")}
            </Button>
          </CardContent>
        </Card>

        {/* Language Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t("settings.language")}
            </CardTitle>
            <CardDescription>{t("settings.languageDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t("settings.language")}</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => {
                  setFormData({ ...formData, language: value });
                  i18n.changeLanguage(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  <SelectItem value="fr">Français (French)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdateProfile} disabled={loading}>
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>

        {/* Zoom Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              {t("settings.zoom")}
            </CardTitle>
            <CardDescription>{t("settings.zoomDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isZoomConnected ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    {t("settings.zoomConnected")}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleDisconnectZoom}
                  disabled={loading}
                >
                  {t("settings.disconnectZoom")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="zoom_api_key">Client ID</Label>
                  <Input
                    id="zoom_api_key"
                    type="password"
                    value={formData.zoom_api_key}
                    onChange={(e) => setFormData({ ...formData, zoom_api_key: e.target.value })}
                    placeholder="Zoom OAuth Client ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in your Zoom OAuth app settings (Server-to-Server OAuth)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zoom_api_secret">Client Secret</Label>
                  <Input
                    id="zoom_api_secret"
                    type="password"
                    value={formData.zoom_api_secret}
                    onChange={(e) => setFormData({ ...formData, zoom_api_secret: e.target.value })}
                    placeholder="Zoom OAuth Client Secret"
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in your Zoom OAuth app settings (Server-to-Server OAuth)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zoom_account_id">Account ID</Label>
                  <Input
                    id="zoom_account_id"
                    type="text"
                    value={formData.zoom_account_id}
                    onChange={(e) => setFormData({ ...formData, zoom_account_id: e.target.value })}
                    placeholder="Zoom Account ID"
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in your Zoom OAuth app settings (Server-to-Server OAuth)
                  </p>
                </div>
                <Button onClick={handleConnectZoom} disabled={loading}>
                  {t("settings.connectZoom")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Integration Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {/* Reuse Video icon or add a WhatsApp-like label */}
              WhatsApp
            </CardTitle>
            <CardDescription>Send reminders from your WhatsApp Business account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp_phone_number_id">Phone Number ID</Label>
              <Input
                id="whatsapp_phone_number_id"
                value={formData.whatsapp_phone_number_id}
                onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
                placeholder="e.g. 123456789012345"
              />
              <p className="text-xs text-muted-foreground">Find it in Meta Business → WhatsApp Manager → Phone numbers</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp_token">Access Token</Label>
              <Input
                id="whatsapp_token"
                type="password"
                value={formData.whatsapp_token}
                onChange={(e) => setFormData({ ...formData, whatsapp_token: e.target.value })}
                placeholder="EAA..."
              />
              <p className="text-xs text-muted-foreground">Generate a permanent token in Meta Business → WhatsApp Manager</p>
            </div>
            <Button onClick={handleUpdateProfile} disabled={loading}>
              {t("common.save")}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Sign Out Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              {t("common.signOut")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t("common.signOut")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Settings;


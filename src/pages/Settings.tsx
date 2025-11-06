import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Globe, Video, MessageCircle, Settings as SettingsIcon } from "lucide-react";

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
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

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
      const isZoomConnected = !!(data.zoom_api_key && data.zoom_api_secret && data.zoom_account_id);
      const isWhatsappConnected = !!(data.whatsapp_phone_number_id && data.whatsapp_token);
      
      setZoomEnabled(isZoomConnected);
      setWhatsappEnabled(isWhatsappConnected);
      
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

  const handleZoomToggle = async (enabled: boolean) => {
    setZoomEnabled(enabled);
    if (!enabled) {
      // Disconnect Zoom
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
        setZoomEnabled(true);
      } else {
        toast({
          title: t("settings.zoomDisconnectedSuccess"),
        });
        setFormData({ ...formData, zoom_api_key: "", zoom_api_secret: "", zoom_account_id: "" });
        loadProfile();
      }
      setLoading(false);
    }
  };

  const handleZoomSave = async () => {
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
      setZoomEnabled(true);
      loadProfile();
    }
    setLoading(false);
  };

  const handleWhatsappToggle = async (enabled: boolean) => {
    setWhatsappEnabled(enabled);
    if (!enabled) {
      // Disconnect WhatsApp
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          whatsapp_phone_number_id: null,
          whatsapp_token: null,
        })
        .eq("id", user.id);

      if (error) {
        toast({
          title: "Error disconnecting WhatsApp",
          description: error.message,
          variant: "destructive",
        });
        setWhatsappEnabled(true);
      } else {
        toast({
          title: "WhatsApp disconnected successfully",
        });
        setFormData({ ...formData, whatsapp_phone_number_id: "", whatsapp_token: "" });
        loadProfile();
      }
      setLoading(false);
    }
  };

  const handleWhatsappSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        whatsapp_phone_number_id: formData.whatsapp_phone_number_id || null,
        whatsapp_token: formData.whatsapp_token || null,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error saving WhatsApp credentials",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "WhatsApp credentials saved successfully",
      });
      if (formData.whatsapp_phone_number_id && formData.whatsapp_token) {
        setWhatsappEnabled(true);
      }
      loadProfile();
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

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

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="language">Language</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
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
          </TabsContent>

          <TabsContent value="language" className="space-y-4 mt-6">
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
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4 mt-6">
            <div className="space-y-4">
              {/* Zoom Integration Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                        <Video className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle>Zoom</CardTitle>
                        <CardDescription>{t("settings.zoomDescription")}</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={zoomEnabled}
                      onCheckedChange={handleZoomToggle}
                      disabled={loading}
                    />
                  </div>
                </CardHeader>
                {zoomEnabled && (
                  <CardContent className="space-y-4 pt-0">
                    <Separator />
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
                    <Button onClick={handleZoomSave} disabled={loading}>
                      Save Zoom Credentials
                    </Button>
                  </CardContent>
                )}
              </Card>

              {/* WhatsApp Integration Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle>WhatsApp</CardTitle>
                        <CardDescription>Send reminders from your WhatsApp Business account</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={whatsappEnabled}
                      onCheckedChange={handleWhatsappToggle}
                      disabled={loading}
                    />
                  </div>
                </CardHeader>
                {whatsappEnabled && (
                  <CardContent className="space-y-4 pt-0">
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp_phone_number_id">Phone Number ID</Label>
                      <Input
                        id="whatsapp_phone_number_id"
                        value={formData.whatsapp_phone_number_id}
                        onChange={(e) => setFormData({ ...formData, whatsapp_phone_number_id: e.target.value })}
                        placeholder="e.g. 123456789012345"
                      />
                      <p className="text-xs text-muted-foreground">
                        Find it in Meta Business → WhatsApp Manager → Phone numbers
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        Generate a permanent token in Meta Business → WhatsApp Manager
                      </p>
                    </div>
                    <Button onClick={handleWhatsappSave} disabled={loading}>
                      Save WhatsApp Credentials
                    </Button>
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Sign Out */}
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
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;

import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Bug, Lightbulb, Send } from "lucide-react";

const RequestHelp = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "issue", // "issue" or "feature"
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || "Unknown";
      const userName = user?.user_metadata?.full_name || user?.email || "User";

      // Send email via edge function
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          to: "elfar.uiux@gmail.com",
          subject: formData.type === "issue" 
            ? `[Issue Report] ${formData.subject}`
            : `[Feature Suggestion] ${formData.subject}`,
          html: `
            <h2>${formData.type === "issue" ? "Issue Report" : "Feature Suggestion"}</h2>
            <p><strong>From:</strong> ${userName} (${userEmail})</p>
            <p><strong>Subject:</strong> ${formData.subject}</p>
            <hr>
            <p><strong>Message:</strong></p>
            <p>${formData.message.replace(/\n/g, "<br>")}</p>
          `,
          text: `
${formData.type === "issue" ? "Issue Report" : "Feature Suggestion"}

From: ${userName} (${userEmail})
Subject: ${formData.subject}

Message:
${formData.message}
          `,
        },
      });

      if (error) {
        console.error("Function invoke error:", error);
        throw new Error(error.message || "Failed to send message. Please try again later.");
      }

      // Check if the response indicates success
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Message sent!",
        description: "Thank you for your feedback. We'll get back to you soon.",
      });

      // Reset form
      setFormData({
        type: formData.type,
        subject: "",
        message: "",
      });
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Request Help
          </h1>
          <p className="text-muted-foreground mt-2">We're here to help! Send us your questions or feedback.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
            <CardDescription>Choose how you'd like to reach out</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={formData.type} 
              onValueChange={(value) => setFormData({ type: value as "issue" | "feature", subject: "", message: "" })}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="issue">
                  <Bug className="mr-2 h-4 w-4" />
                  Report an Issue
                </TabsTrigger>
                <TabsTrigger value="feature">
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Suggest a Feature
                </TabsTrigger>
              </TabsList>

              <TabsContent value="issue" className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="issue-subject">Subject</Label>
                    <Input
                      id="issue-subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Brief description of the issue"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issue-message">Message</Label>
                    <Textarea
                      id="issue-message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please describe the issue in detail, including steps to reproduce if possible..."
                      rows={8}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    {loading ? "Sending..." : "Send Issue Report"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="feature" className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feature-subject">Feature Title</Label>
                    <Input
                      id="feature-subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Name of the feature you'd like to suggest"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feature-message">Description</Label>
                    <Textarea
                      id="feature-message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Describe the feature in detail. How would it work? Why would it be useful?"
                      rows={8}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    {loading ? "Sending..." : "Send Feature Suggestion"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default RequestHelp;


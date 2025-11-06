import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

const Privacy = () => {
  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Privacy Policy
          </h1>
          <p className="text-muted-foreground mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Name and contact information</li>
              <li>Email address</li>
              <li>Student information and session data</li>
              <li>Payment and billing information</li>
              <li>Integration credentials (Zoom, WhatsApp) stored securely</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. How We Use Your Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Send reminders via WhatsApp (if configured)</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Information Sharing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We do not sell, trade, or rent your personal information to third parties. We may share your information only:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and safety</li>
              <li>With service providers who assist in operating our platform</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Data Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Data Retention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes described in this policy, unless a longer retention period is required by law.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Export your data</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Our service integrates with third-party services (Zoom, WhatsApp, Supabase). These services have their own privacy policies, and we encourage you to review them.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>8. Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>9. Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:support@tutorsessions.com" className="text-primary hover:underline">
                support@tutorsessions.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Privacy;


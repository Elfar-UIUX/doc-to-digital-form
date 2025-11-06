import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const Terms = () => {
  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Terms and Conditions
          </h1>
          <p className="text-muted-foreground mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>1. Acceptance of Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              By accessing and using TutorSessions, you accept and agree to be bound by the terms and provision of this agreement.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Use License</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Permission is granted to temporarily use TutorSessions for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to reverse engineer any software contained in TutorSessions</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. User Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4. Data and Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your use of TutorSessions is also governed by our Privacy Policy. Please review our Privacy Policy to understand our practices regarding the collection and use of your personal information.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>5. Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              In no event shall TutorSessions or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on TutorSessions.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>6. Revisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              TutorSessions may revise these terms of service at any time without notice. By using this service you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              If you have any questions about these Terms and Conditions, please contact us at{" "}
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

export default Terms;


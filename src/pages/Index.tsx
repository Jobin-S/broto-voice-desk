import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { FileText, Shield, ArrowRight } from "lucide-react";

const Index = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/student");
      }
    }
  }, [user, profile, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-primary/10 px-4">
      <div className="text-center space-y-8 max-w-3xl">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            BrotoRaise
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Student complaint management system for Brototype
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 text-left max-w-2xl mx-auto">
          <div className="rounded-lg border bg-card p-6 space-y-2 shadow-sm">
            <FileText className="h-8 w-8 text-primary" />
            <h3 className="font-semibold text-lg">For Students</h3>
            <p className="text-sm text-muted-foreground">
              Submit and track complaints with transparent status updates
            </p>
          </div>
          <div className="rounded-lg border bg-card p-6 space-y-2 shadow-sm">
            <Shield className="h-8 w-8 text-primary" />
            <h3 className="font-semibold text-lg">For Admins</h3>
            <p className="text-sm text-muted-foreground">
              Manage complaints efficiently with powerful filters and tracking
            </p>
          </div>
        </div>

        <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default Index;

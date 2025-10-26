import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Complaint } from "@/lib/types";
import { Plus, LogOut, FileText, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function StudentDashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (profile?.role === "admin") {
        navigate("/admin");
      }
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
  }, [user]);

  const fetchComplaints = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComplaints(data);
    }
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    mentor: "Mentor",
    admin: "Admin",
    academic_counsellor: "Academic Counsellor",
    working_hub: "Working Hub",
    peer: "Peer",
    other: "Other",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">BrotoRaise</h1>
            <p className="text-sm text-muted-foreground">Welcome, {profile?.full_name}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/student/new-complaint")}>
              <Plus className="mr-2 h-4 w-4" />
              New Complaint
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight">My Complaints</h2>
          <p className="text-muted-foreground">View and track all your submitted complaints</p>
        </div>

        {complaints.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No complaints yet</h3>
                <p className="text-sm text-muted-foreground">
                  Submit your first complaint to get started
                </p>
              </div>
              <Button onClick={() => navigate("/student/new-complaint")}>
                <Plus className="mr-2 h-4 w-4" />
                Submit Complaint
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {complaints.map((complaint) => (
              <Card
                key={complaint.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(`/student/complaint/${complaint.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl">{complaint.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                        </span>
                        <span className="capitalize">
                          {categoryLabels[complaint.category]}
                        </span>
                      </CardDescription>
                    </div>
                    <StatusBadge status={complaint.status} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {complaint.description}
                  </p>
                  {complaint.admin_note && (
                    <div className="mt-4 rounded-lg bg-secondary/50 p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Admin Response:
                      </p>
                      <p className="text-sm">{complaint.admin_note}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
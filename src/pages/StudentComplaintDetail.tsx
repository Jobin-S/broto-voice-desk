import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Complaint, ComplaintStatusHistory } from "@/lib/types";
import { ArrowLeft, Download, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Separator } from "@/components/ui/separator";

export default function StudentComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<ComplaintStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchComplaint();
      fetchHistory();
    }
  }, [id]);

  const fetchComplaint = async () => {
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setComplaint(data);
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("complaint_status_history")
      .select("*")
      .eq("complaint_id", id)
      .order("changed_at", { ascending: true });

    if (!error && data) {
      setHistory(data);
    }
  };

  const downloadAttachment = async () => {
    if (!complaint?.attachment_id) return;

    try {
      const { data: attachmentData } = await supabase
        .from("attachments")
        .select("*")
        .eq("id", complaint.attachment_id)
        .single();

      if (attachmentData) {
        const { data } = await supabase.storage
          .from("complaint-attachments")
          .download(attachmentData.stored_path);

        if (data) {
          const url = URL.createObjectURL(data);
          const a = document.createElement("a");
          a.href = url;
          a.download = attachmentData.original_filename;
          a.click();
        }
      }
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Complaint not found</p>
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
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/student")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-2xl">{complaint.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span>{categoryLabels[complaint.category]}</span>
                    <span>•</span>
                    <span>Submitted {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}</span>
                  </CardDescription>
                </div>
                <StatusBadge status={complaint.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {complaint.description}
                </p>
              </div>

              {complaint.attachment_id && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Attachment</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadAttachment}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Attachment
                  </Button>
                </div>
              )}

              {complaint.admin_note && (
                <div className="rounded-lg border bg-secondary/30 p-4">
                  <h3 className="text-sm font-semibold mb-2">Admin Response</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {complaint.admin_note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Status History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.map((entry, index) => (
                    <div key={entry.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        {index < history.length - 1 && (
                          <div className="h-full w-px bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={entry.to_status} />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(entry.changed_at), "PPp")}
                          </span>
                        </div>
                        {entry.note_snapshot && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {entry.note_snapshot}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
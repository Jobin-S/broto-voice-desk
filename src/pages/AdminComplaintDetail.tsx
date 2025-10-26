import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Complaint, ComplaintStatusHistory, ComplaintStatus } from "@/lib/types";
import { ArrowLeft, Download, Clock, Save } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function AdminComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [history, setHistory] = useState<ComplaintStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<ComplaintStatus>("open");
  const [adminNote, setAdminNote] = useState("");

  useEffect(() => {
    if (id) {
      fetchComplaint();
      fetchHistory();
    }
  }, [id]);

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status);
      setAdminNote(complaint.admin_note || "");
    }
  }, [complaint]);

  const fetchComplaint = async () => {
    const { data, error } = await supabase
      .from("complaints")
      .select(`
        *,
        student:student_id (
          id,
          full_name,
          email
        )
      `)
      .eq("id", id)
      .single();

    if (!error && data) {
      setComplaint(data as Complaint);
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

  const handleSave = async () => {
    if (status === "resolved" && !adminNote.trim()) {
      toast({
        variant: "destructive",
        title: "Note required",
        description: "Please provide an admin note when resolving a complaint.",
      });
      return;
    }

    // Validate status transition
    if (complaint?.status === "resolved") {
      toast({
        variant: "destructive",
        title: "Cannot update",
        description: "Resolved complaints cannot be modified.",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("complaints")
        .update({
          status,
          admin_note: adminNote.trim() || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Updated successfully",
        description: "Complaint has been updated.",
      });

      // Refresh data
      fetchComplaint();
      fetchHistory();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message || "Failed to update complaint.",
      });
    } finally {
      setSaving(false);
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

  const hasChanges = status !== complaint.status || adminNote !== (complaint.admin_note || "");
  const isResolved = complaint.status === "resolved";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
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
                  <h3 className="text-sm font-semibold mb-2">Student Information</h3>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{complaint.student?.full_name}</p>
                    <p>{complaint.student?.email}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {complaint.description}
                  </p>
                </div>

                {complaint.attachment_id && (
                  <>
                    <Separator />
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
                  </>
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

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Update Status</CardTitle>
                <CardDescription>
                  Change complaint status and add resolution notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(value) => setStatus(value as ComplaintStatus)}
                    disabled={isResolved || saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  {isResolved && (
                    <p className="text-xs text-muted-foreground">
                      Resolved complaints cannot be modified
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-note">
                    Admin Note {status === "resolved" && <span className="text-destructive">*</span>}
                  </Label>
                  <Textarea
                    id="admin-note"
                    placeholder="Add resolution notes or updates..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    disabled={isResolved || saving}
                    rows={6}
                    maxLength={5000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {adminNote.length}/5000 characters
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={!hasChanges || isResolved || saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
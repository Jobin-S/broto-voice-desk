import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Complaint, Profile } from "@/lib/types";
import { LogOut, Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminDashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
      } else if (profile?.role !== "admin") {
        navigate("/student");
      }
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (user && profile?.role === "admin") {
      fetchComplaints();
    }
  }, [user, profile]);

  useEffect(() => {
    filterComplaints();
  }, [complaints, searchTerm, statusFilter, categoryFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
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
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComplaints(data as Complaint[]);
    }
    setLoading(false);
  };

  const filterComplaints = () => {
    let filtered = [...complaints];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.description.toLowerCase().includes(term) ||
          c.student?.email?.toLowerCase().includes(term) ||
          c.student?.full_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((c) => c.category === categoryFilter);
    }

    setFilteredComplaints(filtered);
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
            <h1 className="text-2xl font-bold text-foreground">BrotoRaise Admin</h1>
            <p className="text-sm text-muted-foreground">Complaint Management Dashboard</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold tracking-tight">All Complaints</h2>
          <p className="text-muted-foreground">Manage and resolve student complaints</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search complaints..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="academic_counsellor">Academic Counsellor</SelectItem>
                  <SelectItem value="working_hub">Working Hub</SelectItem>
                  <SelectItem value="peer">Peer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComplaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No complaints found
                  </TableCell>
                </TableRow>
              ) : (
                filteredComplaints.map((complaint) => (
                  <TableRow
                    key={complaint.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/complaint/${complaint.id}`)}
                  >
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {complaint.title}
                    </TableCell>
                    <TableCell className="text-sm">
                      {categoryLabels[complaint.category]}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div className="font-medium">{complaint.student?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{complaint.student?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={complaint.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(complaint.updated_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
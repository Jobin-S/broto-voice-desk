import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, AlertCircle } from "lucide-react";
import { z } from "zod";

const titleSchema = z.string().trim().min(1).max(120);
const descriptionSchema = z.string().trim().min(1).max(5000);

export default function NewComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (name: string, value: string, schema: z.ZodString) => {
    try {
      schema.parse(value);
      setErrors(prev => ({ ...prev, [name]: "" }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [name]: error.errors[0].message }));
      }
      return false;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!validTypes.includes(selectedFile.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload a PDF, JPG, or PNG file.",
        });
        e.target.value = "";
        return;
      }

      if (selectedFile.size > maxSize) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "File size must be less than 10MB.",
        });
        e.target.value = "";
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const titleValid = validateField("title", title, titleSchema);
    const descriptionValid = validateField("description", description, descriptionSchema);

    if (!titleValid || !descriptionValid || !category) {
      if (!category) {
        toast({
          variant: "destructive",
          title: "Category required",
          description: "Please select a category for your complaint.",
        });
      }
      return;
    }

    setLoading(true);

    try {
      let attachmentId = null;

      // Upload file if present
      if (file && user) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("complaint-attachments")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Create attachment record
        const { data: attachmentData, error: attachmentError } = await supabase
          .from("attachments")
          .insert({
            owner_user_id: user.id,
            original_filename: file.name,
            stored_path: fileName,
            mime_type: file.type,
            byte_size: file.size,
          })
          .select()
          .single();

        if (attachmentError) throw attachmentError;
        attachmentId = attachmentData.id;
      }

      // Create complaint
      const { error: complaintError } = await supabase.from("complaints").insert([{
        student_id: user!.id,
        title: title.trim(),
        category: category as any,
        description: description.trim(),
        attachment_id: attachmentId,
      }]);

      if (complaintError) throw complaintError;

      toast({
        title: "Complaint submitted!",
        description: "Your complaint has been submitted successfully.",
      });

      navigate("/student");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message || "Failed to submit complaint. Please try again.",
      });
    } finally {
      setLoading(false);
    }
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

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Submit New Complaint</CardTitle>
            <CardDescription>
              Fill out the form below to submit your complaint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Brief summary of your complaint"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => validateField("title", title, titleSchema)}
                  disabled={loading}
                  maxLength={120}
                  required
                />
                {errors.title && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.title}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {title.length}/120 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="academic_counsellor">Academic Counsellor</SelectItem>
                    <SelectItem value="working_hub">Working Hub</SelectItem>
                    <SelectItem value="peer">Peer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about your complaint"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => validateField("description", description, descriptionSchema)}
                  disabled={loading}
                  maxLength={5000}
                  rows={6}
                  required
                />
                {errors.description && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {description.length}/5000 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachment">Attachment (Optional)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="attachment"
                    type="file"
                    onChange={handleFileChange}
                    disabled={loading}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="cursor-pointer"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PDF, JPG, PNG (Max 10MB)
                </p>
                {file && (
                  <p className="text-sm text-primary">
                    <Upload className="inline h-4 w-4 mr-1" />
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Submitting..." : "Submit Complaint"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/student")}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
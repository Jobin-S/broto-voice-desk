-- Create enums
CREATE TYPE public.app_role AS ENUM ('student', 'admin');
CREATE TYPE public.complaint_category AS ENUM ('mentor', 'admin', 'academic_counsellor', 'working_hub', 'peer', 'other');
CREATE TYPE public.complaint_status AS ENUM ('open', 'in_progress', 'resolved');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  full_name TEXT NOT NULL CHECK (char_length(full_name) <= 100),
  email TEXT NOT NULL UNIQUE CHECK (char_length(email) <= 254),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 120),
  category public.complaint_category NOT NULL,
  description TEXT NOT NULL CHECK (char_length(description) > 0 AND char_length(description) <= 5000),
  attachment_id UUID,
  status public.complaint_status NOT NULL DEFAULT 'open',
  admin_note TEXT CHECK (admin_note IS NULL OR char_length(admin_note) <= 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL CHECK (char_length(original_filename) <= 255),
  stored_path TEXT NOT NULL CHECK (char_length(stored_path) <= 1024),
  mime_type TEXT NOT NULL CHECK (char_length(mime_type) <= 100),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key from complaints to attachments
ALTER TABLE public.complaints
ADD CONSTRAINT fk_complaints_attachment
FOREIGN KEY (attachment_id) REFERENCES public.attachments(id) ON DELETE SET NULL;

-- Create complaint status history table
CREATE TABLE public.complaint_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  changed_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_status public.complaint_status,
  to_status public.complaint_status NOT NULL,
  note_snapshot TEXT CHECK (note_snapshot IS NULL OR char_length(note_snapshot) <= 5000),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_active ON public.profiles(is_active);

CREATE INDEX idx_complaints_student_id_created_at ON public.complaints(student_id, created_at DESC);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_category ON public.complaints(category);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at DESC);

CREATE INDEX idx_attachments_owner_user_id ON public.attachments(owner_user_id);
CREATE INDEX idx_attachments_complaint_id ON public.attachments(complaint_id);

CREATE INDEX idx_history_complaint_id_changed_at ON public.complaint_status_history(complaint_id, changed_at DESC);
CREATE INDEX idx_history_changed_by_user_id ON public.complaint_status_history(changed_by_user_id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::public.app_role, 'student')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updating updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log status changes
CREATE OR REPLACE FUNCTION public.log_complaint_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.complaint_status_history (
      complaint_id,
      changed_by_user_id,
      from_status,
      to_status,
      note_snapshot
    ) VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.student_id),
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      NEW.admin_note
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to log status changes
CREATE TRIGGER log_complaint_status
  AFTER INSERT OR UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.log_complaint_status_change();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for complaints
CREATE POLICY "Students can view their own complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all complaints"
  ON public.complaints FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Students can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admins can update complaints"
  ON public.complaints FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for attachments
CREATE POLICY "Users can view attachments of their complaints"
  ON public.attachments FOR SELECT
  USING (
    auth.uid() = owner_user_id OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Users can insert attachments for their complaints"
  ON public.attachments FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

-- RLS Policies for complaint_status_history
CREATE POLICY "Users can view history of their complaints"
  ON public.complaint_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE complaints.id = complaint_status_history.complaint_id
      AND complaints.student_id = auth.uid()
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "System can insert history records"
  ON public.complaint_status_history FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for complaint attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'complaint-attachments',
  'complaint-attachments',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
);

-- Storage policies for attachments
CREATE POLICY "Users can upload their own attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'complaint-attachments' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
  );

CREATE POLICY "Admins can view all attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'complaint-attachments' AND
    public.is_admin(auth.uid())
  );
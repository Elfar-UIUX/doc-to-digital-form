-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  country TEXT,
  email TEXT,
  phone_e164 TEXT,
  price_per_hour DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sessions table
CREATE TYPE session_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED', 'NO_SHOW');

CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'SCHEDULED',
  scheduled_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start_at TIMESTAMP WITH TIME ZONE,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  zoom_meeting_id TEXT,
  zoom_join_url TEXT,
  zoom_start_url TEXT,
  whatsapp_invite_message_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ledger entries table
CREATE TYPE ledger_entry_type AS ENUM ('SESSION_CHARGE', 'PAYMENT_CONFIRMATION', 'ADJUSTMENT');

CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  type ledger_entry_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create reminder jobs table
CREATE TYPE reminder_status AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE public.reminder_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status reminder_status NOT NULL DEFAULT 'PENDING',
  channel TEXT NOT NULL DEFAULT 'WHATSAPP',
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for teacher
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for students
CREATE POLICY "Teachers can view all students"
  ON public.students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can create students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Teachers can update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for sessions
CREATE POLICY "Teachers can view all sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can create sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Teachers can update sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can delete sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for ledger_entries
CREATE POLICY "Teachers can view all ledger entries"
  ON public.ledger_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can create ledger entries"
  ON public.ledger_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for reminder_jobs
CREATE POLICY "Teachers can view all reminder jobs"
  ON public.reminder_jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can create reminder jobs"
  ON public.reminder_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Teachers can update reminder jobs"
  ON public.reminder_jobs FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create function to calculate student balance
CREATE OR REPLACE FUNCTION public.get_student_balance(student_uuid UUID)
RETURNS DECIMAL(10,2)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.ledger_entries
  WHERE student_id = student_uuid;
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminder_jobs_updated_at
  BEFORE UPDATE ON public.reminder_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
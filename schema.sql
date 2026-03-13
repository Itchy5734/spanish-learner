-- ═══════════════════════════════════════════════════════════
--  SPANISH LEARNER — SUPABASE DATABASE SCHEMA
--  Run this entire file in:
--  Supabase Dashboard → SQL Editor → New Query → Paste → Run
-- ═══════════════════════════════════════════════════════════


-- ── 1. PROFILES ──────────────────────────────────────────
-- Stores extra user info alongside Supabase's built-in auth.
-- A row is created automatically when someone signs up.
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'student',  -- 'student' or 'tutor'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ── 2. QUESTIONS ─────────────────────────────────────────
-- All game content lives here. The tutor adds/edits via the app.
-- 'type' allows multiple game modes in future.
CREATE TABLE IF NOT EXISTS questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL DEFAULT 'sentence_builder',
  english      TEXT NOT NULL,
  spanish      TEXT NOT NULL,
  distractors  TEXT[] DEFAULT '{}',   -- array of distractor words
  difficulty   INT DEFAULT 1,         -- 1=easy 2=medium 3=hard
  topic        TEXT DEFAULT 'general',
  active       BOOLEAN DEFAULT TRUE,  -- tutor can disable questions
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);


-- ── 3. PROGRESS ──────────────────────────────────────────
-- Records every question attempt by every student.
CREATE TABLE IF NOT EXISTS progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id  UUID REFERENCES questions(id) ON DELETE CASCADE,
  correct      BOOLEAN NOT NULL,
  hints_used   INT DEFAULT 0,
  attempts     INT DEFAULT 1,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── 4. SESSIONS ──────────────────────────────────────────
-- Tracks full play sessions so students can pick up where they left off.
CREATE TABLE IF NOT EXISTS sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score        INT DEFAULT 0,
  total        INT DEFAULT 0,
  hints_used   INT DEFAULT 0,
  completed    BOOLEAN DEFAULT FALSE,
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);


-- ── 5. ASSIGNMENTS ───────────────────────────────────────
-- Tutor can assign specific topics/difficulties to specific students.
CREATE TABLE IF NOT EXISTS assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  topic       TEXT NOT NULL,
  difficulty  INT DEFAULT 1,
  due_date    DATE,
  note        TEXT,
  completed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ── ROW LEVEL SECURITY (RLS) ─────────────────────────────
-- This ensures users can only see their OWN data.
-- Tutors get broader access handled in the app logic.

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
-- Tutors can view all profiles
CREATE POLICY "Tutors can view all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  );

-- Questions: everyone logged in can read active questions
CREATE POLICY "Authenticated users can read questions"
  ON questions FOR SELECT USING (auth.role() = 'authenticated' AND active = TRUE);
-- Only tutors can insert/update/delete questions
CREATE POLICY "Tutors can manage questions"
  ON questions FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  );

-- Progress: students see own, tutors see all
CREATE POLICY "Users can view own progress"
  ON progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress"
  ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Tutors can view all progress"
  ON progress FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  );

-- Sessions: students see own, tutors see all
CREATE POLICY "Users can manage own sessions"
  ON sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Tutors can view all sessions"
  ON sessions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  );

-- Assignments: students see their own, tutors manage all
CREATE POLICY "Students can view own assignments"
  ON assignments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Tutors can manage assignments"
  ON assignments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  );


-- ── SEED DATA — starter questions ────────────────────────
-- These load on first run. Tutor can edit/delete via the app.
INSERT INTO questions (type, english, spanish, distractors, difficulty, topic) VALUES
('sentence_builder', 'Where is the library?',        '¿Dónde está la biblioteca?',          ARRAY['el','casa','banco','aquí','mercado'],         1, 'places'),
('sentence_builder', 'I want a coffee please.',       'Quiero un café por favor.',            ARRAY['ella','tengo','leche','grande','agua'],        1, 'food'),
('sentence_builder', 'How much does it cost?',        '¿Cuánto cuesta esto?',                 ARRAY['bien','hoy','libre','noche','dinero'],         1, 'shopping'),
('sentence_builder', 'The cat is on the table.',      'El gato está sobre la mesa.',          ARRAY['perro','casa','debajo','grande','rojo'],       1, 'animals'),
('sentence_builder', 'I do not understand.',          'No entiendo.',                         ARRAY['ella','habla','bien','mucho','siempre'],       1, 'general'),
('sentence_builder', 'What is your name?',            '¿Cómo te llamas?',                     ARRAY['donde','quiero','está','gracias','favor'],     1, 'introductions'),
('sentence_builder', 'The restaurant is near here.',  'El restaurante está cerca de aquí.',   ARRAY['banco','lejos','rojo','bonito','abierto'],     1, 'places'),
('sentence_builder', 'I would like to book a table.', 'Me gustaría reservar una mesa.',       ARRAY['quiero','tengo','grande','bonita','libre'],    2, 'food'),
('sentence_builder', 'Can you speak more slowly?',    '¿Puede hablar más despacio?',          ARRAY['rápido','bien','entiendo','favor','mucho'],    2, 'general'),
('sentence_builder', 'Where is the nearest hospital?','¿Dónde está el hospital más cercano?', ARRAY['lejos','banco','aquí','hay','farmacia'],       2, 'places')
ON CONFLICT DO NOTHING;

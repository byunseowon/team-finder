-- Team Finder DB Schema for Supabase
-- Run this in Supabase SQL Editor

-- App settings (singleton)
CREATE TABLE app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  min_team_size INT DEFAULT 3,
  max_team_size INT DEFAULT 5,
  is_locked BOOLEAN DEFAULT FALSE,
  common_password TEXT DEFAULT 'unreal7!',
  admin_id TEXT DEFAULT 'Unreal',
  admin_password TEXT DEFAULT 'Uuunreal1127'
);

INSERT INTO app_settings (min_team_size, max_team_size, common_password, admin_id, admin_password)
VALUES (3, 5, 'unreal7!', 'Unreal', 'Uuunreal1127');

-- Students (registered name list)
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  part TEXT,
  genres TEXT[] DEFAULT '{}',
  intro TEXT,
  game_concept TEXT,
  collab_style TEXT,
  team_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for students.team_id
ALTER TABLE students ADD CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- Posts (recruitment board)
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  author_id UUID REFERENCES students(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interests (on students or posts)
CREATE TABLE interests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  to_student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  to_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_student_id, to_student_id),
  UNIQUE(from_student_id, to_post_id)
);

-- Enable Row Level Security (allow all for now via anon key)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON interests FOR ALL USING (true) WITH CHECK (true);

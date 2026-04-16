export interface Student {
  id: string;
  name: string;
  part: string | null;
  genres: string[];
  intro: string | null;
  game_concept: string | null;
  collab_style: string | null;
  favorite_games: string | null;
  team_id: string | null;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  leader_id: string;
  status: "building" | "pending" | "approved";
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name?: string;
  status: "open" | "closing" | "closed";
  interest_count: number;
  created_at: string;
}

export interface Interest {
  id: string;
  from_student_id: string;
  to_student_id: string | null;
  to_post_id: string | null;
  created_at: string;
}

export interface AppSettings {
  id: string;
  min_team_size: number;
  max_team_size: number;
  is_locked: boolean;
  team_building_open: boolean;
  common_password: string;
  admin_id: string;
  admin_password: string;
}

import { createClient } from "@supabase/supabase-js";
import { DogReport } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes("placeholder")
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Initial starter mock alerts for instant demo preview when Supabase is not yet linked
export const DEMO_REPORTS: DogReport[] = [
  {
    id: "demo-1",
    reporter_id: "user-1",
    reporter_name: "Arjun (Volunteer)",
    problem_type: "INJURED",
    description: "Young brown stray dog with an injured left front paw, limping near the market corner. Friendly and responsive to biscuits.",
    photo_url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800",
    latitude: 20.17592,
    longitude: 72.75499,
    address: "Devdham, Umargam",
    landmark: "Behind blue gate, opposite grocery stall",
    status: "OPEN",
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "demo-2",
    reporter_id: "user-2",
    reporter_name: "Sneha",
    problem_type: "NEWBORN_LITTER",
    description: "Mother dog with 4 newborn pups under a parked tempo. Needs dry shelter and high-nutrition puppy food.",
    photo_url: "https://images.unsplash.com/photo-1591768575198-88dac53fbd0a?auto=format&fit=crop&q=80&w=800",
    latitude: 20.1812,
    longitude: 72.7615,
    address: "Station Road, Umargam",
    landmark: "Near auto rickshaw stand",
    status: "IN_PROGRESS",
    helper_id: "user-3",
    helper_name: "Rahul",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "demo-3",
    reporter_id: "user-4",
    reporter_name: "Community Feeder",
    problem_type: "HUNGRY",
    description: "Two skinny dogs looking for food near temple gate. Very gentle.",
    photo_url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=800",
    latitude: 20.1724,
    longitude: 72.7488,
    address: "Temple Circle, Umargam",
    landmark: "Under the large banyan tree",
    status: "RESOLVED",
    helper_id: "user-1",
    helper_name: "Arjun (Volunteer)",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
];

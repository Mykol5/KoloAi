"use server";

import { createServerSupabase } from "./supabase/server";

export async function getDashboardData() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's groups
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(*)")
    .eq("user_id", user.id);

  // Get total contributions
  const { data: contributions } = await supabase
    .from("contributions")
    .select("amount, status, created_at")
    .eq("user_id", user.id);

  // Get recent transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const totalSavings = contributions
    ?.filter((c) => c.status === "completed")
    .reduce((sum, c) => sum + c.amount, 0) || 0;

  const groups = memberships?.map((m) => m.groups) || [];

  return {
    user,
    groups,
    totalSavings,
    transactions: transactions || [],
    groupCount: groups.length,
    monthlyContributions: contributions
      ?.filter((c) => {
        const d = new Date(c.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth();
      })
      .reduce((sum, c) => sum + c.amount, 0) || 0,
  };
}

export async function getGroupDetails(groupId: string) {
  const supabase = await createServerSupabase();

  const { data: group } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, role, joined_at, profiles(full_name, avatar_url)")
    .eq("group_id", groupId);

  const { data: contributions } = await supabase
    .from("contributions")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  return { group, members, contributions };
}

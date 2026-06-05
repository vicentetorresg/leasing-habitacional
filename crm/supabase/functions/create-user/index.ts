import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { email, password, full_name, role, phone_e164, action } = await req.json();

  // Assign role to existing user
  if (action === "assign_role") {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find((u: any) => u.email === email);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role });
    if (phone_e164) {
      await supabaseAdmin.from("profiles").update({ phone_e164 }).eq("user_id", user.id);
    }
    return new Response(JSON.stringify({ success: true, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update password for existing user
  if (action === "update_password") {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find((u: any) => u.email === email);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Assign role (and optionally phone) to an existing user
  if (action === "assign_role") {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find((u: any) => u.email === email);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (role) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
    }
    if (phone_e164) {
      await supabaseAdmin.from("profiles").upsert({ user_id: user.id, phone_e164 }, { onConflict: "user_id" });
    }
    return new Response(JSON.stringify({ success: true, user_id: user.id, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Delete user
  if (action === "delete_user") {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users?.find((u: any) => u.email === email);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Unassign leads assigned to this user
    await supabaseAdmin.from("leads").update({ assigned_to: null }).eq("assigned_to", user.id);
    // Delete call_attempts by this user (NOT NULL constraint, can't set null)
    await supabaseAdmin.from("call_attempts").delete().eq("user_id", user.id);
    // Delete the auth user (cascades to profiles and user_roles)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, deleted: email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userData.user.id;

  // Create profile
  const profileData: Record<string, unknown> = { user_id: userId, full_name: full_name || "" };
  if (phone_e164) profileData.phone_e164 = phone_e164;
  await supabaseAdmin.from("profiles").upsert(profileData);

  // Assign role
  if (role) {
    await supabaseAdmin.from("user_roles").upsert({
      user_id: userId,
      role,
    });
  }

  return new Response(JSON.stringify({ user_id: userId, email }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action, password } = await req.json();

    if (action === "check") {
      const { data: settings } = await supabase
        .from("user_settings")
        .select("hidden_folder_password")
        .eq("user_id", user.id)
        .maybeSingle();

      return new Response(
        JSON.stringify({ hasPassword: !!settings?.hidden_folder_password }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "set") {
      if (!password || password.length < 4) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 4 characters" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const hashedPassword = await hashPassword(password);

      const { error: upsertError } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          hidden_folder_password: hashedPassword,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (upsertError) {
        return new Response(
          JSON.stringify({ error: "Failed to set password", details: upsertError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ message: "Password set successfully" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "verify") {
      if (!password) {
        return new Response(
          JSON.stringify({ error: "Password is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { data: settings } = await supabase
        .from("user_settings")
        .select("hidden_folder_password")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!settings?.hidden_folder_password) {
        return new Response(
          JSON.stringify({ error: "No password set" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const hashedPassword = await hashPassword(password);
      const isValid = hashedPassword === settings.hidden_folder_password;

      return new Response(
        JSON.stringify({ valid: isValid }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (action === "reset") {
      if (!password || password.length < 4) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 4 characters" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const hashedPassword = await hashPassword(password);

      const { error: updateError } = await supabase
        .from("user_settings")
        .update({
          hidden_folder_password: hashedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to reset password", details: updateError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ message: "Password reset successfully" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
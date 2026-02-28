import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, messages } = await req.json();
    if (!user_id || !messages) throw new Error("user_id and messages required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch student's cognitive profile for personalization
    const [cogRes, fpRes, mcRes, energyRes] = await Promise.all([
      supabase.from("cognitive_profiles").select("cognitive_type, confidence_score, reasoning").eq("user_id", user_id).maybeSingle(),
      supabase.from("behavioral_fingerprints").select("cognitive_predictability_index, cpi_label, signature_summary").eq("user_id", user_id).maybeSingle(),
      supabase.from("misconception_patterns").select("misconception_type, frequency").eq("user_id", user_id).order("frequency", { ascending: false }).limit(5),
      supabase.from("energy_profiles").select("best_performance_hour, accuracy_decay_rate, session_duration_recommendation_minutes").eq("user_id", user_id).maybeSingle(),
    ]);

    const cogProfile = cogRes.data;
    const fingerprint = fpRes.data;
    const misconceptions = mcRes.data || [];
    const energy = energyRes.data;

    // Build cognitive-aware system prompt
    const systemPrompt = `You are a Cognitive-Aware Socratic AI Teacher. Your role is to teach based on the student's cognitive behavior profile.

Student Cognitive Profile:
- Cognitive Type: ${cogProfile?.cognitive_type || "Unclassified"}
- Confidence Score: ${cogProfile?.confidence_score?.toFixed(2) || "N/A"}
- Predictability Index (CPI): ${fingerprint?.cognitive_predictability_index?.toFixed(0) || "N/A"} (${fingerprint?.cpi_label || "Unknown"})
- Behavioral Signature: ${fingerprint?.signature_summary || "No data yet"}
- Common Misconceptions: ${misconceptions.map(m => m.misconception_type).join(", ") || "None detected"}
- Best Performance Hour: ${energy?.best_performance_hour != null ? `${energy.best_performance_hour}:00` : "Unknown"}
- Recommended Session Duration: ${energy?.session_duration_recommendation_minutes || "N/A"} minutes

Teaching Rules:
1. If the student is a "Fast but Careless Learner": Break solutions into small steps. Ask them to verify each step before proceeding. Encourage slow, careful thinking.
2. If the student is a "Trial-and-Error Learner": Identify their mistake pattern. Provide simplified explanations with analogies. Give guided practice.
3. If the student is an "Inconsistent Performer": Keep explanations short and structured. Use bullet points. Avoid long paragraphs.
4. If the student is "Fast & Accurate" or "Slow but Accurate": Use Socratic questioning. Ask guiding questions instead of giving direct answers. Challenge them with deeper concepts.
5. If the student is a "Struggling Retention Learner": Use repetition and mnemonics. Connect new concepts to previously understood ones.
6. If the student has "High Cognitive Load": Simplify. Use one concept at a time. Provide visual analogies.
7. If the student has "Concept Gaps": Identify the foundational gap and address it first before the advanced topic.

General Rules:
- Never immediately give the final answer unless the student explicitly asks after struggling.
- Always encourage thinking and reflection.
- Adjust difficulty based on the student's cognitive type.
- Keep responses concise but helpful.
- Use encouraging, supportive language.
- When the student makes an error, don't just correct—explain WHY the error happened based on their known misconception patterns.
- Your tone should feel like a supportive, intelligent teacher — not a chatbot.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("socratic-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

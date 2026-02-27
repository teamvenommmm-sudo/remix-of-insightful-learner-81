import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) throw new Error("user_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch behavioral data
    const [attemptsRes, sessionsRes] = await Promise.all([
      supabase.from("question_attempts").select("*").eq("user_id", user_id).order("attempted_at", { ascending: false }).limit(200),
      supabase.from("session_logs").select("*").eq("user_id", user_id).order("started_at", { ascending: false }).limit(50),
    ]);

    const attempts = attemptsRes.data || [];
    const sessions = sessionsRes.data || [];

    if (attempts.length < 5) {
      return new Response(JSON.stringify({ message: "Not enough data for analysis" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Feature engineering
    const responseTimes = attempts.filter(a => a.response_time_ms).map(a => a.response_time_ms);
    const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    const responseTimeVariance = responseTimes.length > 1
      ? responseTimes.reduce((sum, t) => sum + Math.pow(t - avgResponseTime, 2), 0) / responseTimes.length
      : 0;

    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.is_correct).length;
    const totalRetries = attempts.reduce((sum, a) => sum + (a.number_of_retries || 0), 0);
    const retryRatio = totalAttempts > 0 ? totalRetries / totalAttempts : 0;
    const errorFrequency = totalAttempts > 0 ? (totalAttempts - correctAttempts) / totalAttempts : 0;
    const hintUsageRate = totalAttempts > 0 ? attempts.filter(a => a.hint_used).length / totalAttempts : 0;
    const abandonmentRate = totalAttempts > 0 ? attempts.filter(a => a.abandonment_flag).length / totalAttempts : 0;

    // Topic accuracy scores
    const topicAccuracy: Record<string, { correct: number; total: number }> = {};
    attempts.forEach(a => {
      if (!a.topic_id) return;
      if (!topicAccuracy[a.topic_id]) topicAccuracy[a.topic_id] = { correct: 0, total: 0 };
      topicAccuracy[a.topic_id].total++;
      if (a.is_correct) topicAccuracy[a.topic_id].correct++;
    });

    const topicScores = Object.entries(topicAccuracy).map(([id, t]) => ({
      topic_id: id,
      accuracy: t.total > 0 ? t.correct / t.total : 0,
    }));
    const weakTopics = topicScores.filter(t => t.accuracy < 0.5);

    // Session improvement rate
    let sessionImprovementRate = 0;
    if (sessions.length >= 2) {
      const recentAccuracy = sessions.slice(0, Math.ceil(sessions.length / 2))
        .filter(s => s.total_questions_attempted > 0)
        .map(s => s.total_correct / s.total_questions_attempted);
      const olderAccuracy = sessions.slice(Math.ceil(sessions.length / 2))
        .filter(s => s.total_questions_attempted > 0)
        .map(s => s.total_correct / s.total_questions_attempted);
      const avgRecent = recentAccuracy.length > 0 ? recentAccuracy.reduce((a, b) => a + b, 0) / recentAccuracy.length : 0;
      const avgOlder = olderAccuracy.length > 0 ? olderAccuracy.reduce((a, b) => a + b, 0) / olderAccuracy.length : 0;
      sessionImprovementRate = avgRecent - avgOlder;
    }

    // Consistency index (standard deviation of accuracy across sessions)
    const sessionAccuracies = sessions
      .filter(s => s.total_questions_attempted > 0)
      .map(s => s.total_correct / s.total_questions_attempted);
    const avgSessionAccuracy = sessionAccuracies.length > 0 ? sessionAccuracies.reduce((a, b) => a + b, 0) / sessionAccuracies.length : 0;
    const consistencyIndex = sessionAccuracies.length > 1
      ? Math.sqrt(sessionAccuracies.reduce((sum, a) => sum + Math.pow(a - avgSessionAccuracy, 2), 0) / sessionAccuracies.length)
      : 0;

    const featureVector = {
      avg_response_time_ms: Math.round(avgResponseTime),
      response_time_variance: Math.round(responseTimeVariance),
      retry_ratio: Number(retryRatio.toFixed(3)),
      error_frequency: Number(errorFrequency.toFixed(3)),
      hint_usage_rate: Number(hintUsageRate.toFixed(3)),
      abandonment_rate: Number(abandonmentRate.toFixed(3)),
      overall_accuracy: Number((correctAttempts / totalAttempts).toFixed(3)),
      session_improvement_rate: Number(sessionImprovementRate.toFixed(3)),
      consistency_index: Number(consistencyIndex.toFixed(3)),
      total_attempts: totalAttempts,
      total_sessions: sessions.length,
      weak_topic_count: weakTopics.length,
    };

    // Call Lovable AI for cognitive classification
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a cognitive learning pattern classifier. Based on student behavioral data, classify them into exactly one of these types:
- Fast & Accurate Learner
- Fast but Careless Learner
- Slow but Accurate Learner
- Trial-and-Error Learner
- Concept Gap Learner
- High Cognitive Load Learner
- Inconsistent Performer
- Struggling Retention Learner

You must respond using the classify_student tool.`
          },
          {
            role: "user",
            content: `Classify this student based on their behavioral feature vector:\n${JSON.stringify(featureVector, null, 2)}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_student",
            description: "Classify a student's cognitive learning type and provide recommendations",
            parameters: {
              type: "object",
              properties: {
                cognitive_type: {
                  type: "string",
                  enum: ["Fast & Accurate Learner", "Fast but Careless Learner", "Slow but Accurate Learner", "Trial-and-Error Learner", "Concept Gap Learner", "High Cognitive Load Learner", "Inconsistent Performer", "Struggling Retention Learner"]
                },
                confidence_score: { type: "number", description: "Confidence 0-1" },
                reasoning: { type: "string", description: "Brief explanation of why this classification was chosen" },
                recommended_difficulty: { type: "integer", minimum: 1, maximum: 5 },
                practice_type: { type: "string", description: "Recommended practice approach" },
                time_limit_mode: { type: "string", description: "Whether to use timed or untimed practice" },
                learning_strategy_summary: { type: "string", description: "Personalized learning strategy" }
              },
              required: ["cognitive_type", "confidence_score", "reasoning", "recommended_difficulty", "practice_type", "learning_strategy_summary"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "classify_student" } }
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const classification = JSON.parse(toolCall.function.arguments);

    // Get existing profile for history tracking
    const { data: existingProfile } = await supabase.from("cognitive_profiles")
      .select("cognitive_type, previous_types")
      .eq("user_id", user_id)
      .maybeSingle();

    const previousTypes = existingProfile?.previous_types || [];
    if (existingProfile?.cognitive_type && existingProfile.cognitive_type !== classification.cognitive_type) {
      previousTypes.push({
        type: existingProfile.cognitive_type,
        changed_at: new Date().toISOString(),
      });
    }

    // Upsert cognitive profile
    await supabase.from("cognitive_profiles").upsert({
      user_id,
      cognitive_type: classification.cognitive_type,
      confidence_score: classification.confidence_score,
      feature_vector: featureVector,
      reasoning: classification.reasoning,
      previous_types: previousTypes,
      last_evaluated: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Deactivate old recommendations, create new one
    await supabase.from("recommendations").update({ is_active: false }).eq("user_id", user_id).eq("is_active", true);

    // Fetch weak topic names
    const weakTopicIds = weakTopics.map(t => t.topic_id);
    let focusTopicNames: string[] = [];
    if (weakTopicIds.length > 0) {
      const { data: topicNames } = await supabase.from("topics").select("name").in("id", weakTopicIds);
      focusTopicNames = (topicNames || []).map(t => t.name);
    }

    await supabase.from("recommendations").insert({
      user_id,
      cognitive_type: classification.cognitive_type,
      recommended_difficulty: classification.recommended_difficulty,
      focus_topics: focusTopicNames,
      practice_type: classification.practice_type,
      time_limit_mode: classification.time_limit_mode || "untimed",
      learning_strategy_summary: classification.learning_strategy_summary,
    });

    // Update topic performance
    for (const ts of topicScores) {
      const topicAttempts = attempts.filter(a => a.topic_id === ts.topic_id);
      const topicCorrect = topicAttempts.filter(a => a.is_correct).length;
      const topicResponseTimes = topicAttempts.filter(a => a.response_time_ms).map(a => a.response_time_ms);
      const avgTopicRT = topicResponseTimes.length > 0 ? topicResponseTimes.reduce((a, b) => a + b, 0) / topicResponseTimes.length : null;
      const avgTopicRetries = topicAttempts.length > 0
        ? topicAttempts.reduce((s, a) => s + (a.number_of_retries || 0), 0) / topicAttempts.length
        : null;

      await supabase.from("topic_performance").upsert({
        user_id,
        topic_id: ts.topic_id,
        total_attempts: topicAttempts.length,
        total_correct: topicCorrect,
        avg_response_time_ms: avgTopicRT,
        avg_retries: avgTopicRetries,
        accuracy_rate: ts.accuracy,
        last_updated: new Date().toISOString(),
      }, { onConflict: "user_id,topic_id" });
    }

    return new Response(JSON.stringify({
      cognitive_type: classification.cognitive_type,
      confidence_score: classification.confidence_score,
      reasoning: classification.reasoning,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-cognitive error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

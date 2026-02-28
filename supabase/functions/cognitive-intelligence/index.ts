import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, action, question_data } = await req.json();
    if (!user_id) throw new Error("user_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch behavioral data
    const [attemptsRes, sessionsRes, cogHistoryRes, existingFingerprintRes, existingEnergyRes] = await Promise.all([
      supabase.from("question_attempts").select("*").eq("user_id", user_id).order("attempted_at", { ascending: false }).limit(300),
      supabase.from("session_logs").select("*").eq("user_id", user_id).order("started_at", { ascending: false }).limit(50),
      supabase.from("cognitive_history").select("*").eq("user_id", user_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("behavioral_fingerprints").select("*").eq("user_id", user_id).maybeSingle(),
      supabase.from("energy_profiles").select("*").eq("user_id", user_id).maybeSingle(),
    ]);

    const attempts = attemptsRes.data || [];
    const sessions = sessionsRes.data || [];
    const cogHistory = cogHistoryRes.data || [];

    if (attempts.length < 3) {
      return new Response(JSON.stringify({ message: "Not enough data for analysis" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== FEATURE ENGINEERING ==========
    const responseTimes = attempts.filter(a => a.response_time_ms).map(a => a.response_time_ms);
    const avgResponseTime = responseTimes.length > 0 ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length : 0;
    const responseTimeVariance = responseTimes.length > 1
      ? responseTimes.reduce((sum: number, t: number) => sum + Math.pow(t - avgResponseTime, 2), 0) / responseTimes.length
      : 0;

    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.is_correct).length;
    const retryRatio = totalAttempts > 0 ? attempts.reduce((s: number, a: any) => s + (a.number_of_retries || 0), 0) / totalAttempts : 0;
    const errorFrequency = totalAttempts > 0 ? (totalAttempts - correctAttempts) / totalAttempts : 0;
    const hintUsageRate = totalAttempts > 0 ? attempts.filter(a => a.hint_used).length / totalAttempts : 0;
    const abandonmentRate = totalAttempts > 0 ? attempts.filter(a => a.abandonment_flag).length / totalAttempts : 0;
    const overallAccuracy = totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

    // Topic accuracy
    const topicAccuracy: Record<string, { correct: number; total: number }> = {};
    attempts.forEach((a: any) => {
      if (!a.topic_id) return;
      if (!topicAccuracy[a.topic_id]) topicAccuracy[a.topic_id] = { correct: 0, total: 0 };
      topicAccuracy[a.topic_id].total++;
      if (a.is_correct) topicAccuracy[a.topic_id].correct++;
    });

    // Session improvement
    let sessionImprovementRate = 0;
    const sessionAccuracies = sessions.filter((s: any) => s.total_questions_attempted > 0)
      .map((s: any) => s.total_correct / s.total_questions_attempted);
    if (sessionAccuracies.length >= 2) {
      const half = Math.ceil(sessionAccuracies.length / 2);
      const recent = sessionAccuracies.slice(0, half);
      const older = sessionAccuracies.slice(half);
      sessionImprovementRate = (recent.reduce((a: number, b: number) => a + b, 0) / recent.length) -
        (older.reduce((a: number, b: number) => a + b, 0) / older.length);
    }

    // Consistency index
    const avgSessionAcc = sessionAccuracies.length > 0 ? sessionAccuracies.reduce((a: number, b: number) => a + b, 0) / sessionAccuracies.length : 0;
    const consistencyIndex = sessionAccuracies.length > 1
      ? Math.sqrt(sessionAccuracies.reduce((sum: number, a: number) => sum + Math.pow(a - avgSessionAcc, 2), 0) / sessionAccuracies.length)
      : 0;

    // Cognitive Stability Index
    const typeChanges = cogHistory.length > 1 ? cogHistory.filter((h: any, i: number) => i > 0 && h.cognitive_type !== cogHistory[i - 1].cognitive_type).length : 0;
    const csi = Math.max(0, 100 - (typeChanges * 15) - (consistencyIndex * 50) - (responseTimeVariance > 50000 ? 20 : 0));
    const stabilityLabel = csi >= 75 ? "Stable Thinker" : csi >= 45 ? "Moderately Stable" : "Unstable Cognitive Pattern";

    // Response rhythm / speed fluctuation for fingerprinting
    const responseRhythm = responseTimes.slice(0, 20).map((t: number, i: number) => ({ index: i, ms: t }));
    const retryTimings = attempts.filter((a: any) => a.time_between_attempts_ms).slice(0, 20)
      .map((a: any, i: number) => ({ index: i, ms: a.time_between_attempts_ms }));
    const errorClustering: Record<string, number> = {};
    attempts.filter((a: any) => !a.is_correct && a.topic_id).forEach((a: any) => {
      errorClustering[a.topic_id] = (errorClustering[a.topic_id] || 0) + 1;
    });
    const hesitationBursts = responseTimes.filter((t: number) => t > avgResponseTime * 2).length;
    const speedFluctuationData = responseTimes.slice(0, 30).map((t: number, i: number) => ({
      index: i, deviation: Math.abs(t - avgResponseTime),
    }));

    // Energy / fatigue analysis
    const hourPerformance: Record<number, { correct: number; total: number }> = {};
    attempts.forEach((a: any) => {
      const hour = new Date(a.attempted_at).getHours();
      if (!hourPerformance[hour]) hourPerformance[hour] = { correct: 0, total: 0 };
      hourPerformance[hour].total++;
      if (a.is_correct) hourPerformance[hour].correct++;
    });
    const energyCurve = Object.entries(hourPerformance).map(([h, d]) => ({
      hour: parseInt(h), accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0, attempts: d.total,
    })).sort((a, b) => a.hour - b.hour);
    const bestHour = energyCurve.length > 0 ? energyCurve.reduce((best, cur) => cur.accuracy > best.accuracy ? cur : best).hour : 12;

    // Session fatigue detection
    const sessionFatiguePoints: number[] = [];
    for (const sess of sessions.slice(0, 10)) {
      const sessAttempts = attempts.filter((a: any) => a.session_id === sess.id)
        .sort((a: any, b: any) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime());
      if (sessAttempts.length >= 4) {
        const firstHalf = sessAttempts.slice(0, Math.ceil(sessAttempts.length / 2));
        const secondHalf = sessAttempts.slice(Math.ceil(sessAttempts.length / 2));
        const firstAcc = firstHalf.filter((a: any) => a.is_correct).length / firstHalf.length;
        const secondAcc = secondHalf.filter((a: any) => a.is_correct).length / secondHalf.length;
        if (secondAcc < firstAcc - 0.15) {
          const fatigueMinute = Math.round((new Date(sessAttempts[Math.ceil(sessAttempts.length / 2)].attempted_at).getTime() -
            new Date(sessAttempts[0].attempted_at).getTime()) / 60000);
          sessionFatiguePoints.push(fatigueMinute);
        }
      }
    }
    const avgFatiguePoint = sessionFatiguePoints.length > 0
      ? Math.round(sessionFatiguePoints.reduce((a, b) => a + b, 0) / sessionFatiguePoints.length) : null;

    // Misconception analysis
    const wrongAnswerPatterns: Record<string, { question_text: string; selected: string; correct: string; topic_id: string }[]> = {};
    attempts.filter((a: any) => !a.is_correct && a.selected_answer && a.topic_id).forEach((a: any) => {
      if (!wrongAnswerPatterns[a.topic_id]) wrongAnswerPatterns[a.topic_id] = [];
      wrongAnswerPatterns[a.topic_id].push({
        question_text: a.question_id, selected: a.selected_answer, correct: "", topic_id: a.topic_id,
      });
    });

    const featureVector = {
      avg_response_time_ms: Math.round(avgResponseTime),
      response_time_variance: Math.round(responseTimeVariance),
      retry_ratio: Number(retryRatio.toFixed(3)),
      error_frequency: Number(errorFrequency.toFixed(3)),
      hint_usage_rate: Number(hintUsageRate.toFixed(3)),
      abandonment_rate: Number(abandonmentRate.toFixed(3)),
      overall_accuracy: Number(overallAccuracy.toFixed(3)),
      session_improvement_rate: Number(sessionImprovementRate.toFixed(3)),
      consistency_index: Number(consistencyIndex.toFixed(3)),
      cognitive_stability_index: Number(csi.toFixed(1)),
      stability_label: stabilityLabel,
      total_attempts: totalAttempts,
      total_sessions: sessions.length,
      type_changes_count: typeChanges,
      best_performance_hour: bestHour,
      avg_fatigue_point_minutes: avgFatiguePoint,
      hesitation_burst_frequency: hesitationBursts,
      cognitive_history_summary: cogHistory.slice(0, 5).map((h: any) => `${h.cognitive_type} (${new Date(h.created_at).toLocaleDateString()})`),
      energy_curve: energyCurve,
      error_clustering: errorClustering,
    };

    // ========== SHADOW PREDICTION (pre-question) ==========
    if (action === "predict" && question_data) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a cognitive behavior prediction engine. Based on the student's behavioral profile, predict how they will perform on the next question. You must respond using the predict_behavior tool.`
            },
            {
              role: "user",
              content: `Student behavioral profile:\n${JSON.stringify(featureVector, null, 2)}\n\nUpcoming question:\nTopic: ${question_data.topic_id}\nDifficulty: ${question_data.difficulty_level}/5\nHas hint: ${!!question_data.hint}`
            }
          ],
          tools: [{
            type: "function",
            function: {
              name: "predict_behavior",
              description: "Predict student behavior for the upcoming question",
              parameters: {
                type: "object",
                properties: {
                  predicted_response_time_ms: { type: "integer", description: "Expected response time in milliseconds" },
                  predicted_retry_probability: { type: "number", description: "Probability of retry (0-1)" },
                  predicted_error_probability: { type: "number", description: "Probability of error (0-1)" },
                  predicted_mistake_type: { type: "string", description: "Most likely type of mistake" },
                  predicted_hesitation_risk: { type: "number", description: "Hesitation risk (0-1)" },
                  confidence_instability: { type: "number", description: "Confidence instability score (0-1)" },
                },
                required: ["predicted_response_time_ms", "predicted_retry_probability", "predicted_error_probability", "predicted_mistake_type", "predicted_hesitation_risk", "confidence_instability"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "predict_behavior" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI prediction error:", aiResponse.status, errText);
        return new Response(JSON.stringify({ error: "AI prediction failed" }), {
          status: aiResponse.status === 429 ? 429 : aiResponse.status === 402 ? 402 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No prediction tool call");
      const prediction = JSON.parse(toolCall.function.arguments);

      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== FULL COGNITIVE INTELLIGENCE ANALYSIS ==========
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a cognitive behavior intelligence engine. Based strictly on the structured behavioral metrics and historical cognitive profile, do the following:
1. Classify cognitive type (one of: Fast & Accurate Learner, Fast but Careless Learner, Slow but Accurate Learner, Trial-and-Error Learner, Concept Gap Learner, High Cognitive Load Learner, Inconsistent Performer, Struggling Retention Learner)
2. Detect cognitive drift patterns
3. Calculate predictability index (0-100)
4. Identify misconception clusters
5. Evaluate cognitive energy pattern
6. Detect breakthrough or stress events
7. Generate behavioral fingerprint summary
8. Provide personalized recommendations

Return structured JSON only via the analyze_intelligence tool.`
          },
          {
            role: "user",
            content: `Analyze this student's complete behavioral profile:\n${JSON.stringify(featureVector, null, 2)}\n\nCognitive history:\n${JSON.stringify(cogHistory.slice(0, 10), null, 2)}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_intelligence",
            description: "Complete cognitive intelligence analysis",
            parameters: {
              type: "object",
              properties: {
                cognitive_type: {
                  type: "string",
                  enum: ["Fast & Accurate Learner", "Fast but Careless Learner", "Slow but Accurate Learner", "Trial-and-Error Learner", "Concept Gap Learner", "High Cognitive Load Learner", "Inconsistent Performer", "Struggling Retention Learner"]
                },
                confidence_score: { type: "number" },
                reasoning: { type: "string" },
                recommended_difficulty: { type: "integer", minimum: 1, maximum: 5 },
                practice_type: { type: "string" },
                time_limit_mode: { type: "string" },
                learning_strategy_summary: { type: "string" },
                cognitive_predictability_index: { type: "number", description: "0-100 CPI score" },
                cpi_label: { type: "string", enum: ["Highly Predictable", "Predictable", "Moderate", "Unpredictable", "Highly Unpredictable"] },
                drift_detected: { type: "boolean" },
                drift_description: { type: "string" },
                misconception_clusters: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      description: { type: "string" },
                      frequency: { type: "integer" },
                    },
                    required: ["type", "description"],
                    additionalProperties: false,
                  },
                },
                energy_analysis: {
                  type: "object",
                  properties: {
                    optimal_study_time: { type: "string" },
                    recommended_session_duration_minutes: { type: "integer" },
                    fatigue_warning: { type: "string" },
                    accuracy_decay_rate: { type: "number" },
                  },
                  required: ["optimal_study_time", "recommended_session_duration_minutes"],
                  additionalProperties: false,
                },
                behavioral_signature: { type: "string" },
                detected_events: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      event_type: { type: "string", enum: ["breakthrough", "stress", "shift", "fatigue"] },
                      description: { type: "string" },
                    },
                    required: ["event_type", "description"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["cognitive_type", "confidence_score", "reasoning", "recommended_difficulty", "practice_type", "learning_strategy_summary", "cognitive_predictability_index", "cpi_label", "drift_detected", "misconception_clusters", "energy_analysis", "behavioral_signature", "detected_events"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_intelligence" } },
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
    const result = JSON.parse(toolCall.function.arguments);

    // ========== STORE RESULTS ==========

    // 1. Cognitive History entry
    await supabase.from("cognitive_history").insert({
      user_id,
      cognitive_type: result.cognitive_type,
      confidence_score: result.confidence_score,
      stability_index: csi,
      stability_label: stabilityLabel,
      feature_vector: featureVector,
      reasoning: result.reasoning,
    });

    // 2. Update cognitive_profiles
    const { data: existingProfile } = await supabase.from("cognitive_profiles")
      .select("cognitive_type, previous_types").eq("user_id", user_id).maybeSingle();

    const previousTypes = existingProfile?.previous_types || [];
    if (existingProfile?.cognitive_type && existingProfile.cognitive_type !== result.cognitive_type) {
      (previousTypes as any[]).push({ type: existingProfile.cognitive_type, changed_at: new Date().toISOString() });
    }

    await supabase.from("cognitive_profiles").upsert({
      user_id,
      cognitive_type: result.cognitive_type,
      confidence_score: result.confidence_score,
      feature_vector: featureVector,
      reasoning: result.reasoning,
      previous_types: previousTypes,
      last_evaluated: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // 3. Recommendations
    await supabase.from("recommendations").update({ is_active: false }).eq("user_id", user_id).eq("is_active", true);

    const weakTopics = Object.entries(topicAccuracy)
      .filter(([, t]) => t.total > 0 && (t.correct / t.total) < 0.5)
      .map(([id]) => id);
    let focusTopicNames: string[] = [];
    if (weakTopics.length > 0) {
      const { data: topicNames } = await supabase.from("topics").select("name").in("id", weakTopics);
      focusTopicNames = (topicNames || []).map((t: any) => t.name);
    }

    await supabase.from("recommendations").insert({
      user_id,
      cognitive_type: result.cognitive_type,
      recommended_difficulty: result.recommended_difficulty,
      focus_topics: focusTopicNames,
      practice_type: result.practice_type,
      time_limit_mode: result.time_limit_mode || "untimed",
      learning_strategy_summary: result.learning_strategy_summary,
    });

    // 4. Behavioral Fingerprint
    const fingerprintId = `CF-${user_id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    await supabase.from("behavioral_fingerprints").upsert({
      user_id,
      fingerprint_id: existingFingerprintRes.data?.fingerprint_id || fingerprintId,
      response_rhythm_pattern: responseRhythm,
      retry_timing_pattern: retryTimings,
      error_clustering_behavior: errorClustering,
      hesitation_burst_frequency: hesitationBursts / Math.max(totalAttempts, 1),
      speed_fluctuation_pattern: speedFluctuationData,
      signature_summary: result.behavioral_signature,
      cognitive_predictability_index: result.cognitive_predictability_index,
      cpi_label: result.cpi_label,
      last_updated: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // 5. Energy Profile
    await supabase.from("energy_profiles").upsert({
      user_id,
      optimal_time_slots: [{ time: result.energy_analysis.optimal_study_time }],
      avg_session_fatigue_point_minutes: avgFatiguePoint || result.energy_analysis.recommended_session_duration_minutes,
      accuracy_decay_rate: result.energy_analysis.accuracy_decay_rate || 0,
      best_performance_hour: bestHour,
      session_duration_recommendation_minutes: result.energy_analysis.recommended_session_duration_minutes,
      energy_curve_data: energyCurve,
      last_updated: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // 6. Misconception Patterns
    for (const mc of (result.misconception_clusters || [])) {
      await supabase.from("misconception_patterns").insert({
        user_id,
        misconception_type: mc.type,
        frequency: mc.frequency || 1,
        confusion_cluster: [mc.description],
      });
    }

    // 7. Cognitive Events
    for (const evt of (result.detected_events || [])) {
      await supabase.from("cognitive_events").insert({
        user_id,
        event_type: evt.event_type,
        description: evt.description,
        event_data: { stability_index: csi, cpi: result.cognitive_predictability_index },
      });
    }

    // 8. Topic performance update
    for (const [topicId, t] of Object.entries(topicAccuracy)) {
      const topicAttempts = attempts.filter((a: any) => a.topic_id === topicId);
      const topicCorrect = topicAttempts.filter((a: any) => a.is_correct).length;
      const topicRTs = topicAttempts.filter((a: any) => a.response_time_ms).map((a: any) => a.response_time_ms);
      const avgRT = topicRTs.length > 0 ? topicRTs.reduce((a: number, b: number) => a + b, 0) / topicRTs.length : null;
      const avgRetries = topicAttempts.length > 0
        ? topicAttempts.reduce((s: number, a: any) => s + (a.number_of_retries || 0), 0) / topicAttempts.length : null;

      await supabase.from("topic_performance").upsert({
        user_id,
        topic_id: topicId,
        total_attempts: topicAttempts.length,
        total_correct: topicCorrect,
        avg_response_time_ms: avgRT,
        avg_retries: avgRetries,
        accuracy_rate: (t as any).total > 0 ? (t as any).correct / (t as any).total : 0,
        last_updated: new Date().toISOString(),
      }, { onConflict: "user_id,topic_id" });
    }

    return new Response(JSON.stringify({
      cognitive_type: result.cognitive_type,
      confidence_score: result.confidence_score,
      reasoning: result.reasoning,
      stability_index: csi,
      stability_label: stabilityLabel,
      cognitive_predictability_index: result.cognitive_predictability_index,
      cpi_label: result.cpi_label,
      drift_detected: result.drift_detected,
      drift_description: result.drift_description,
      misconception_clusters: result.misconception_clusters,
      energy_analysis: result.energy_analysis,
      behavioral_signature: result.behavioral_signature,
      detected_events: result.detected_events,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cognitive-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

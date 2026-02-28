import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
  if (!roleData || (roleData.role !== "admin" && roleData.role !== "teacher")) {
    return new Response(JSON.stringify({ error: "Only admins/teachers can seed data" }), { status: 403, headers: corsHeaders });
  }

  // Insert topics
  const topicsToInsert = [
    { name: "Mathematics", description: "Algebra, geometry, and arithmetic fundamentals", created_by: user.id },
    { name: "Science", description: "Physics, chemistry, and biology basics", created_by: user.id },
    { name: "English", description: "Grammar, vocabulary, and reading comprehension", created_by: user.id },
  ];

  const { data: topics, error: topicErr } = await supabase.from("topics").upsert(topicsToInsert, { onConflict: "name" }).select();
  if (topicErr) {
    // If upsert fails (no unique on name), try insert
    const { data: existingTopics } = await supabase.from("topics").select("*");
    if (existingTopics && existingTopics.length >= 3) {
      // Topics already exist, use them
      const topicIds = existingTopics.slice(0, 3).map(t => t.id);
      await seedQuestions(supabase, topicIds, user.id);
      return new Response(JSON.stringify({ success: true, message: "Sample data seeded (topics already existed)" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: newTopics } = await supabase.from("topics").insert(topicsToInsert).select();
    if (newTopics) {
      await seedQuestions(supabase, newTopics.map(t => t.id), user.id);
    }
    return new Response(JSON.stringify({ success: true, message: "Sample data seeded" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (topics) {
    await seedQuestions(supabase, topics.map(t => t.id), user.id);
  }

  return new Response(JSON.stringify({ success: true, message: "Sample data seeded with 3 topics and 15 questions" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

async function seedQuestions(supabase: any, topicIds: string[], userId: string) {
  const mathId = topicIds[0], sciId = topicIds[1], engId = topicIds[2];

  const questions = [
    // Math
    { topic_id: mathId, question_text: "What is 15 × 12?", options: ["160", "180", "175", "190"], correct_answer: "180", difficulty_level: 1, hint: "Break it into (15×10) + (15×2)", created_by: userId },
    { topic_id: mathId, question_text: "Solve for x: 2x + 5 = 17", options: ["5", "6", "7", "8"], correct_answer: "6", difficulty_level: 2, hint: "Subtract 5 from both sides first", created_by: userId },
    { topic_id: mathId, question_text: "What is the area of a circle with radius 7? (use π≈22/7)", options: ["154", "144", "148", "156"], correct_answer: "154", difficulty_level: 3, hint: "Area = πr²", created_by: userId },
    { topic_id: mathId, question_text: "What is the derivative of x³ + 2x?", options: ["3x² + 2", "3x + 2", "x² + 2", "3x²"], correct_answer: "3x² + 2", difficulty_level: 4, hint: "Use the power rule: d/dx(xⁿ) = nxⁿ⁻¹", created_by: userId },
    { topic_id: mathId, question_text: "What is the sum of interior angles of a hexagon?", options: ["540°", "720°", "600°", "660°"], correct_answer: "720°", difficulty_level: 5, hint: "Formula: (n-2) × 180°", created_by: userId },
    // Science
    { topic_id: sciId, question_text: "What is the chemical symbol for water?", options: ["H2O", "CO2", "NaCl", "O2"], correct_answer: "H2O", difficulty_level: 1, hint: "Two hydrogen atoms and one oxygen atom", created_by: userId },
    { topic_id: sciId, question_text: "What force keeps planets in orbit around the Sun?", options: ["Magnetic force", "Gravity", "Nuclear force", "Friction"], correct_answer: "Gravity", difficulty_level: 2, hint: "Newton discovered this force with an apple", created_by: userId },
    { topic_id: sciId, question_text: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], correct_answer: "Mitochondria", difficulty_level: 2, hint: "It produces ATP energy", created_by: userId },
    { topic_id: sciId, question_text: "What is Newton's second law of motion?", options: ["F = ma", "E = mc²", "V = IR", "PV = nRT"], correct_answer: "F = ma", difficulty_level: 3, hint: "Force equals mass times...", created_by: userId },
    { topic_id: sciId, question_text: "What is the atomic number of Carbon?", options: ["4", "6", "8", "12"], correct_answer: "6", difficulty_level: 4, hint: "It has 6 protons", created_by: userId },
    // English
    { topic_id: engId, question_text: "Which is a synonym for 'happy'?", options: ["Sad", "Joyful", "Angry", "Tired"], correct_answer: "Joyful", difficulty_level: 1, hint: "Think of a word meaning full of joy", created_by: userId },
    { topic_id: engId, question_text: "Identify the noun in: 'The cat sat on the mat.'", options: ["sat", "on", "cat", "the"], correct_answer: "cat", difficulty_level: 1, hint: "A noun is a person, place, or thing", created_by: userId },
    { topic_id: engId, question_text: "What is the past tense of 'run'?", options: ["Runned", "Ran", "Running", "Runs"], correct_answer: "Ran", difficulty_level: 2, hint: "It's an irregular verb", created_by: userId },
    { topic_id: engId, question_text: "Which sentence uses the correct form of 'their/there/they're'?", options: ["Their going home", "There going home", "They're going home", "Theyre going home"], correct_answer: "They're going home", difficulty_level: 3, hint: "They're = They are", created_by: userId },
    { topic_id: engId, question_text: "What literary device is used in: 'The wind whispered through the trees'?", options: ["Simile", "Metaphor", "Personification", "Alliteration"], correct_answer: "Personification", difficulty_level: 4, hint: "The wind is given a human quality", created_by: userId },
  ];

  await supabase.from("questions").insert(questions);
}

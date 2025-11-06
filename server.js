
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 4000;
const OPENAI_KEY = process.env.OPENAI_API_KEY || null;

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILES_FILE = path.join(DATA_DIR, "profiles.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PROFILES_FILE)) fs.writeFileSync(PROFILES_FILE, JSON.stringify({ profiles: [] }, null, 2));

function readProfiles() {
  return JSON.parse(fs.readFileSync(PROFILES_FILE, "utf8"));
}
function writeProfiles(obj) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(obj, null, 2));
}

function buildSystemPrompt(profile, mood) {
  const toneHints = (profile?.texts || []).slice(0, 8).join(" ");
  const moodInstructions = {
    neutral: "Reply in a balanced, neutral tone.",
    flirty: "Reply playfully and flirtatiously (keep it appropriate).",
    pro: "Reply professionally, concise and helpful.",
    dark: "Reply introspectively and slightly moody.",
    crazy: "Reply energetic and hyperbolic (funny)."
  }[mood] || "Reply in your usual tone.";

  return `You are MoodTwin — an assistant that speaks in the style of the user.
User sample hints: ${toneHints}
Tone rules: try to mimic user's style and use their word patterns when possible.
Mood instruction: ${moodInstructions}
If user didn't provide enough samples, be useful but ask clarifying questions.`;
}

// POST /api/train
app.post("/api/train", (req, res) => {
  try {
    const { texts = [], twinName = "Me (MoodTwin)" } = req.body;
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: "Provide a non-empty `texts` array" });
    }
    const profiles = readProfiles();
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    const profile = { id, twinName, texts, createdAt: new Date().toISOString() };
    profiles.profiles.push(profile);
    writeProfiles(profiles);
    return res.json({ ok: true, twinId: id, profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/chat
app.post("/api/chat", async (req, res) => {
  try {
    const { twinId, message, mood = "neutral" } = req.body;
    if (!twinId || !message) return res.status(400).json({ error: "twinId and message required" });

    const profiles = readProfiles();
    const profile = profiles.profiles.find(p => p.id === twinId);
    if (!profile) return res.status(404).json({ error: "twin not found" });

    const systemPrompt = buildSystemPrompt(profile, mood);
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ];

    if (!OPENAI_KEY) {
      // fallback
      const fallback = `I hear you: \"${message}\" (${mood}) — train me with more messages for better replies.`;
      return res.json({ ok: true, reply: fallback });
    }

    // Call OpenAI Chat Completions
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 400,
        temperature: 0.9
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("OpenAI error:", resp.status, text);
      return res.status(500).json({ error: "OpenAI API error", details: text });
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, no reply";
    return res.json({ ok: true, reply, raw: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/send-dm (stub)
app.post("/api/send-dm", (req, res) => {
  const { to, message } = req.body;
  console.log("send-dm stub:", to, message);
  return res.json({ ok: true, status: "mock-sent" });
});

app.get("/", (req, res) => res.send("MoodTwin server is running"));

app.listen(PORT, () => {
  console.log(`MoodTwin server running on port ${PORT}`);
});

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fs from "fs";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const PROFILES_FILE = "profiles.json";

// Make sure profiles.json exists
if (!fs.existsSync(PROFILES_FILE)) fs.writeFileSync(PROFILES_FILE, "{}");

// Root route (optional)
app.get("/", (req, res) => {
  res.send("✅ MoodTwin backend is live and ready!");
});

// Train route — save mood twin text samples
app.post("/api/train", (req, res) => {
  const { name, samples } = req.body;
  if (!name || !samples) return res.status(400).json({ error: "Missing name or samples" });

  const data = JSON.parse(fs.readFileSync(PROFILES_FILE));
  data[name] = samples;
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(data, null, 2));

  res.json({ success: true, message: `Trained twin '${name}' successfully.` });
});

// Chat route — generate AI response
app.post("/api/chat", async (req, res) => {
  const { name, message } = req.body;
  if (!message) return res.status(400).json({ error: "Missing message" });

  const data = JSON.parse(fs.readFileSync(PROFILES_FILE));
  const twinSamples = data[name] || [];

  const prompt = `
You are ${name || "a MoodTwin AI"}. 
Respond naturally and emotionally like the tone from these samples: 
${twinSamples.join("\n")}

User: ${message}
MoodTwin:`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Hmm... I'm not sure what to say.";

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch AI response" });
  }
});

app.listen(PORT, () => console.log(`MoodTwin server running on port ${PORT}`));

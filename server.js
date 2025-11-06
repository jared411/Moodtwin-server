import express from "express";
import cors from "cors";

const app = express();

// ✅ Allow your frontend to talk to this backend
app.use(cors({
  origin: "*", // You can replace * with your frontend link if you want to restrict it
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// 🔍 Root test
app.get("/", (req, res) => {
  res.send("✅ MoodTwin backend is live and CORS-enabled!");
});

// 💬 Chat API
app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  console.log("Message received:", message);

  // Simple response for now
  res.json({ reply: `MoodTwin: You said "${message}"` });
});

// 🚀 Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Mood

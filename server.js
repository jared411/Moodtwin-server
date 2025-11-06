import express from "express";
import cors from "cors";

const app = express();

// ✅ Allow only your frontend to connect
app.use(cors({
  origin: ["https://moodtwin-web.onrender.com"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("✅ MoodTwin backend is live and CORS is set for moodtwin-web.onrender.com");
});

// Chat API
app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  console.log("User said:", message);
  res.json({ reply: `MoodTwin: You said "${message}" 💬` });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ MoodTwin server running on port ${PORT}`));
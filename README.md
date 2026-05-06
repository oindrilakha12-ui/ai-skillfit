# 🧠 AI SkillFit

**Multilingual Video Interview & Workforce Intelligence Platform**

An AI-powered video interview system where candidates answer questions via voice/video, and the system evaluates responses using OpenAI Whisper speech-to-text and keyword-based scoring.

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+** (for backend)
- **FFmpeg** installed and on PATH (required by Whisper)
- A modern browser (Chrome/Edge recommended)

### 1. Setup Backend

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

The backend will start at **http://localhost:8000**.

> ⚠️ On first run, Whisper will download the `base` model (~140MB). This only happens once.

### 2. Launch Frontend

Simply open `frontend/index.html` in your browser, or serve it:

```bash
cd frontend
python -m http.server 3000
```

Then visit **http://localhost:3000**.

---

## 🏗️ Architecture

```
AI SkillFit/
├── backend/
│   ├── main.py              # FastAPI server + Whisper + scoring
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Single-page app structure
│   ├── styles.css           # Premium glassmorphism design
│   └── app.js               # Camera, recording, API logic
└── README.md
```

---

## 🔌 API Endpoint

### `POST /analyze`

Upload an audio file for transcription and scoring.

**Request:** `multipart/form-data` with field `file` (audio file)

**Response:**
```json
{
  "transcript": "I have 5 years of experience working with machines...",
  "score": 3,
  "matched_keywords": ["experience", "work", "machine"],
  "category": "Requires Training 📚",
  "confidence": 85,
  "fraud": "✅ No suspicious activity detected",
  "word_count": 15
}
```

---

## ✨ Features

| Feature | Technology |
|---------|-----------|
| 🎤 Voice Recording | MediaRecorder API |
| 📹 Video Preview | getUserMedia API |
| 🗣️ Question Reading | Web Speech Synthesis |
| 🌐 Multilingual | English, Hindi, Kannada |
| 🤖 Transcription | OpenAI Whisper (base) |
| 📊 Scoring | Keyword matching |
| 🛡️ Fraud Detection | Response quality analysis |

---

## 📝 License

MIT — Built for hackathons and demos.

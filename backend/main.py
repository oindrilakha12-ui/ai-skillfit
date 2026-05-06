"""
AI SkillFit — FastAPI Backend
Handles audio upload, Whisper transcription, keyword scoring, and fraud detection.
"""

import os
import tempfile
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import whisper

app = FastAPI(title="AI SkillFit Backend", version="1.0.0")

# Allow all origins for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Whisper model once at startup
print("[*] Loading Whisper model (base)...")
model = whisper.load_model("base")
print("[OK] Whisper model loaded successfully!")

# Keywords for scoring
KEYWORDS = ["experience", "work", "machine", "repair", "skills",
            "team", "project", "years", "learning", "problem",
            "technology", "software", "develop", "manage", "design"]


def score_transcript(transcript: str) -> dict:
    """Score a transcript based on keyword matching."""
    words = transcript.lower().split()
    word_count = len(words)

    # Count matched keywords
    matched = [kw for kw in KEYWORDS if kw in transcript.lower()]
    score = len(matched)

    # Classification
    if score >= 4:
        category = "Job-Ready ✅"
    elif score >= 2:
        category = "Requires Training 📚"
    else:
        category = "Low Confidence ⚠️"

    # Confidence score
    confidence = min(100, score * 15 + 40)

    # Fraud detection
    if word_count < 3:
        fraud = "⚠️ Low response quality — possible fraudulent submission"
    elif word_count < 8:
        fraud = "⚠️ Very brief response — review recommended"
    else:
        fraud = "✅ No suspicious activity detected"

    return {
        "transcript": transcript,
        "score": score,
        "matched_keywords": matched,
        "category": category,
        "confidence": confidence,
        "fraud": fraud,
        "word_count": word_count,
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "model": "whisper-base"}


@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...), language: str = Form("en")):
    """Accept an audio file, transcribe with Whisper, score, and return results."""

    # Save uploaded file to a temp location
    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Transcribe with Whisper
        result = model.transcribe(tmp_path, language=language, fp16=False)
        transcript = result.get("text", "").strip()

        if not transcript:
            return {
                "transcript": "(No speech detected)",
                "score": 0,
                "matched_keywords": [],
                "category": "Low Confidence ⚠️",
                "confidence": 0,
                "fraud": "⚠️ No speech detected in audio",
                "word_count": 0,
            }

        # Score the transcript
        return score_transcript(transcript)

    finally:
        # Clean up temp file
        os.unlink(tmp_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

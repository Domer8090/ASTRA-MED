"""Persistent Kokoro ONNX worker. Loads model weights once and serves JSONL requests."""

import base64
import io
import json
import sys

from kokoro_onnx import Kokoro
import soundfile as sf


model_path, voices_path = sys.argv[1:3]
kokoro = Kokoro(model_path, voices_path)
print(json.dumps({"ready": True}), flush=True)

for line in sys.stdin:
    try:
        request = json.loads(line)
        text = str(request.get("text", "")).strip()
        voice = str(request.get("voice", "am_adam"))
        if not text or len(text) > 700:
            raise ValueError("Text must contain 1–700 characters.")
        audio, sample_rate = kokoro.create(text, voice=voice, speed=1.04, lang="en-us")
        output = io.BytesIO()
        sf.write(output, audio, sample_rate, format="WAV", subtype="PCM_16")
        print(json.dumps({"id": request.get("id"), "audio": base64.b64encode(output.getvalue()).decode("ascii")}), flush=True)
    except Exception as error:  # Return request errors without killing the loaded model.
        print(json.dumps({"id": request.get("id") if "request" in locals() else None, "error": str(error)[:200]}), flush=True)

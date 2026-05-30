from flask import Flask, render_template, request, send_file
from transformers import MusicgenForConditionalGeneration, AutoProcessor
from scipy.io.wavfile import write
import torch
import numpy as np
import os

app = Flask(__name__)

# =========================
# LOAD MUSICGEN MODEL
# =========================
print("Loading MusicGen model...")

processor = AutoProcessor.from_pretrained(
    "facebook/musicgen-small"
)

model = MusicgenForConditionalGeneration.from_pretrained(
    "facebook/musicgen-small"
)

print("Model loaded successfully!")

# =========================
# OUTPUT FOLDER
# =========================
OUTPUT_DIR = "generated_music"
os.makedirs(OUTPUT_DIR, exist_ok=True)


# =========================
# HOME PAGE
# =========================
@app.route("/")
def home():
    return render_template("index.html")


# =========================
# GENERATE MUSIC
# =========================
@app.route("/generate", methods=["POST"])
def generate():

    try:
        # récupérer prompt utilisateur
        prompt = request.form["prompt"]

        print(f"Generating music for: {prompt}")

        # transformer texte -> input modèle
        inputs = processor(
            text=[prompt],
            return_tensors="pt"
        )

        # génération musique LONGUE
        with torch.no_grad():
            audio_values = model.generate(
                **inputs,
                max_new_tokens=1024
            )

        # récupérer audio
        audio = audio_values[0, 0].cpu().numpy()

        # convertir audio
        audio = (audio * 32767).astype(np.int16)

        # fichier sortie
        file_path = os.path.join(
            OUTPUT_DIR,
            "generated_music.wav"
        )

        # sauvegarder audio WAV
        write(
            file_path,
            32000,
            audio
        )

        print("Music generated successfully!")

        # envoyer fichier
        return send_file(
            file_path,
            as_attachment=True
        )

    except Exception as e:

        print("ERROR:", e)

        return f"""
        <h1>Error generating music</h1>
        <p>{str(e)}</p>
        """


# =========================
# RUN APP
# =========================
if __name__ == "__main__":
    app.run(debug=True)
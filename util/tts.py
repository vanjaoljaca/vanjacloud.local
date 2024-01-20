import sys
import torch
from TTS.api import TTS

# Get device
device = "cuda" if torch.cuda.is_available() else "cpu"

# List available 🐸TTS models
print(TTS().list_models())

# Init TTS
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

output = sys.argv[1]
voice = sys.argv[2]
text = sys.argv[3]

# Run TTS
# ❗ Since this model is multi-lingual voice cloning model, we must set the target speaker_wav and language
# Text to speech list of amplitude values as output
wav = tts.tts(text=text, speaker_wav=voice, language="en")
# Text to speech to a file
tts.tts_to_file(
    text=text,
    speaker_wav=voice,
    language="en",
    file_path=output,
)

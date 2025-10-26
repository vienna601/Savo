from transformers import VitsModel, AutoTokenizer
import torch
import scipy.io.wavfile

model = VitsModel.from_pretrained("facebook/mms-tts-eng")
tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-eng")

text = "some example text in the English language"
inputs = tokenizer(text, return_tensors="pt")

with torch.no_grad():
    output = model(**inputs).waveform  # shape: [1, num_samples]

audio = output.squeeze().cpu().numpy()  # ✅ convert to 1D array

scipy.io.wavfile.write(
    "techno.wav",
    rate=model.config.sampling_rate,
    data=audio.astype("float32")        # ✅ ensure correct dtype
)

print("✅ Saved techno.wav")

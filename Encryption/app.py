import os
import io
import base64
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from cryptography.fernet import Fernet
from PIL import Image
import numpy as np
import soundfile as sf
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

FERNET_KEY = os.getenv("FERNET_KEY")
if not FERNET_KEY:
    raise RuntimeError("FERNET_KEY missing")

fernet = Fernet(FERNET_KEY)

@app.get("/health")
def health():
    return jsonify({"ok": True})

# ---------------- BINARY HELPERS ---------------- #

def to_bits(data: bytes):
    return [int(bit) for byte in data for bit in f"{byte:08b}"]

def from_bits(bits):
    out = bytearray()
    for i in range(0, len(bits), 8):
        chunk = bits[i:i+8]
        if len(chunk) < 8:
            break
        out.append(int("".join(str(x) for x in chunk), 2))
    return bytes(out)

def header_bytes(n: int):
    return n.to_bytes(4, "big")

def parse_header(b: bytes):
    if len(b) < 4:
        return None
    return int.from_bytes(b[:4], "big")

# ---------------- IMAGE STEGANOGRAPHY ---------------- #

def embed_in_image(img_bytes: bytes, token: str):
    im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    arr = np.array(im)
    flat = arr.reshape(-1, 3)

    payload = token.encode()
    data = header_bytes(len(payload)) + payload
    bits = to_bits(data)

    if len(bits) > flat.shape[0] * 3:
        raise ValueError("Image too small to hide payload")

    idx = 0
    for px in flat:
        for ch in range(3):
            if idx >= len(bits):
                break
            px[ch] = (px[ch] & 0xFE) | bits[idx]
            idx += 1
        if idx >= len(bits):
            break

    img = Image.fromarray(flat.reshape(arr.shape), "RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue(), "image/png"

def extract_from_image(img_bytes: bytes):
    im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    arr = np.array(im).reshape(-1, 3)

    header_bits = []
    for i in range(32):
        for ch in range(3):
            header_bits.append(arr[i][ch] & 1)

    msg_len = parse_header(from_bits(header_bits))
    total_bits = (4 + msg_len) * 8

    bits = []
    for i in range((total_bits // 3) + 5):
        for ch in range(3):
            bits.append(arr[i][ch] & 1)
            if len(bits) >= total_bits:
                break
        if len(bits) >= total_bits:
            break

    data = from_bits(bits)
    return data[4:4+msg_len].decode()

# ---------------- AUDIO STEGANOGRAPHY ---------------- #

def embed_in_wav(wav_bytes: bytes, token: str):
    data, rate = sf.read(io.BytesIO(wav_bytes), dtype="int16")
    flat = data.reshape(-1)

    payload = token.encode()
    bits = to_bits(header_bytes(len(payload)) + payload)

    if len(bits) > flat.size:
        raise ValueError("Audio too small for payload")

    for i, b in enumerate(bits):
        flat[i] = (flat[i] & 0xFFFE) | b

    buf = io.BytesIO()
    sf.write(buf, flat.reshape(data.shape), rate, format="WAV")
    return buf.getvalue(), "audio/wav"

def extract_from_wav(wav_bytes: bytes):
    data, rate = sf.read(io.BytesIO(wav_bytes), dtype="int16")
    flat = data.reshape(-1)

    header_bits = [(flat[i] & 1) for i in range(32)]
    n = parse_header(from_bits(header_bits))

    bits = [(flat[i] & 1) for i in range((4+n)*8)]
    full = from_bits(bits)
    return full[4:4+n].decode()

# ---------------- API ROUTES ---------------- #

@app.post("/encrypt")
def encrypt_payload():
    body = request.get_json(force=True)
    required = ["patient_id", "patient_name", "data", "sender", "recipient"]
    if not all(k in body for k in required):
        return jsonify({"error": "Missing fields"}), 400

    payload = {
        "patient_id": body["patient_id"],
        "patient_name": body["patient_name"],
        "message": body["data"],
        "sender": body["sender"],
        "recipient": body["recipient"]
    }

    token = fernet.encrypt(json.dumps(payload).encode()).decode()
    result = {"cipher_text": token}

    file = body.get("file") or {}
    b64 = file.get("b64")
    mime = (file.get("mime") or "").lower()
    fname = file.get("filename") or "stego"

    if b64 and mime:
        try:
            raw = base64.b64decode(b64)
            if mime.startswith("image/"):
                stego, out_mime = embed_in_image(raw, token)
                ext = "png"
            elif mime in ("audio/wav", "audio/x-wav"):
                stego, out_mime = embed_in_wav(raw, token)
                ext = "wav"
            else:
                raise ValueError("Unsupported media type")

            result["stego_file"] = {
                "b64": base64.b64encode(stego).decode(),
                "mime": out_mime,
                "filename": f"{os.path.splitext(fname)[0]}.{ext}"
            }
        except Exception as e:
            result["stego_error"] = str(e)

    return jsonify(result)

@app.post("/decrypt")
def decrypt_payload():
    body = request.get_json(force=True)
    token = body.get("cipher_text")
    if not token:
        return jsonify({"error": "cipher_text required"}), 400

    try:
        data = json.loads(fernet.decrypt(token.encode()).decode())
        return jsonify({"data": data})
    except Exception:
        return jsonify({"error": "Invalid token"}), 400

@app.post("/extract")
def extract_from_media():
    body = request.get_json(force=True)
    file = body.get("file") or {}
    b64 = file.get("b64")
    mime = (file.get("mime") or "").lower()

    if not b64 or not mime:
        return jsonify({"error": "file {b64,mime} required"}), 400

    try:
        raw = base64.b64decode(b64)
        if mime.startswith("image/"):
            token = extract_from_image(raw)
        elif mime in ("audio/wav", "audio/x-wav"):
            token = extract_from_wav(raw)
        else:
            return jsonify({"error": "Unsupported media type"}), 400

        data = json.loads(fernet.decrypt(token.encode()).decode())
        return jsonify({"cipher_text": token, "data": data})

    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ---------------- RENDER ENTRY ---------------- #

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 6001))
    app.run(host="0.0.0.0", port=port)

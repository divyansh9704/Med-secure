# MedSecure

Secure medical data exchange using steganography and encryption. Doctors can embed encrypted patient data inside image/audio files and share them safely within a hospital network to other doctor.

## Tech Stack

- Backend: Node, Express, JWT
- Stego Service: Python, Flask, cryptography (Fernet)
- Frontend: React, React-Bootstrap
- Database: MongoDB, Cloudinary

## Core Features

- Cookie-based authentication
- Two-Factor Authentication (2FA) using Google Authenticator (TOTP)
- Encrypt (send) and decrypt (receive) workflows
- Image and audio steganography via Python microservice (Fernet + LSB-ready)
- Inbox for received messages and status
- LOGS for sent messages for doctor A.
- Structured decrypted view (patient_id, patient_name, message, sender, timestamp)


## How to Run

Prerequisites: Node.js, Python, and MongoDB connection (Atlas)

1) Backend API (Node)
- Path: `Server`
- Create `.env` 
- Install and run
  - npm install
  - npm run dev


2) Stego Service (Python)
- Path: `/Encryption`
- Create `.env` 
- Create venv and install:
  - python -m venv venv
  - pip install -r requirements.txt
- Start encryption
  - python app.py

3) Frontend (React)
- Path: `Client`
- Create `.env` 
- Install and run:
  - npm install
  - npm run dev


## Data Flow


Doctor-to-doctor journey (what happens when a doctor sends a secure message to another doctor):

**Account Registration & Login:**
- During registration, doctors set up 2FA by scanning a QR code with Google Authenticator and saving the secret.
- During login, doctors must enter a 6-digit code from their authenticator app in addition to their password.

1)  Doctor A (Sender)
- Uploads a cover file ( Image or  Audio)
- Enters patient_id, patient_name, and a confidential message
- Chooses the recipient doctor and clicks Encrypt & Send


2)  Platform Processing
- The platform encrypts the patient data and binds it to the cover file
- A secure message record is created and an audit entry is written

3)  Doctor B (Recipient)
- Sees a new item in Inbox with sender and timestamp
- Clicks Decrypt to view the patient details in a structured modal

4)  Audit Trail
-  Send and decrypt actions are recorded for compliance.

Quick view with table emoji formatting:

|  From |  Step |  To |
|---|---|---|
|  Doctor A | Uploads cover image/audio, enters patient data |  Platform |
|  Platform | Encrypts, binds, logs audit |  Doctor B |
|  Doctor B | Decrypts and views structured details |  Doctor B |

 --- END------------


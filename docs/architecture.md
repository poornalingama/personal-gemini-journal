# Personal Gemini Journal Architecture

## High-Level Flow

User
  |
  v
Firebase Authentication
  |
  v
Firebase ID Token
  |
  v
Cloud Run / Flask
  |
  +--> Gemini API
  |
  +--> Firestore
  |
  +--> Secret Manager

## Authentication

Supported providers:

1. Google Sign-In
2. Email/Password

Both providers produce a Firebase UID.

The backend must derive the authenticated UID from the verified Firebase ID token.

The browser must never be trusted to provide an authoritative user identity.

## Data Isolation

Every user-owned Firestore record must be associated with the authenticated Firebase UID.

All protected backend operations must verify ownership.

## AI

Gemini calls occur on the server side.

Sensitive Gemini credentials must not be exposed to browser code.

## Deployment

The production application will run on Google Cloud Run.

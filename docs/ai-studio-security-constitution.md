# Google AI Studio Security Constitution

The authoritative security instructions for the Personal Gemini Journal are maintained in Google AI Studio System Instructions.

The constitution requires:

- Firebase authentication
- Server-side token verification
- Server-side authorization
- Firebase UID-derived identity
- User-scoped Firestore access
- Zero cross-user data leakage
- Secret Manager for sensitive production credentials
- No secrets in frontend code
- Input validation
- Secure error handling
- Prompt-injection awareness
- AI output must never control authorization
- Least-privilege IAM
- Production security testing

The full active constitution is maintained in the Google AI Studio project used for this application.

Phase 1 verification must include testing insecure proposals involving:

1. Browser-supplied user IDs
2. Frontend Firestore filtering
3. Client-side Gemini API keys
4. Cross-user resource access
5. Prompt injection attempting to access private data

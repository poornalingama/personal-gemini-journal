# Security Requirements

## Authentication

All protected application operations require a valid Firebase Authentication ID token.

## Authorization

Authentication proves who the user is.

Authorization determines whether the user can access the requested resource.

The backend must never trust a user_id supplied by the browser.

## Firestore Isolation

Every user-owned record must be scoped to the authenticated Firebase UID.

A user must never be able to read, update, delete, or infer another user's private data.

## Secrets

Sensitive credentials must never be:

- hardcoded in source code
- committed to Git
- included in HTML
- included in JavaScript
- exposed in browser network responses
- stored in .env files committed to Git

Production secrets must be retrieved securely at runtime.

## Input Validation

Validate all user-controlled input.

## Error Handling

Do not expose stack traces, secrets, tokens, or internal infrastructure details to users.

## Least Privilege

Cloud Run service accounts and other identities should receive only the permissions required for the application.

## Testing

Cross-user authorization must be tested with at least two distinct accounts.

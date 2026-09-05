import os


PROJECT_ID = (
    os.getenv("GOOGLE_CLOUD_PROJECT")
    or os.getenv("FIREBASE_PROJECT_ID")
)

PORT = int(os.getenv("PORT", "8080"))

APP_ENV = os.getenv(
    "APP_ENV",
    "development"
)

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.7-flash"
)


if not PROJECT_ID:
    PROJECT_ID = "local-development"

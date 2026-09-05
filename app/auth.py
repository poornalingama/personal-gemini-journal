import os
from functools import wraps

import firebase_admin
from firebase_admin import auth as firebase_auth
from flask import jsonify, request


PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("FIREBASE_PROJECT_ID")


def initialize_firebase():
    """
    Initialize Firebase Admin SDK using Application Default Credentials.

    No service-account JSON key is stored in the application.
    """

    if not PROJECT_ID:
        raise RuntimeError(
            "GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID must be set"
        )

    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(
            options={
                "projectId": PROJECT_ID
            }
        )


def get_bearer_token():
    """Extract a Bearer token from the Authorization header."""

    header = request.headers.get("Authorization", "")

    if not header.startswith("Bearer "):
        return None

    token = header[7:].strip()

    if not token:
        return None

    return token


def verify_request_token():
    """
    Verify the Firebase ID token supplied by the client.

    The authenticated UID comes only from the verified token.
    """

    initialize_firebase()

    token = get_bearer_token()

    if not token:
        return None, {
            "error": "Authentication required"
        }, 401

    try:
        decoded_token = firebase_auth.verify_id_token(
            token,
            check_revoked=True
        )

        uid = decoded_token.get("uid")

        if not uid:
            return None, {
                "error": "Invalid authentication token"
            }, 401

        return decoded_token, None, None

    except firebase_auth.ExpiredIdTokenError:
        return None, {
            "error": "Authentication token expired"
        }, 401

    except firebase_auth.RevokedIdTokenError:
        return None, {
            "error": "Authentication token revoked"
        }, 401

    except firebase_auth.UserDisabledError:
        return None, {
            "error": "User account disabled"
        }, 403

    except firebase_auth.InvalidIdTokenError:
        return None, {
            "error": "Invalid authentication token"
        }, 401

    except Exception as exc:
        import traceback
        print("\n========== FIREBASE TOKEN VERIFICATION ERROR ==========", flush=True)
        print(f"Error type: {type(exc).__name__}", flush=True)
        print(f"Error: {exc}", flush=True)
        traceback.print_exc()
        print("========================================================\n", flush=True)

        return None, {
            "error": f"Authentication verification failed: {type(exc).__name__}: {exc}"
        }, 401


def require_authenticated_user(function):
    """
    Flask decorator for protected routes.

    Never trusts user_id from the request body or query string.
    """

    @wraps(function)
    def wrapper(*args, **kwargs):
        decoded_token, error, status = verify_request_token()

        if error:
            return jsonify(error), status

        request.authenticated_user = decoded_token
        request.authenticated_uid = decoded_token["uid"]

        return function(*args, **kwargs)

    return wrapper

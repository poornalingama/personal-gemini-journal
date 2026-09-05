import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    firebaseConfig
} from "./firebase-config.js";


const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const googleProvider =
    new GoogleAuthProvider();


await setPersistence(
    auth,
    browserLocalPersistence
);


const message =
    document.getElementById("auth-message");


const registerModal =
    document.getElementById("register-modal");


function showMessage(
    text,
    type = "info"
) {
    if (!message) return;

    message.textContent = text;

    message.className =
        `auth-message ${type}`;
}


function openRegisterModal() {

    if (!registerModal) return;

    registerModal.hidden = false;

    registerModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.style.overflow =
        "hidden";

    setTimeout(() => {
        document
            .getElementById("register-name")
            ?.focus();
    }, 50);
}


function closeRegisterModal() {

    if (!registerModal) return;

    registerModal.hidden = true;

    registerModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.style.overflow =
        "";

    document
        .getElementById("register-form")
        ?.reset();
}


document
    .getElementById("open-register")
    ?.addEventListener(
        "click",
        openRegisterModal
    );


document
    .getElementById("close-register")
    ?.addEventListener(
        "click",
        closeRegisterModal
    );


document
    .getElementById("close-register-backdrop")
    ?.addEventListener(
        "click",
        closeRegisterModal
    );


document
    .getElementById("modal-login")
    ?.addEventListener(
        "click",
        closeRegisterModal
    );


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            registerModal &&
            !registerModal.hidden
        ) {
            closeRegisterModal();
        }

    }
);


/* Password visibility */

document
    .querySelectorAll(".password-toggle")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const target =
                    document.getElementById(
                        button.dataset.target
                    );

                if (!target) return;

                target.type =
                    target.type === "password"
                        ? "text"
                        : "password";

            }
        );

    });


async function sendTokenToBackend(user) {

    const token =
        await user.getIdToken(true);

    const response =
        await fetch(
            "/api/auth/me",
            {
                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {

        throw new Error(
            data.error ||
            `Backend authentication failed (${response.status})`
        );

    }

    return data;
}


async function completeAuthentication(
    user,
    successMessage
) {

    try {

        const backendUser =
            await sendTokenToBackend(user);

        showMessage(
            successMessage ||
            `Welcome ${backendUser.email || ""}`,
            "success"
        );

        window.location.href =
            "/dashboard";

    } catch (error) {

        console.error(error);

        showMessage(
            "Firebase authentication succeeded, " +
            "but the application server could not " +
            "verify the session. " +
            error.message,
            "error"
        );

    }
}


/* Google */

document
    .getElementById("google-login")
    ?.addEventListener(
        "click",
        async () => {

            try {

                const result =
                    await signInWithPopup(
                        auth,
                        googleProvider
                    );

                await completeAuthentication(
                    result.user,
                    `Signed in as ${result.user.email}`
                );

            } catch (error) {

                console.error(error);

                showMessage(
                    friendlyError(error),
                    "error"
                );

            }

        }
    );


/* Login */

document
    .getElementById("login-form")
    ?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const email =
                document
                    .getElementById(
                        "login-email"
                    )
                    .value
                    .trim();

            const password =
                document
                    .getElementById(
                        "login-password"
                    )
                    .value;

            try {

                const result =
                    await signInWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                await completeAuthentication(
                    result.user,
                    `Signed in as ${result.user.email}`
                );

            } catch (error) {

                console.error(error);

                showMessage(
                    friendlyError(error),
                    "error"
                );

            }

        }
    );


/* Register */

document
    .getElementById("register-form")
    ?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const name =
                document
                    .getElementById(
                        "register-name"
                    )
                    .value
                    .trim();

            const email =
                document
                    .getElementById(
                        "register-email"
                    )
                    .value
                    .trim();

            const password =
                document
                    .getElementById(
                        "register-password"
                    )
                    .value;

            const confirmPassword =
                document
                    .getElementById(
                        "register-password-confirm"
                    )
                    .value;

            if (password !== confirmPassword) {

                alert(
                    "Passwords do not match."
                );

                return;
            }

            try {

                const result =
                    await createUserWithEmailAndPassword(
                        auth,
                        email,
                        password
                    );

                if (name) {

                    await updateProfile(
                        result.user,
                        {
                            displayName: name
                        }
                    );

                }

                closeRegisterModal();

                await completeAuthentication(
                    result.user,
                    `Account created for ${result.user.email}`
                );

            } catch (error) {

                console.error(error);

                showMessage(
                    friendlyError(error),
                    "error"
                );

            }

        }
    );


/* Password reset */

document
    .getElementById("reset-password")
    ?.addEventListener(
        "click",
        async () => {

            const email =
                document
                    .getElementById(
                        "login-email"
                    )
                    .value
                    .trim();

            if (!email) {

                showMessage(
                    "Enter your email first.",
                    "error"
                );

                return;
            }

            try {

                await sendPasswordResetEmail(
                    auth,
                    email
                );

                showMessage(
                    "Password reset email sent.",
                    "success"
                );

            } catch (error) {

                showMessage(
                    friendlyError(error),
                    "error"
                );

            }

        }
    );


function friendlyError(error) {

    const code =
        error?.code || "";

    const messages = {

        "auth/email-already-in-use":
            "An account already exists for this email. Please sign in.",

        "auth/invalid-credential":
            "Invalid email or password.",

        "auth/wrong-password":
            "Invalid email or password.",

        "auth/user-not-found":
            "No account exists for this email.",

        "auth/weak-password":
            "Password must be at least 6 characters.",

        "auth/popup-closed-by-user":
            "Google sign-in was cancelled."

    };

    return (
        messages[code] ||
        error?.message ||
        "Authentication failed."
    );
}

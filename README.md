# Personal Gemini Journal

Personal Gemini Journal is an AI-powered personal reflection and productivity application built for the **Accelerate AI with Cloud Run Ideathon**.

The project brings journaling, AI-powered reflection, goals, planning and decision support into one personal workspace. Instead of keeping thoughts, goals and important information across multiple applications, users can manage and reflect on them in one place.

The application uses Gemini to help users understand the information they create. It can support reflection, identify useful patterns and help users think through possible next steps. The user always remains in control of their own decisions.

---

## The Problem

People often write about their experiences, thoughts, plans and goals, but reviewing a large number of journal entries can become difficult over time.

Important information can also become scattered across different applications for journaling, planning, goals and personal notes.

This can make it difficult to answer questions such as:

- What themes keep appearing in my thoughts?
- What have I been focusing on recently?
- Am I making progress toward my goals?
- What should I focus on next?
- What information have I saved previously?
- How can I think through an important decision more clearly?

Personal Gemini Journal brings these activities together and uses AI to help users reflect on their own information.

---

## How the Application Works

### 1. Sign In

Users create an account or sign in using Firebase Authentication. The application supports authenticated access so personal information is associated with the correct user.

The backend verifies authentication before accessing user data.

### 2. Write and Manage Journal Entries

Users can create and manage personal journal entries. Entries can contain thoughts, experiences, plans, reflections or anything else the user wants to record.

Journal information is stored in Cloud Firestore and is scoped to the authenticated user.

### 3. Get AI-Powered Reflection

Users can use Gemini-powered features to analyse their journal information and receive useful reflections.

Depending on the feature, the application can help identify:

- Important themes
- Key takeaways
- Personal insights
- Possible next steps
- Patterns that may not be obvious when reviewing individual entries


### 4. Track Goals

The Goals section allows users to create personal goals and monitor their progress.

Users can:

- Create goals
- Track active and completed goals
- Review progress
- Receive AI-powered goal insights
- Identify a possible next focus area

Goals are stored as part of the user's personal data and are isolated from other users.

### 5. Manage Important Dates

The Calendar section helps users organise important events and dates.

Users can:

- Add events
- View upcoming events
- Navigate between months
- Review scheduled information
- Use the calendar alongside their goals and journal activities

### 6. Review Personal Insights and Analytics

The application includes Insights and Analytics features that help users look beyond individual journal entries.

These features help present a broader view of the information created by the user and can support reflection on recurring activity and personal progress.

### 7. Search Personal Information

The Global Search feature helps users find relevant information across their personal workspace.

This reduces the need to manually review every journal entry or saved item when looking for previously recorded information.

### 8. Save Useful Information

The Bookmarks feature allows users to save information they want to revisit later.

This can be used alongside journaling and other personal productivity features to keep useful information accessible in one workspace.

### 9. DecisionLens

DecisionLens is an AI-assisted decision intelligence feature.

Users can record:

- A decision they are considering
- Context and constraints
- Possible options
- Concerns and considerations

Gemini can then assist the user in thinking through the available information.

DecisionLens is designed to support clearer thinking. It does not make decisions for the user.

---

## Core Technologies

Personal Gemini Journal is built using the following technologies:

- Google AI Studio
- Gemini API
- Firebase Authentication
- Cloud Firestore
- Google Cloud Secret Manager
- Google Cloud Run
- Python
- Flask
- JavaScript
- HTML and CSS


---

## How Gemini Is Used

Gemini is the AI layer of Personal Gemini Journal.

The application sends relevant user-provided information to Gemini when the user requests an AI-powered feature. Gemini is used to support activities such as:

- Journal reflection
- AI summaries
- Personal insights
- Identifying themes
- Suggesting possible next steps
- Goal-related insights
- DecisionLens analysis

The AI features are designed to help users understand and reflect on their information. Gemini is not intended to replace the user's own judgement or automatically make personal decisions.

The Gemini integration is implemented through the server-side application rather than exposing the Gemini API key directly in the frontend.

---

## Google AI Studio

Google AI Studio is used as part of the project's Gemini development workflow.

The project follows the Ideathon requirement of configuring and using Gemini with a security-focused approach. The application is built around a server-side Gemini integration so that sensitive credentials are not embedded directly into the application frontend.

---

## Firebase Authentication

Firebase Authentication is used to provide authenticated access to the application.

Users must authenticate before accessing their personal workspace.

Authentication is important because the application stores personal information such as:

- Journal entries
- Goals
- Calendar events
- Bookmarks
- Decisions
- AI-generated reflections

The backend verifies authentication before processing protected user requests.

---

## Cloud Firestore and User Data Isolation

Cloud Firestore is used for persistent application data.

A key design principle of the project is user data isolation.

Personal information is associated with the authenticated user so that one user should not be able to access another user's journal information or personal workspace.

The application uses authenticated user context when working with protected data and follows user-scoped data access patterns.

This is especially important for an application that handles personal reflections and other private information.

---

## Google Cloud Secret Manager

The Gemini API credential is not hardcoded into the application source code.

Instead, the backend retrieves the required Gemini API key from Google Cloud Secret Manager at runtime.

The application uses the configured `GEMINI_SECRET_NAME` environment variable to identify the secret. If no custom name is configured, the application uses its configured default secret name.

This approach provides several benefits:

- Sensitive credentials are not stored directly in source code
- API keys are not committed to the public repository
- Credentials can be managed separately from application code
- Cloud Run can access the secret through appropriate Google Cloud permissions
- Secret rotation can be handled without redesigning the application

Only the backend is responsible for retrieving and using the Gemini credential.

---

## Security Approach

Security was considered throughout the project rather than being added only at the end.

The main security principles include:

- Authenticated access using Firebase Authentication
- Server-side authentication verification
- User-scoped Firestore data access
- Isolation between users
- No Gemini API key hardcoded in application source code
- Google Cloud Secret Manager for sensitive credentials
- Server-side Gemini API integration
- Input validation where required
- Secure handling of application errors
- Least-privilege access principles

Because the application handles personal information, preventing cross-user data leakage is an important part of the design.


---

## Application Architecture

The application follows a simple web application architecture.

### Frontend

The frontend provides the user interface for:

- Authentication
- Journaling
- AI-powered reflection
- Goals
- Calendar management
- Analytics
- Insights
- Bookmarks
- Search
- DecisionLens

The frontend communicates with the backend for authenticated application operations.

### Backend

The backend is built using Python and Flask.

It is responsible for:

- Serving the application
- Verifying authenticated users
- Processing application requests
- Accessing Firestore
- Retrieving the Gemini API credential securely
- Communicating with Gemini
- Returning application and AI responses to the user

### Data Layer

Cloud Firestore is used for persistent application data.

Application data is associated with the authenticated user to support user isolation.

### AI Layer

The backend communicates with the Gemini API when the user requests an AI-powered action.

The Gemini API key is retrieved from Google Cloud Secret Manager rather than being stored directly in the frontend or hardcoded in the source code.

### Deployment Layer

The production application is deployed on Google Cloud Run.

Cloud Run provides a managed environment for running the Flask application without managing servers manually.

---

# Using the Application

## Step 1: Open the Application

Open the deployed Personal Gemini Journal application in your browser.

## Step 2: Sign In

Create an account or sign in using the available authentication options.

Authentication connects your activity to your personal workspace.

## Step 3: Create Journal Entries

Navigate to the Journal section.

You can:

1. Create a new journal entry
2. Add a title and your thoughts
3. Save the entry
4. Review previous entries

Your journal information remains associated with your authenticated user account.

## Step 4: Use AI Features

When available, select the relevant AI action to analyse or reflect on your information.

Gemini-powered features can help you:

- Summarise information
- Identify themes
- Generate personal insights
- Highlight useful takeaways
- Think about possible next steps

AI responses are intended to support reflection rather than make decisions automatically.

## Step 5: Manage Goals

Use the Goals section to create and monitor personal goals.

You can review active and completed goals and use the available insights to reflect on your progress.

## Step 6: Use the Calendar

Add and manage important events using the Calendar section.

The calendar helps bring planning and personal reflection into the same workspace.

## Step 7: Explore Insights and Analytics

Use the Insights and Analytics sections to review broader patterns and information from your personal workspace.

## Step 8: Use Search and Bookmarks

Use Search to locate information you have previously created or saved.

Use Bookmarks to keep useful information accessible for later review.

## Step 9: Use DecisionLens

When facing an important decision:

1. Create a new decision
2. Describe the context
3. Add possible options
4. Include relevant constraints or concerns
5. Request AI-assisted analysis

DecisionLens helps structure the available information and support clearer thinking.

The final decision always remains with the user.


---

# Local Development

## Requirements

To run the project locally, you will need:

- Python 3.12 or a compatible Python version
- pip
- Access to the required Google Cloud project
- Firebase project configuration
- Cloud Firestore access
- Gemini API access
- Access to the configured Google Cloud Secret Manager secret

## Install Dependencies

From the project root:

```bash
pip install -r requirements.txt

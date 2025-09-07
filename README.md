# IT Services Chatbot

## Description

This project is an IT Services Chatbot designed to assist users by identifying their IT service needs and collecting their contact information. It integrates with the OpenAI API for natural language understanding and conversation, as well as for extracting user details from the chat. The application then sends an email notification with the inquiry details to the company and a confirmation email to the user.

The frontend is a simple HTML page with JavaScript to interact with the backend.

## Features

*   **Interactive Chatbot:** Engages users to understand their IT service requirements.
*   **OpenAI Integration:**
    *   Uses `gpt-4o-mini` for general chatbot conversation.
    *   Uses `gpt-4o-2024-08-06` with function calling (Chat Completions API) for structured extraction of user details (name, email, phone, company, service, requirements) from the conversation.
*   **Information Collection:** Systematically collects necessary user details.
*   **Automated Email Notifications:**
    *   Sends an internal email to the company with the user's inquiry and full conversation log.
    *   Sends a confirmation email to the user.
*   **Environment-Based Configuration:** Securely manages API keys and email credentials using a `.env` file.

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (which includes npm)
*   An active [OpenAI API Key](https://platform.openai.com/api-keys).
*   A Gmail account configured to send emails programmatically:
    *   2-Step Verification enabled for the Gmail account.
    *   An [App Password](https://support.google.com/accounts/answer/185833) generated for the Gmail account. (Regular Gmail passwords will not work due to security updates by Google).

## Setup and Installation

1.  **Clone the Repository / Download Files:**
    If this project is in a Git repository, clone it:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
    If you have the files directly, ensure they are in a dedicated project folder.

2.  **Install Dependencies:**
    Navigate to the project directory in your terminal and run:
    ```bash
    npm install
    ```
    This will install all the necessary packages defined in `package.json` (e.g., Express, OpenAI, Nodemailer, Cors, Dotenv).

3.  **Create `.env` File:**
    Create a file named `.env` in the root of your project directory. This file will store your environment-specific configurations.

4.  **Configure Environment Variables:**
    Open the `.env` file and add the following variables, replacing the placeholder values with your actual credentials and information:

    ```env
    OPENAI_API_KEY=your_openai_api_key_here
    EMAIL_USER=your_gmail_address_here (e.g., company.inquiries@gmail.com)
    EMAIL_PASS=your_16_character_gmail_app_password_here
    PORT=3001 # Optional: The application will run on this port (defaults to 3001 if not set)
    ```

    *   `OPENAI_API_KEY`: Your secret API key from OpenAI.
    *   `EMAIL_USER`: The Gmail address the application will use to send emails.
    *   `EMAIL_PASS`: The 16-character App Password generated from your Google Account (do NOT use your regular Gmail password).
    *   `PORT`: (Optional) The port number for the server. If not specified, it defaults to 3001.

## Running the Application

1.  **Start the Server:**
    To run the application, execute the following command in your project's root directory:
    ```bash
    npm start
    ```
    This command typically runs `node server.js`. The server will start, and you should see a message like `Server running on port 3001` in your console.

2.  **Development Mode (using Nodemon):**
    If you want the server to automatically restart when you make changes to the files during development, you can use `nodemon` (which is listed in `devDependencies`):
    ```bash
    npm run dev
    ```
    This command usually runs `nodemon server.js`.

3.  **Accessing the Chatbot:**
    Open your web browser and navigate to `http://localhost:PORT` (e.g., `http://localhost:3001` if you are using the default port or the port specified in your `.env` file). You should see the `index.html` page.

## Project Structure

```
.
├── node_modules/      # Dependencies installed by npm
├── public/            # Static frontend files
│   └── index.html   # The main HTML file for the chatbot interface
├── .env               # Environment variables (GITIGNORED - DO NOT COMMIT)
├── .gitignore         # Specifies intentionally untracked files that Git should ignore
├── package-lock.json  # Records exact versions of dependencies
├── package.json       # Project metadata, dependencies, and scripts
├── README.md          # This file
└── server.js          # Main backend server file (Express.js, API endpoints, OpenAI logic, Nodemailer logic)
```

## API Endpoints

The backend server (`server.js`) exposes the following API endpoints:

*   `POST /api/chat`
    *   **Description:** Handles the ongoing conversation with the chatbot.
    *   **Request Body:** `{ "messages": [{ "role": "user", "content": "User message" }, ...] }`
    *   **Response:** `{ "message": "Chatbot response" }`
*   `POST /api/send-inquiry`
    *   **Description:** Triggered when the chatbot conversation indicates completion of information gathering. This endpoint uses the OpenAI Chat Completions API with a forced tool call to extract structured details from the conversation history and then sends the internal and user confirmation emails.
    *   **Request Body:** `{ "conversation": [{ "role": "user/assistant", "content": "..." }, ...], "userDetails": { ... } }` (Note: `userDetails` from the client might be used as a fallback if AI extraction encounters issues, but primary extraction is from `conversation`).
    *   **Response:** JSON object containing status of email sending operations and, if successful, details of the email sent to the customer (e.g., `{ "message": "...", "internalEmailSentStatus": "Sent", "userEmailSentStatus": "Sent", "customerEmailDetails": { ... } }`).

## Troubleshooting

*   **Email Sending Failures ("Invalid login", "535 Authentication credentials invalid"):**
    *   Ensure `EMAIL_USER` and `EMAIL_PASS` in your `.env` file are correct.
    *   Crucially, `EMAIL_PASS` **must** be a 16-character App Password generated from your Google Account security settings. Your regular Gmail password will not work.
    *   Make sure 2-Step Verification is enabled for the `EMAIL_USER` Gmail account, as it's a prerequisite for generating App Passwords.
    *   Check if there are any security alerts on the `EMAIL_USER` Gmail account that might be blocking sign-in attempts from a new app.
*   **OpenAI API Errors (e.g., "Incorrect API key provided", "model_not_found", "PermissionDeniedError"):**
    *   Verify that `OPENAI_API_KEY` in your `.env` file is correct and active.
    *   Ensure your OpenAI account has sufficient credits or is on an appropriate plan for the models being used.
    *   The application is configured to use `gpt-4o-mini` for chat and can use `gpt-4o-2024-08-06` for detail extraction. If you encounter errors related to `gpt-4o-2024-08-06` (like permission denied), ensure your project has access to this specific model. If not, you may need to configure `server.js` to use `gpt-4o-mini` for extraction as well.
*   **Application Not Starting:**
    *   Make sure all dependencies are installed (`npm install`).
    *   Check for typos in your `.env` file or `server.js`.
    *   Ensure the `PORT` is not already in use by another application.

---
This README provides a comprehensive guide to understanding, setting up, and running the IT Services Chatbot. 
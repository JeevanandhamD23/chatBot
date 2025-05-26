require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// DEBUG: Check if email credentials are loaded
console.log('DEBUG: EMAIL_USER from env:', process.env.EMAIL_USER);
console.log('DEBUG: EMAIL_PASS from env is defined:', !!process.env.EMAIL_PASS); // Log true/false if pass is defined

// Email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// System prompt for the chatbot
const systemPrompt = `You are an IT Services Assistant chatbot for a professional IT company. Your primary goal is to identify the user's IT service needs and collect their contact information for a follow-up by our team.

Conversation Flow:
1.  **Service Identification:**
    *   Greet the user and ask what IT service they are interested in (e.g., Cloud Solutions, Cybersecurity, Network Setup, Software Development, IT Consulting, or other IT needs).
    *   If the user asks a question about a service, provide a brief, high-level answer and then steer back to identifying their primary need.

2.  **Information Collection (Strictly One by One):**
    *   Once a service is identified, or if they directly want to inquire, inform them you need to collect a few details to help the team assist them.
    *   Ask for the following details SEQUENTIALLY, **ONE AT A TIME**. You MUST receive a response from the user for the current piece of information and acknowledge it (e.g., "Thank you, [Name].") BEFORE asking for the next piece of information. DO NOT list all questions at once or ask for multiple items in a single turn.
        a.  Full Name
        b.  Email Address (for contact and a confirmation email)
        c.  Phone Number
        d.  Company Name (clearly state this is optional)
        e.  A brief description of their specific requirements for the chosen IT service.
    *   Example of sequential questioning:
        Bot: "To start, could I please get your full name?"
        User: "John Doe."
        Bot: "Thank you, John. Next, what is your email address?"
        User: "john.doe@example.com"
        Bot: "Great. And your phone number?"
        (and so on)

3.  **Handling User Queries during Collection:**
    *   If the user asks a question directly related to the IT service or the information being collected, answer it concisely. Then, politely return to requesting the *current* piece of information you were asking for. For example, if you asked for email and they ask a question, answer it, then say, "Thanks for that clarification. Now, regarding your email address?"

4.  **STRICTLY AVOID UNRELATED TOPICS:**
    *   If the user asks about anything not directly related to the IT services offered by the company or the information collection process, you MUST politely and firmly state that you can only assist with IT service inquiries and gathering details for the team.
    *   Example response: "My apologies, I can only assist with inquiries about our IT services and collecting the necessary details for our team to follow up. Were you interested in discussing an IT service, or shall we continue with the information I was asking for?"
    *   After this, re-ask the last pending question or ask how you can help with their IT service needs. Do NOT engage in unrelated conversation.

5.  **Confirmation and Next Steps:**
    *   Once all required details (Name, Email, Phone, Requirements) are collected (Company is optional), summarize the collected information clearly.
    *   Example: "Excellent! Just to confirm: You're interested in [Service], your name is [Name], email is [Email], phone is [Phone], company is [Company/Not provided], and your requirements are: [Requirements]. Is all this information correct?"
    *   If the user confirms, inform them that the team will review their information and contact them. This message MUST include the phrase "CONFIRMATION_COMPLETE" at the end. Example: "Perfect! Our team will review your details and contact you shortly. Thank you for reaching out! CONFIRMATION_COMPLETE"
    *   If the user wants to correct something, acknowledge it, ask for the correction for that specific piece of information, and once corrected, you can re-confirm if necessary or proceed.

General Guidelines:
-   Maintain a friendly, professional, and helpful tone.
-   Keep responses concise and focused on the task.
-   Do not provide in-depth technical advice; your role is information gathering.
-   If the user seems hesitant to provide information, gently explain it's to help the team assist them effectively.
-   Use the conversation history (user's previous messages) to understand what has already been provided.
`;

// Define the JSON schema for customer details (tool for Gemini)
const customerDetailsSchema = {
    type: "OBJECT", // Changed from "object" to "OBJECT" for Gemini
    properties: {
        name: { type: "STRING", description: "Customer's full name as stated in the conversation." }, // Changed "string" to "STRING"
        email: { type: "STRING", description: "Customer's email address as stated in the conversation." }, // Changed "string" to "STRING"
        phone: { type: "STRING", description: "Customer's phone number as stated in the conversation." }, // Changed "string" to "STRING"
        company: { type: "STRING", description: "Customer's company name (optional). If not mentioned, this can be omitted or explicitly stated as 'Not provided'." }, // Changed "string" to "STRING"
        service: { type: "STRING", description: "The IT service the customer is interested in (e.g., Cloud Solutions, Cybersecurity, Network Setup, Software Development, IT Consulting) as identified from the conversation." }, // Changed "string" to "STRING"
        requirements: { type: "STRING", description: "A brief description of the customer's specific requirements for the chosen IT service, as stated in the conversation." } // Changed "string" to "STRING"
    },
    required: ["name", "email", "phone", "service", "requirements"]
};

const tools = [
  {
    functionDeclarations: [
      {
        name: "extract_customer_details",
        description: "Extracts customer contact information, service interest, and requirements from the provided conversation history.",
        parameters: customerDetailsSchema,
      },
    ],
  },
];

// API endpoint for chat
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body; // messages should be an array of {role: "user" or "model", parts: [{text: "message content"}]}

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-lite",
            systemInstruction: systemPrompt,
        });

        const chat = model.startChat({
            history: messages.slice(0, -1).map(msg => ({ // Exclude the last message for the current turn
                role: msg.role === 'assistant' ? 'model' : msg.role, // map assistant to model
                parts: [{ text: msg.content || (msg.parts && msg.parts[0] && msg.parts[0].text) || "" }]
            })),
            generationConfig: {
                maxOutputTokens: 150,
                temperature: 0.7,
            },
             safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ]
        });
        
        const lastMessage = messages[messages.length - 1];
        const userMessageContent = lastMessage.content || (lastMessage.parts && lastMessage.parts[0] && lastMessage.parts[0].text) || "";

        const result = await chat.sendMessage(userMessageContent);
        const response = result.response;
        const text = response.text();
        
        res.json({ message: text });

    } catch (error) {
        console.error('Error in /api/chat:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.promptFeedback);
        }
        res.status(500).json({ error: 'An error occurred while processing your request', details: error.message });
    }
});

// API endpoint for sending email notifications
app.post('/api/send-inquiry', async (req, res) => {
    try {
        const { userDetails: initialUserDetails, conversation } = req.body; 

        if (!conversation || conversation.length === 0) {
            return res.status(400).json({ error: "Conversation history is required for detail extraction." });
        }
        
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite", // Using Gemini for extraction as well
            tools: tools
        });

        const extractionSystemPrompt = "You are an expert data extraction assistant. Your task is to analyze the following conversation between an IT services chatbot and a user. Extract the user's full name, email address, phone number, company name (if provided), the IT service they are interested in, and their specific requirements. Use the 'extract_customer_details' function tool to return this information. If the user did not provide a company name, you can indicate 'Not provided' for the company field. Ensure all other required fields are accurately filled based on the conversation. The conversation is provided below.";

        // Convert conversation to Gemini format
        const geminiConversationHistory = [
            { role: "user", parts: [{ text: extractionSystemPrompt }] },
            { role: "model", parts: [{ text: "Okay, I understand. Please provide the conversation."}] } // Priming message
        ];

        conversation.forEach(msg => {
            geminiConversationHistory.push({
                role: msg.role === 'assistant' ? 'model' : msg.role,
                parts: [{ text: msg.content || (msg.parts && msg.parts[0] && msg.parts[0].text) || "" }]
            });
        });
         geminiConversationHistory.push( { role: "user", parts: [{text: "Based on the conversation above, please extract the customer details using the function call."}]});


        const chat = model.startChat({
            history: geminiConversationHistory,
            generationConfig: {
                temperature: 0.2, // Lower temperature for more deterministic extraction
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ]
        });

        const result = await chat.sendMessage("Extract the details."); // Send a final message to trigger tool use.

        let extractedDataFromAI = {};
        const functionCalls = result.response.functionCalls();

        if (functionCalls && functionCalls.length > 0 && functionCalls[0].name === 'extract_customer_details') {
             extractedDataFromAI = functionCalls[0].args;
        } else {
            console.error("Gemini did not call the expected function for detail extraction. Response:", JSON.stringify(result.response, null, 2));
            // Fallback or error handling if Gemini doesn't make the function call
            // For now, we'll try to parse the text content if available, though this is less reliable
            const textContent = result.response.text();
            if (textContent) {
                try {
                    // This is a very brittle fallback. Ideally, the function call should work.
                    // We are assuming the text might contain a JSON-like string.
                    const potentialJson = textContent.substring(textContent.indexOf('{'), textContent.lastIndexOf('}') + 1);
                    if (potentialJson) {
                        extractedDataFromAI = JSON.parse(potentialJson);
                        console.warn("Warning: Gemini did not use function calling. Parsed details from text response as a fallback:", extractedDataFromAI);
                    } else {
                         throw new Error("No function call and no parsable JSON in text response.");
                    }
                } catch (parseError) {
                     console.error("Error parsing text content as JSON fallback:", parseError);
                     throw new Error("Failed to extract details using Gemini. The expected function was not called, and fallback parsing failed.");
                }
            } else {
                 throw new Error("Failed to extract details using Gemini. The expected function was not called, and no text response was available for fallback.");
            }
        }
        
        const finalUserDetails = {
            name: extractedDataFromAI.name || initialUserDetails?.name || 'Not provided by AI',
            email: extractedDataFromAI.email || initialUserDetails?.email || 'Not provided by AI',
            phone: extractedDataFromAI.phone || initialUserDetails?.phone || 'Not provided by AI',
            company: extractedDataFromAI.company || initialUserDetails?.company || 'Not provided',
            service: extractedDataFromAI.service || initialUserDetails?.service || 'Not specified by AI',
            requirements: extractedDataFromAI.requirements || initialUserDetails?.requirements || 'Not specified by AI'
        };

        // Email sending logic (remains the same)
        // 1. Send internal notification email
        const internalMailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `New IT Inquiry: ${finalUserDetails.name} - ${finalUserDetails.service}`,
            html: `
                <h2>New IT Services Inquiry</h2>
                <h3>User Details (Extracted by AI):</h3>
                <ul>
                    <li><strong>Name:</strong> ${finalUserDetails.name}</li>
                    <li><strong>Email:</strong> ${finalUserDetails.email}</li>
                    <li><strong>Phone:</strong> ${finalUserDetails.phone}</li>
                    <li><strong>Company:</strong> ${finalUserDetails.company}</li>
                    <li><strong>Service Inquired:</strong> ${finalUserDetails.service}</li>
                    <li><strong>Requirements:</strong> ${finalUserDetails.requirements}</li>
                </ul>
                <hr>
                <h3>Full Conversation Log (for verification):</h3>
                <pre>${JSON.stringify(conversation, null, 2)}</pre>
            `
        };

        let internalEmailSent = false;
        try {
            await transporter.sendMail(internalMailOptions);
            console.log('Internal inquiry email sent.');
            internalEmailSent = true;
        } catch (error) {
            console.error('Error sending internal email:', error);
        }

        let userEmailSent = false;
        let customerEmailDetailsForResponse = null;

        if (finalUserDetails.email && finalUserDetails.email.includes('@') && finalUserDetails.email !== 'Not provided by AI') {
            const userMailOptions = {
                from: process.env.EMAIL_USER,
                to: finalUserDetails.email,
                subject: `Thank You for Your Inquiry - ${finalUserDetails.service}`,
                html: `
                    <p>Dear ${finalUserDetails.name || 'Valued Customer'},</p>
                    <p>Thanks for visiting our IT services and expressing interest in <strong>${finalUserDetails.service || 'our offerings'}</strong>.</p>
                    <p>Our team will review your details and contact you shortly.</p>
                    <p>Best regards,</p>
                    <p>The IT Services Team</p>
                `
            };
            customerEmailDetailsForResponse = { ...userMailOptions };

            try {
                await transporter.sendMail(userMailOptions);
                console.log('User confirmation email sent to:', finalUserDetails.email);
                userEmailSent = true;
                return res.json({ 
                    message: 'Inquiry submitted and confirmation email sent.', 
                    internalEmailSentStatus: internalEmailSent ? 'Sent' : 'Failed',
                    userEmailSentStatus: userEmailSent ? 'Sent' : 'Failed',
                    customerEmailDetails: customerEmailDetailsForResponse
                });
            } catch (emailError) {
                console.error('Nodemailer error sending email to user:', emailError);
                return res.status(500).json({ 
                    error: 'Inquiry submitted, but there was an issue sending your confirmation email.',
                    internalEmailSentStatus: internalEmailSent ? 'Sent' : 'Failed',
                    userEmailSentStatus: 'Failed',
                    detail: emailError.message,
                    customerEmailDetails: null
                });
            }
        } else {
            console.log('User email not provided by AI, invalid, or placeholder; skipping user confirmation email. Extracted email:', finalUserDetails.email);
            return res.json({ 
                message: `Inquiry submitted. Internal notification ${internalEmailSent ? 'sent' : 'failed'}. User confirmation email not sent as email was invalid or not provided by AI.`,
                internalEmailSentStatus: internalEmailSent ? 'Sent' : 'Failed',
                userEmailSentStatus: 'Not Attempted (Invalid Email)',
                extractedCustomerEmail: finalUserDetails.email,
                customerEmailDetails: null
            });
        }

    } catch (error) {
        console.error('General error in /api/send-inquiry (Gemini):', error.message);
        if (error.code === 'EAUTH' || error.command === 'AUTH' || error.responseCode === 535) {
            console.error('Nodemailer authentication error: Check EMAIL_USER and EMAIL_PASS in .env.');
            return res.status(500).json({ error: 'Email server authentication failed. Please contact support.' });
        } else if (error.message && (error.message.includes("Gemini") || error.type === 'invalid_request_error')) {
             return res.status(500).json({ error: 'Failed to process inquiry due to an issue with the Gemini service.', detail: error.message });
        } else {
            return res.status(500).json({ error: 'Failed to process inquiry and send email notifications due to an unexpected server error.' });
        }
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 
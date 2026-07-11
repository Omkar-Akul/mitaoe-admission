# MIT Academy of Engineering — Official Website

A complete professional college website for **MIT Academy of Engineering, Pune** with an integrated **watsonx Orchestrate AI Admission Counsellor** chatbot.

## Features

- Full college website (Hero, About, Programs, Admissions, Faculty, Campus, Contact)
- Floating AI chatbot powered by **IBM watsonx Orchestrate**
- Smart fallback responses when AI is offline
- Fully responsive design (mobile + desktop)
- Node.js proxy server to handle CORS and IBM IAM token exchange

## Project Structure

```
mit-academy-engineering/
├── index.html      # Complete college website with embedded chatbot UI
└── server.js       # Node.js proxy server for watsonx Orchestrate API
```

## Prerequisites

- [Node.js](https://nodejs.org) v16 or higher
- An IBM Cloud account with watsonx Orchestrate instance
- An IBM Cloud API key with access to the Orchestrate instance

## Setup & Run

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/mit-academy-engineering.git
cd mit-academy-engineering
```

### 2. Configure your credentials
Open `server.js` and update these values:
```js
const WATSON_BASE    = "https://api.au-syd.watson-orchestrate.cloud.ibm.com/instances/YOUR_INSTANCE_ID";
const WATSON_API_KEY = "YOUR_IBM_CLOUD_API_KEY";
```

### 3. Start the server
```bash
node server.js
```

### 4. Open in browser
```
http://localhost:3000
```

## Chatbot Integration

The chatbot connects to **IBM watsonx Orchestrate** via a local Node.js proxy that:
1. Exchanges your API key for an IBM IAM Bearer token
2. Forwards chat messages to the watsonx Orchestrate `/v1/conversations` endpoint
3. Returns the AI agent's response to the frontend

If the API is unavailable, the chatbot automatically falls back to smart pre-programmed responses covering:
- Admission eligibility & process
- Fee structure & scholarships
- MHT-CET cut-off ranks
- Hostel facilities
- Placement statistics

## Tech Stack

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Backend:** Node.js (built-in modules only — no npm install needed)
- **AI:** IBM watsonx Orchestrate (au-syd region)
- **Auth:** IBM Cloud IAM token exchange

## License

MIT License — feel free to use and modify for your institution.

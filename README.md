# Food Recommendation App - Powered by Neo4j and LLMs 

Thisis a **demo food delivery web application** showcasing an **LLM-augmented recommendation engine** built with Vue.js, LLMs, Neo4j graph database, and Resend Email service.

> [!CAUTION]
> **This is a FRONTEND DEMO for educational purposes only!**
> 
> In this demo, API keys and credentials are exposed in frontend api calls. **NEVER do this in production.** In a real-world application, all sensitive operations (database queries, LLM API calls, email sending) should be handled by a **secure backend server**.

---

##  Features

- Browse restaurants and food items
- Shopping cart functionality
- **AI-Powered Personalized Recommendations** using LLMs, Neo4j graph relationships and Resend
- **AI-Generated User Summaries** based on preferences

---

## Tech Stack

- **Frontend:** Vue.js 3, Bootstrap 5
- **Database:** Neo4j Aura (Graph Database)
- **AI/LLM:** Token Factory API (Kimi-K2-Instruct model)
- **Email:** Resend API
- **Build Tool:** Vite

---

##  Installation

### 1. Clone the repository

```bash
git clone https://github.com/shivaycb/recommendations-system-for-fooddel
cd recommendations-system-for-fooddel
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment file

Create a `.env` file in the **root directory** of the project with the following variables:

```env
VITE_NEO4J_USERNAME="insert your neo4j username here"
VITE_NEO4J_URI="insert your neo4j uri here"
VITE_NEO4J_PASSWORD="insert your neo4j password here"
VITE_NEBIUS_API_KEY="insert your LLM api key here"
VITE_RESEND_API_KEY="insert your resend api key here"
VITE_KEYWORDS_AI_API_KEY="insert your keywords.ai api key here"

VITE_NEBIUS_MODEL_NAME="openai/gpt-oss-120b"
```

---

##  Getting Your API Keys

### Neo4j Aura Database (Free)

1. Go to [Neo4j Aura](https://neo4j.com/cloud/aura-free/)
2. Sign up for a **free account**
3. Create a new **AuraDB Free** instance
4. Once created, obtain the following credentials:
   - **URI** (e.g., `neo4j+s://xxxxxxxx.databases.neo4j.io`)
   - **Username** (typically `neo4j`)
   - **Password** (generated for you - save this!)

### Token Factory (LLM API)

1. Go to [Token Factory](https://tokenfactory.nebius.com/)
2. Create an account and Generate an API key
3. Copy the key to your `.env` file

### Resend (Email API)

1. Go to [Resend](https://resend.com/)
2. Sign up for an account and obtain an API key
3. Copy the key to your `.env` file

### Keywords.ai (For LLM token Logging and Telemetry)

1. Go to [Keywords.ai](https://keywords.ai/)
2. Sign up for an account and obtain an API key
3. Copy the key to your `.env` file

> [!IMPORTANT]
> **Resend Email Limitation (Free Tier / No Custom Domain):**
> 
> Since this demo uses Resend's default domain (`@resend.dev`) and not a custom verified domain, **you can only send emails to the email address you used to sign up for Resend**.
> 
> **Example:** If you created your Resend account with `jack@gmail.com`, then when you register an account in Food Recommendation App, you **must use `jack@gmail.com`** as your email address. This is the only address that will receive:
> - Post-purchase confirmation emails
> - Promotional emails (via "Send Promo Email" in the navbar)
> 
> ⚠️ **Check your spam folder** if you don't see the emails in your inbox!

---

## First-Time Setup

Before running the app for the first time, you need to initialize the Neo4j database with data from the catalog:

```bash
node intialize_neo4j_db.js
```

This script will:
- Load restaurants, foods, tags, and menu data from `src/data/catalog.json`
- Create necessary constraints and indexes for fast graph lookups

### Running the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

---

## How the Recommendation Engine Works

Food Recommendation App uses a **graph-based recommendation system** powered by Neo4j. Here's how it works:

### Graph Schema
<img width="380" height="343" alt="n1" src="https://github.com/user-attachments/assets/73a7fb2c-11d9-48a0-b953-22f4c8e5b5c1" />


### Relationships Explained

| Relationship | Description |
|-------------|-------------|
| `[:HAS_FOOD]` | Restaurant has many food items, multiple restaurants can also have the same food |
| `[:HAS_TAG]` | Food has many tags (e.g., "spicy", "italian") |
| `[:ADDED_TO_CART]` | User added a food to their cart |
| `[:PURCHASED]` | User completed a purchase of the food |
| `[:SHOWN_INTEREST]` | User has shown interest in a tag (count tracks strength), these are the tags of foods they carted / purchased |
| `[:SIMILAR_TO]` | Foods share significant tag overlap (≥40% similarity) |

### Similarity Calculation

Two foods are linked with `[:SIMILAR_TO]` when their tag similarity exceeds **40%**:

```
Similarity = (Shared Tags) / max(Tags of Food A, Tags of Food B)
```

### Graph Recommendation Algorithm

When generating recommendations (e.g., for the "For You" section):

1. **We collect candidate foods:** Foods the user has added to cart or purchased, plus similar foods
2. **We score each food based on:**
   - **Direct interaction boost:** Purchased items get 1.2x, cart items get 1.0x
   - **Interest score:** Sum of `SHOWN_INTEREST` counts for matching tags
   - **Similarity score:** Weighted by the `[:SIMILAR_TO]` relationship strength
3. **We then return the top-K highest-scoring foods**

### LLM Integration

The recommendation data is also fed to the LLM when:
- **Crafting promotional emails** - Personalized based on user preferences
- **Generating post-purchase emails** - Recommending similar foods
- **Creating user summaries** - Describing user taste preferences

---

##  Security Warnings

> [!WARNING]
> **This demo is NOT production-ready!**

### Issues with Current Implementation:

1. **Exposed API Keys:** All API keys are in frontend environment variables and visible in browser dev tools
2. **Direct Database Access:** Neo4j credentials are exposed; queries run from the browser
3. **Password Storage:** User passwords are stored in localStorage (completely insecure)
4. **No Server-Side Validation:** All logic runs client-side

### Why We Use Vite Proxy for Resend:

Browsers enforce **CORS (Cross-Origin Resource Sharing)** security policies. Making requests directly to `api.resend.com` from the browser would be blocked.

In this demo, we use Vite's development server to **proxy requests** to Resend:

```javascript
// vite.config.js
server: {
  proxy: {
    '/resend-api': {
      target: 'https://api.resend.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/resend-api/, '')
    }
  }
}
```

> [!CAUTION]
> **NEVER use this approach in production!** A proper backend server handles email sending from the server-side, where CORS restrictions don't apply and API keys remain secret.

---

## Production Recommendations

For a real-world deployment, you should:

1. **Build a Backend Server** (Node.js/Express, Python/FastAPI, etc.)
   - Handle all Neo4j database queries
   - Make LLM API calls server-side
   - Send emails through Resend server-side
   - Implement proper authentication (JWT, sessions)

2. **Secure Credentials**
   - Store API keys in server environment variables only
   - Use proper password hashing (bcrypt, argon2)
   - Implement secure session management

3. **Set Up Custom Domain for Resend**
   - Verify your domain with Resend
   - Send emails from your own domain (e.g., `noreply@yourdomain.com`)
   - No more email recipient restrictions!

---

## Screenshots

<img width="944" height="437" alt="n2" src="https://github.com/user-attachments/assets/bdc6ed16-50b3-45b1-a7ce-5682e117f6ba" />
<img width="941" height="440" alt="n3" src="https://github.com/user-attachments/assets/c5bbe6d5-4d5a-41b5-a7b1-4c2ace60380c" />
<img width="798" height="353" alt="n4" src="https://github.com/user-attachments/assets/bc7a51e3-ed62-4635-a309-d712162145a5" />


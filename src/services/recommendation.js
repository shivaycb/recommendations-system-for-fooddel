import neo4j from 'neo4j-driver'
import OpenAI from "openai"
import { z } from "zod"
import { zodResponseFormat } from "openai/helpers/zod"

const NEO4J_URI = import.meta.env.VITE_NEO4J_URI
const NEO4J_USERNAME = import.meta.env.VITE_NEO4J_USERNAME
const NEO4J_PASSWORD = import.meta.env.VITE_NEO4J_PASSWORD
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY
const NEBIUS_API_KEY = import.meta.env.VITE_NEBIUS_API_KEY
const NEBIUS_MODEL_NAME = import.meta.env.VITE_NEBIUS_MODEL_NAME
const KEYWORDS_AI_API_KEY = import.meta.env.VITE_KEYWORDS_AI_API_KEY

const client = new OpenAI({
  apiKey: NEBIUS_API_KEY,
  baseURL: 'https://api.tokenfactory.nebius.com/v1/',
  dangerouslyAllowBrowser: true
});


// Create driver instance (singleton)
const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
  { disableLosslessIntegers: true } // Return numbers as JS numbers
)

// Optional: verify connection on initialization
driver.getServerInfo()
  .then(info => console.log('Neo4j connected:', info))
  .catch(err => console.error('Neo4j connection failed:', err))


// For Telemetry
async function send_log_to_keywords_ai(modelName, userMessage, completionMessage, promptTokens, completionTokens, llmTask, userId, userName) {

  const url = 'https://api.keywordsai.co/api/request-logs/create/';
  const headers = {
    'Authorization': `Bearer ${KEYWORDS_AI_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const payload = {
    model: modelName,
    prompt_messages: [
      {
        role: "user",
        content: userMessage
      }
    ],
    completion_message: {
      role: "assistant",
      content: completionMessage
    },

    // --- Layer 2: Telemetry ---
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,

    // --- Layer 3: Metadata ---
    metadata: {
      language: "en",
      feature: llmTask
    },
    customer_params: {
      customer_identifier: userId,
      name: userName
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Keywords AI response:', data);
  } catch (error) {
    console.error('Error sending log to Keywords AI:', error);
  }
}

async function send_email_to_user_with_resend(userEmail, emailFrom, emailSubject, emailBody) {
  
  // Use fetch with the local proxy path '/resend-api' to bypass CORS
  // The Vite proxy will forward this to https://api.resend.com/emails

  const resendResponse = await fetch('/resend-api/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: emailFrom,
      to: userEmail,
      subject: emailSubject,
      html: emailBody
    })
  });

  if (!resendResponse.ok) {
    const err = await resendResponse.json();
    console.error('Resend API Error:', err);
    throw new Error(`Failed to send email: ${err.message || resendResponse.statusText}`);
  }
}

// Email build helper methods
function renderFoodItem(food) {
  return `
    <div style="display:flex;align-items:center;margin-bottom:12px;">
      <img src="${food.imageUrl}" 
           alt="${food.name}" 
           style="width:60px;height:60px;border-radius:6px;object-fit:cover;margin-right:12px;" />
      <span style="font-size:15px;">${food.name}</span>
    </div>
  `;
}

function buildEmail(template, buildData, ctaLink) {
  const purchasedFoodsHTML = buildData.purchased_foods
    .map(renderFoodItem)
    .join("");

  const recommendedFoodsHTML = buildData.recommended_foods
    .map(renderFoodItem)
    .join("");

  return template
    .replace("{{greeting_text}}", buildData.greeting_text)
    .replace("{{main_message}}", buildData.main_message)
    .replace("{{purchased_foods_section}}", purchasedFoodsHTML)
    .replace("{{recommended_foods_section}}", recommendedFoodsHTML)
    .replace("{{cta_text}}", buildData.cta_text)
    .replace("{{cta_link}}", ctaLink)
    .replace("{{footer_note}}", buildData.footer_note);
}


export async function neo4j_create_user(userId) {
  const session = driver.session()
  var cypher = `
    CREATE (u:User {id: $userId})
    `
  await session.run(cypher, { userId });
  await session.close();
}

export async function neo4j_clicked_food_description(foodId, userId) {
  const session = driver.session()
  var cypher = `
    MATCH (u:User {id: $userId})
    MATCH (f:Food {id: $foodId})

    WITH u, f
    MATCH (f)-[:HAS_TAG]->(t:Tag)

    MERGE (u)-[r:SHOWN_INTEREST]->(t)
    ON CREATE SET r.count = 0.05
    ON MATCH SET r.count = r.count + 0.05
    `
  await session.run(cypher, { userId, foodId });
  await session.close();
}

export async function neo4j_get_similar_cart_food(foodIds) {
  const session = driver.session()
  var cypher = `
    UNWIND $foodIds AS foodId
    MATCH (f:Food {id: foodId})-[r:SIMILAR_TO]-(f2:Food)
    WHERE NOT f2.id IN $foodIds
    WITH f2, max(r.score) AS maxScore
    RETURN f2.id AS id, f2.name AS name
    ORDER BY maxScore DESC
    LIMIT 6
  `
  const results = await session.run(cypher, { foodIds });
  await session.close();

  return results.records.map(record => ({
    id: record.get('id'),
    name: record.get('name'),
  }));
}


export async function neo4j_added_to_cart(foodId, userId) {
  const session = driver.session()
  var cypher = `
    MATCH (u:User {id: $userId})
    MATCH (f:Food {id: $foodId})

    MERGE (u)-[added_rel:ADDED_TO_CART]->(f)
    SET added_rel.latest_datetime = datetime()

    WITH u, f
    MATCH (f)-[:HAS_TAG]->(t:Tag)

    MERGE (u)-[r:SHOWN_INTEREST]->(t)
    ON CREATE SET r.count = 0.5
    ON MATCH SET r.count = r.count + 0.5
    `
  await session.run(cypher, { userId, foodId });
  await session.close();
}

export async function neo4j_purchased(purchasedFoodIds, userId) {
  const session = driver.session()
  var cypher = `
    MATCH (u:User {id: $userId})
    
    UNWIND $purchasedFoodIds AS foodId
    MATCH (f:Food {id: foodId})

    MERGE (u)-[purchased_rel:PURCHASED]->(f)
    SET purchased_rel.latest_datetime = datetime()

    WITH u, f
    MATCH (f)-[:HAS_TAG]->(t:Tag)

    MERGE (u)-[r:SHOWN_INTEREST]->(t)
    ON CREATE SET r.count = 1
    ON MATCH SET r.count = r.count + 1
    `
  await session.run(cypher, { userId, purchasedFoodIds });
  await session.close();
}

export async function neo4j_get_user_preferences(userId, topkfoods = 20, topktags = 10) {
  // Get top foods that fit the user's preferences
  const topkfoodsObj = await neo4j_get_topk_recommendations(userId, topkfoods)

  // Get top tags the user has shown interest in
  const cypher = `
    MATCH (u:User {id: $userId})-[si:SHOWN_INTEREST]->(t:Tag)
    RETURN
      t.name AS tag,
      sum(si.count) AS strength
    ORDER BY strength DESC
    LIMIT toInteger($topktags)
  `

  const results = await driver.executeQuery(
    cypher,
    { userId, topktags }
  )

  const topktagsObj = results.records.map(record => ({
    name: record.get('tag'),
    total_interest_shown: record.get('strength'),
  }))

  return {
    topkfoods: topkfoodsObj,
    topktags: topktagsObj,
  }
}

export async function neo4j_get_topk_recommendations(userId, topk) {
  const session = driver.session()
  var cypher = `
    CALL {
        /* Score For Directly purchased or added to cart Food */
        MATCH (u:User {id: $userId})-[uf]->(f:Food)
        OPTIONAL MATCH (u)-[si:SHOWN_INTEREST]->(t:Tag)<-[:HAS_TAG]-(f)

        WITH f, CASE type(uf)
          WHEN 'PURCHASED' THEN 1.5
          WHEN 'ADDED_TO_CART' THEN 1
          ELSE 0
        END AS directScore, sum(si.count) AS interestScore

        RETURN f AS food, directScore * interestScore AS score

        UNION

        /* Score For Similar Foods to those that have been purchased or added to cart */
        MATCH (u:User {id: $userId})-[uf]->(f1:Food)

        WITH f1, CASE type(uf)
          WHEN 'PURCHASED' THEN 1.5
          WHEN 'ADDED_TO_CART' THEN 1
          ELSE 0
        END AS baseWeight

        MATCH (f1)-[sim: SIMILAR_TO]-(f2: Food)
        OPTIONAL MATCH (u)-[si: SHOWN_INTEREST]->(t: Tag)<-[:HAS_TAG]-(f2)

        WITH f2 AS food, avg(baseWeight * sim.score) AS weightedSimilarityScore, sum(si.count) AS interestScore
        RETURN food, weightedSimilarityScore * interestScore AS score
    }
    WITH food, sum(score) AS finalScore
    RETURN food.id, food.name, food.imageUrl, finalScore
    ORDER BY finalScore DESC
    LIMIT toInteger($topk)
    `
  try {
    const results = await session.run(cypher, { userId, topk });
    const output = results.records.map(record => ({
      id: record.get('food.id'),
      name: record.get('food.name'),
      imageUrl: record.get('food.imageUrl'),
      score: record.get('finalScore')
    }));
    return output;

  } finally {
    await session.close();
  }
}

const EmailObj = z.object({
  email_subject: z.string(),
  greeting_text: z.string(),
  main_message: z.string(),
  recommended_foods: z.array(z.object({
    name: z.string(),
    imageUrl: z.string()
  })),
  cta_text: z.string(),
  footer_note: z.string()
});


export async function craft_and_send_promo_email(userId, userName, userEmail, call_to_action_backlink = window.location.origin) {
  const userPreferenceSummary = await neo4j_get_user_preferences(userId)

  var prompt = `
  You are a marketing content assistant for Food Recommendation App, a food delivery app.

  Current date and time:
  ${new Date().toLocaleString()}

  CONTEXT:
  You are generating content for a personalized promotional email.
  This email is NOT tied to a recent purchase.

  USER DATA YOU CAN USE:
  Top foods based on user preferences (ordered by strength):
  ${JSON.stringify(userPreferenceSummary.topkfoods, null, 2)}

  Top tags the user has shown interest in:
  ${JSON.stringify(userPreferenceSummary.topktags, null, 2)}

  GOAL:
  Create warm, appetizing, and personal email content that inspires the user (${userName}) to explore food they already love.

  TONE & BRAND:
  - Brand: Food Recommendation App
  - Tone: friendly, cozy, food-loving, never pushy
  - Emojis allowed sparingly (1–3 max)
  - Do NOT sound salesy or promotional
  - Do NOT mention scores explicitly

  STRICT RULES:
  - DO NOT invent foods or images
  - ONLY recommend foods from the provided preference data
  - Keep text concise and natural
  - Output MUST be valid JSON only

  CONTENT REQUIREMENTS:
  - Personalize copy using the user’s name where natural
  - Recommend 4–6 foods
  - CTA should feel inviting, not urgent

  OUTPUT FORMAT (STRICT JSON):
  {
    "email_subject": "string",
    "greeting_text": "string",
    "main_message": "string",
    "recommended_foods": [
      {
        "name": "string",
        "imageUrl": "string"
      }
    ],
    "cta_text": "string",
    "footer_note": "string"
  }
  `

  const promo_email_template = `
  <div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#000000;border:1px solid #e5e7eb;">
    
    <!-- Header -->
    <div style="background:#0A66FF;padding:20px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;">Food Recommendation App</h1>
    </div>

    <!-- Body -->
    <div style="padding:24px;">
      
      <!-- Greeting -->
      <p style="font-size:16px;margin:0 0 12px 0;">
        {{greeting_text}}
      </p>

      <!-- Main message -->
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">
        {{main_message}}
      </p>

      <!-- Recommended foods -->
      <h3 style="font-size:18px;margin:24px 0 12px 0;">
        Handpicked for you 🍽️
      </h3>
      <div>
        {{recommended_foods_section}}
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0;">
        <a href="{{cta_link}}"
          style="background:#0A66FF;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:6px;display:inline-block;font-size:15px;">
          {{cta_text}}
        </a>
      </div>

      <!-- Footer note -->
      <p style="font-size:13px;color:#555555;text-align:center;margin-top:20px;">
        {{footer_note}}
      </p>

    </div>
  </div>

  `

  const response = await client.chat.completions.create({
    model: NEBIUS_MODEL_NAME,
    messages: [{ role: "user", content: prompt }],
    response_format: zodResponseFormat(EmailObj, "email"),
    max_completion_tokens: 1500
  });

  const output = response.choices[0].message;
  const output_json = JSON.parse(output.content);

  const buildData = {
      greeting_text: output_json.greeting_text,
      main_message: output_json.main_message,
      purchased_foods: [],
      recommended_foods: output_json.recommended_foods,
      cta_text: output_json.cta_text,
      footer_note: output_json.footer_note
    }

  const promo_email = buildEmail(promo_email_template, buildData, call_to_action_backlink)


  send_log_to_keywords_ai(
    NEBIUS_MODEL_NAME,
    prompt,
    output.content,
    response.usage.prompt_tokens,
    response.usage.completion_tokens,
    'promotion_email',
    userId,
    userName
  )

  await send_email_to_user_with_resend(
    userEmail,
    'promotions@resend.dev',
    output_json.email_subject,
    promo_email
  )
}

export async function craft_and_send_after_purchase_email(userId, userName, userEmail, purchasedFoodIds, call_to_action_backlink = window.location.origin) {

  const session = driver.session()

  var cypher_get_purchased_food_and_tags = `
    UNWIND $purchasedFoodIds AS foodId
    MATCH (f:Food {id: foodId})
    OPTIONAL MATCH (f)-[:HAS_TAG]->(t:Tag)
    RETURN
      f.id AS foodId,
      f.name AS purchasedFood,
      f.imageUrl AS purchasedFoodImageUrl,
      collect(DISTINCT t.name) AS foodTags
  `

  var cypher_get_top10_similar_foods = `
  UNWIND $purchasedFoodIds AS foodId
  MATCH (f:Food {id: foodId})-[sim:SIMILAR_TO]-(f2:Food)
  WHERE NOT f2.id IN $purchasedFoodIds
  WITH f, f2, sim
  ORDER BY f.id, sim.score DESC
  WITH f, collect({
    food: f2.name,
    foodImageUrl: f2.imageUrl,
    similarity_score: sim.score
  })[0..9] AS similarFoods
  RETURN
    f.name AS purchasedFood,
    f.imageUrl AS purchasedFoodImageUrl,
    similarFoods
  `

  var cypher_get_user_top10_tags = `
  MATCH (u:User {id: $userId})-[si:SHOWN_INTEREST]->(t:Tag)
  RETURN
    t.name AS tag,
    sum(si.count) AS strength
  ORDER BY strength DESC
  LIMIT 10;
  `

  try {
    const results_get_purchased_food_and_tags = await session.run(cypher_get_purchased_food_and_tags, { purchasedFoodIds });
    const results_get_top10_similar_foods = await session.run(cypher_get_top10_similar_foods, { purchasedFoodIds });
    const results_get_user_top10_tags = await session.run(cypher_get_user_top10_tags, { userId });

    const purchasedFoodAndTags = results_get_purchased_food_and_tags.records.map(record => ({
      name: record.get('purchasedFood'),
      imageUrl: record.get('purchasedFoodImageUrl'),
      foodTags: record.get('foodTags')
    }));

    const top10SimilarFoods = results_get_top10_similar_foods.records.map(record => ({
      purchasedFood: record.get('purchasedFood'),
      purchasedFoodImageUrl: record.get('purchasedFoodImageUrl'),
      similarFoods: record.get('similarFoods')
    }));

    const userTop10Tags = results_get_user_top10_tags.records.map(record => ({
      tag: record.get('tag'),
      strength: record.get('strength')
    }));

    var prompt = `
    You are a customer engagement assistant for Food Recommendation App, a food delivery app.

    Current date and time:
    ${new Date().toLocaleString()}

    CONTEXT:
    The user (${userName}) has just completed a food purchase.
    You will generate ONLY content fields that will be injected into an email template.

    Below is the data you'll use to personalize their post-purchase email.

    Purchased foods and their tags:
    ${JSON.stringify(purchasedFoodAndTags, null, 2)}

    Top similar foods to what they purchased:
    ${JSON.stringify(top10SimilarFoods, null, 2)}

    Tags the user has shown the most interest in:
    ${JSON.stringify(userTop10Tags, null, 2)}

    GOAL:
    Create warm, personal email content that feels human and appreciative.
    This is NOT a marketing email. Avoid sales language, discounts, urgency, or hype.

    BRAND & TONE:
    - Brand: Food Recommendation App
    - Tone: warm, cozy, thoughtful, genuine
    - Emojis: allowed sparingly (1–3 max), only where they feel natural

    STRICT RULES (VERY IMPORTANT):
    - DO NOT invent foods or images not present in the provided data
    - ONLY output valid JSON that matches the schema exactly

    CONTENT REQUIREMENTS:
    - Personalize the message using the user's name when appropriate
    - Recommend 3–5 foods from the provided "Top similar foods" list
    - Keep all text concise and friendly (short paragraphs)

    OUTPUT FORMAT (STRICT JSON — NO EXTRA TEXT):
    {
      "email_subject": "string",
      "greeting_text": "string",
      "main_message": "string",
      "recommended_foods": [
        {
          "name": "string",
          "imageUrl": "string"
        }
      ],
      "cta_text": "string",
      "footer_note": "string"
    }
    `

    const post_purchase_email_template = `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#000000;border:1px solid #e5e7eb;">
  
      <!-- Header -->
      <div style="background:#0A66FF;padding:20px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;">Food Recommendation App</h1>
      </div>

      <!-- Body -->
      <div style="padding:24px;">
        
        <!-- Greeting -->
        <p style="font-size:16px;margin:0 0 12px 0;">
          {{greeting_text}}
        </p>

        <!-- Main message -->
        <p style="font-size:15px;line-height:1.6;margin:0 0 20px 0;">
          {{main_message}}
        </p>

        <!-- Purchased foods -->
        <h3 style="font-size:18px;margin:24px 0 12px 0;">What you just purchased 🍽️</h3>
        <div>
          {{purchased_foods_section}}
        </div>

        <!-- Recommendations -->
        <h3 style="font-size:18px;margin:28px 0 12px 0;">You might love these next 💙</h3>
        <div>
          {{recommended_foods_section}}
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin:32px 0;">
          <a href="{{cta_link}}"
            style="background:#0A66FF;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:6px;display:inline-block;font-size:15px;">
            {{cta_text}}
          </a>
        </div>

        <!-- Footer note -->
        <p style="font-size:13px;color:#555555;text-align:center;margin-top:20px;">
          {{footer_note}}
        </p>

      </div>
    </div>
    `


    const response = await client.chat.completions.create({
      model: NEBIUS_MODEL_NAME,
      messages: [{ role: "user", content: prompt }],
      response_format: zodResponseFormat(EmailObj, "email"),
      max_completion_tokens: 1500
    });

    const output = response.choices[0].message;
    const output_json = JSON.parse(output.content);

    const buildData = {
      greeting_text: output_json.greeting_text,
      main_message: output_json.main_message,
      purchased_foods: purchasedFoodAndTags,
      recommended_foods: output_json.recommended_foods,
      cta_text: output_json.cta_text,
      footer_note: output_json.footer_note
    }

    const purchase_email = buildEmail(post_purchase_email_template, buildData, call_to_action_backlink)

    send_log_to_keywords_ai(
      NEBIUS_MODEL_NAME,
      prompt,
      output.content,
      response.usage.prompt_tokens,
      response.usage.completion_tokens,
      'purchased_email',
      userId,
      userName
    )

    await send_email_to_user_with_resend(
      userEmail,
      'purchased@resend.dev',
      output_json.email_subject,
      purchase_email
    )

  } finally {
    await session.close();
  }
}

export async function get_user_about_me(userId, userName) {
  // Get top 20 foods recommendations and top 10 food tags the user has shown interest in
  const userPreferenceSummary = await neo4j_get_user_preferences(userId, 20, 10)

  // Get the most recent 15 foods added to cart or purchased.
  var get_recent_cypher = `
  MATCH (u:User {id: $userId})-[r]->(f:Food)
  WITH
    f,
    collect(DISTINCT type(r)) AS action,
    max(r.latest_datetime) AS latest_action_datetime
  ORDER BY latest_action_datetime DESC
  LIMIT 15

  MATCH (f)-->(t:Tag)
  RETURN
    action,
    latest_action_datetime,
    f.id AS food_id,
    f.name AS food_name,
    collect(t.name) AS food_tags

  `

  var get_recent_response = await driver.executeQuery(
    get_recent_cypher,
    { userId }
  )

  get_recent_response = get_recent_response.records.map(record => ({
    name: record.get('food_name'),
    id: record.get('food_id'),
    tags: record.get('food_tags'),
    action: record.get('action'),
    latest_action_datetime: record.get('latest_action_datetime'),
  }))

  var prompt = `
  You are a creative assistant for Food Recommendation App, a food delivery app. 
  Your task is to generate a JSON object containing the personalized information for a user's "/about-me" page.

  The JSON must include:

  1. 'userFoodIdentity' - A natural, engaging description of the user's eating style and preferences (vegan, vegetarian, flexible, love for spices, etc.).
  2. 'userCulturalProfile' - A fun description of the cuisines and cultures the user gravitates toward.
  3. 'recently_on_your_rader' - Select up to six foods that match the user’s tags or recently explored preferences. They must also be foods the user has added or purchased recently. Return a list containing each item’s 'name' and 'id'.
  4. 'picks_from_recommendations_to_try_out' – A curated set of six foods selected from the top recommendations that was given below, that the user hasn’t tried recently (purchased), combining a small number from highly recommended with more exploratory options (not ranked that high) but may be their taste (aim for a 2:4 ratio). Include 'name' and 'id'.

  Use the following **input data** to generate the output JSON:

  USER INFO:
  - Name: ${userName}
  - Current Date and Time: ${new Date().toLocaleString()}

  LIST OF FOODS (added to cart/purchased):
  ${JSON.stringify(get_recent_response, null, 2)}

  TOP FOOD TAGS:
  ${JSON.stringify(userPreferenceSummary.topktags, null, 2)}

  TOP RECOMMENDATIONS:
  ${JSON.stringify(userPreferenceSummary.topkfoods, null, 2)}

  OUTPUT STRUCTURE:
  {
    "userFoodIdentity": "...",
    "userCulturalProfile": "...",
    "recently_on_your_rader": [
      {
        "name": "...",
        "id": "..."
      },
      ...
    ],
    "picks_from_recommendations_to_try_out": [
      {
        "name": "...",
        "id": "..."
      },
      ...
    ]
  }
`
  const responseObj = z.object({
    userFoodIdentity: z.string(),
    userCulturalProfile: z.string(),
    recently_on_your_rader: z.array(z.object({ name: z.string(), id: z.string() })),
    picks_from_recommendations_to_try_out: z.array(z.object({ name: z.string(), id: z.string() })),
  })


  const response = await client.chat.completions.create({
    model: NEBIUS_MODEL_NAME,
    messages: [{ role: "user", content: prompt }],
    response_format: zodResponseFormat(responseObj, "response_obj"),
  });

  const output = response.choices[0].message;
  const output_json = JSON.parse(output.content);

  send_log_to_keywords_ai(
    NEBIUS_MODEL_NAME,
    prompt,
    output.content,
    response.usage.prompt_tokens,
    response.usage.completion_tokens,
    'about_me_page',
    userId,
    userName
  )

  // Will also return other output data
  var returned_output = {
    name: userName,
    currentDate: new Date().toLocaleString(),
    // The user should have at least 1 food added to cart/purchased.
    hasActivity: get_recent_response.length > 0,
    topTags: userPreferenceSummary.topktags,
    userFoodIdentity: output_json.userFoodIdentity,
    userCulturalProfile: output_json.userCulturalProfile,
    recently_on_your_rader: output_json.recently_on_your_rader,
    picks_to_try_out: output_json.picks_from_recommendations_to_try_out,
  }

  return returned_output
}

// Cleanup function for app shutdown
export async function closeDriver() {
  await driver.close()
}
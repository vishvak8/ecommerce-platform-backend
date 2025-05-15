const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const dotenv = require("dotenv");
const { OpenAI } = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.use(cors());
app.use(bodyParser.json());

// Save product
app.post("/products", async (req, res) => {
  const { name, price, description, imageUrl } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO products (name, price, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, price, description, imageUrl]
    );
    res.status(201).json({ message: "Product added", product: result.rows[0] });
  } catch (err) {
    console.error("DB Insert Error:", err);
    res.status(500).json({ message: "Error saving product" });
  }
});

// Fetch products
app.get("/products", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("DB Fetch Error:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// Translation using OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/translate", async (req, res) => {
  const { text } = req.body;
  const prompt = `
Translate the following English product description into **natural, fluent Hindi** as spoken by a native Hindi speaker.
Avoid robotic or literal translation. Make sure it sounds smooth, clean, and human-like.

Example:
English: "Apple MacBook Pro with M2 chip and Retina Display"
Hindi: "एम2 चिप और रेटिना डिस्प्ले वाला एप्पल मैकबुक प्रो"

Now translate:
"${text}"
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a professional English to Hindi translator." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    let rawOutput = response.choices[0].message.content || "";
    let translated = rawOutput
      .replace(/[\u200E\u200F\u202A-\u202E]/g, "")
      .replace(/<[^>]*>?/gm, "")
      .replace(/^"(.*)"$/, "$1")
      .replace(/[।|]+$/, "")
      .trim();

    if (translated.length > 0) {
      translated = translated[0].toUpperCase() + translated.slice(1);
    }

    res.json({ translatedText: translated });
  } catch (err) {
    console.error("Translation Error:", err);
    res.status(500).json({ message: "Translation failed" });
  }
});

// Enhanced Semantic Search with price filtering
app.post("/semantic-search", async (req, res) => {
  const { query, products } = req.body;

  const underMatch = query.match(/under\s*₹?(\d+)/i);
  const overMatch = query.match(/over\s*₹?(\d+)/i);
  const betweenMatch = query.match(/between\s*₹?(\d+)\s*and\s*₹?(\d+)/i);
  const cheapest = /cheapest/i.test(query);
  const expensive = /most expensive/i.test(query);

  let filtered = [...products];

  if (betweenMatch) {
    const low = parseInt(betweenMatch[1]);
    const high = parseInt(betweenMatch[2]);
    filtered = filtered.filter(p => parseFloat(p.price) >= low && parseFloat(p.price) <= high);
  } else if (underMatch) {
    const max = parseInt(underMatch[1]);
    filtered = filtered.filter(p => parseFloat(p.price) <= max);
  } else if (overMatch) {
    const min = parseInt(overMatch[1]);
    filtered = filtered.filter(p => parseFloat(p.price) >= min);
  } else if (cheapest) {
    const minPrice = Math.min(...products.map(p => parseFloat(p.price)));
    filtered = products.filter(p => parseFloat(p.price) === minPrice);
  } else if (expensive) {
    const maxPrice = Math.max(...products.map(p => parseFloat(p.price)));
    filtered = products.filter(p => parseFloat(p.price) === maxPrice);
  }

  try {
    const prompt = `
You are a strict e-commerce product search assistant.

Match the user's query to the most relevant products ONLY from the list below.
Follow these strict rules:

- Only return phones if query asks for phone, camera if it asks for camera, etc.
- If the query says "Android", never return iPhones.
- Match price strictly (under, over, between, cheapest, most expensive)
- Match use-case like "drawing/sketching" only if stylus/pen is mentioned.
- Return [] if no match.

Query: "${query}"

Product list:
${filtered.map((p, i) => `${i + 1}. ${p.name} — ₹${p.price} — ${p.description}`).join("\n")}

Reply with [index numbers] of matching products. Return [] if none.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
    });

    const answer = response.choices[0].message.content;
    const matches = answer.match(/\[(.*?)\]/);
    const indexes = matches
      ? matches[1].split(",").map((s) => parseInt(s.trim()) - 1)
      : [];

    const matchedProducts = indexes.map((i) => filtered[i]).filter(Boolean);
    res.json({ results: matchedProducts });
  } catch (err) {
    console.error("Semantic search failed:", err);
    res.status(500).json({ message: "AI search failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

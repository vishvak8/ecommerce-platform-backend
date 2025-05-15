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

// Enhanced Semantic search
app.post("/semantic-search", async (req, res) => {
  const { query, products } = req.body;

  try {
    const prompt = `
You are an intelligent product matching engine for an e-commerce app.

Given the user's query and product list, return ONLY the most relevant product numbers.

Important rules:
- Match keywords strictly (e.g., if user says "Android", don’t return iPhone)
- Consider product type (phone, camera, shoes), specs (chip, battery, price), and brand
- If the query mentions price (like "under 100000"), filter accordingly
- Avoid returning loosely related or irrelevant products

User Query: "${query}"

Product List:
${products.map((p, i) => `${i + 1}. ${p.name} — ₹${p.price} — ${p.description}`).join("\n")}

Respond ONLY with an array of numbers like: [2, 5]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
    });

    const answer = response.choices[0].message.content;
    const matches = answer.match(/\[(.*?)\]/);
    const indexes = matches
      ? matches[1].split(",").map((s) => parseInt(s.trim()) - 1)
      : [];

    const matchedProducts = indexes.map((i) => products[i]).filter(Boolean);
    res.json({ results: matchedProducts });
  } catch (err) {
    console.error("Semantic search failed:", err);
    res.status(500).json({ message: "AI search failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

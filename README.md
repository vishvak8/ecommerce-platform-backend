# E-Commerce Platform – Backend
This is the backend for a mini e-commerce platform built with Node.js, Express, and PostgreSQL. It allows users to submit and view products, perform contextual AI-based search using OpenAI, and translate product descriptions to Hindi.

**Live API URL: https://ecommerce-platform-backend-n9wx.onrender.com

---

##Tech Stack

- **Backend: Node.js + Express
- **Database: PostgreSQL
- **AI Integration: OpenAI (for semantic search + translation)
- **Hosting: Render

---

## Core Features

### Product Submission
- Submit product name, price, description, and optional image URL
- Data is stored in PostgreSQL

### Product Listing
- Fetch all products, sorted by most recent
- Supports live product updates

### AI-Powered Contextual Search
- Understands smart queries like:
  - "flagship Android phone"
  - "budget laptop under ₹70000"
  - "wireless headphones with noise cancellation"
- Filters based on:
  - Price (under, over, between, cheapest, most expensive)
  - Category match (e.g., phone, laptop, headphones)

### Hindi Translation API
- Translates English descriptions into fluent Hindi using OpenAI

---

## Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/vishvak8/ecommerce-platform-backend.git
cd ecommerce-platform-backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
PGUSER=your_pg_user
PGHOST=your_pg_host
PGDATABASE=your_db_name
PGPASSWORD=your_pg_password
PGPORT=5432
OPENAI_API_KEY=your_openai_key
```

### API Endpoints

| Method | Endpoint           | Description                              |
|--------|--------------------|------------------------------------------|
| POST   | `/products`        | Submit a new product                     |
| GET    | `/products`        | Fetch all submitted products             |
| POST   | `/semantic-search` | Smart AI-powered product search          |
| POST   | `/translate`       | Translate product description to Hindi   |

---

## License

This project is for **educational/demo purposes only**.  
No commercial use or real transactions involved.

---

## Author

Built with ❤️ by [@vishvak8](https://github.com/vishvak8)

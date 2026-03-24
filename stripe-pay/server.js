require('dotenv').config();
const express = require("express");
const Stripe = require("stripe");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());

// Main Payment Route
app.get("/pay", async (req, res) => {
  try {
    const invoice = req.query.invoice || "0000";
    const amount = req.query.amount;

    if (!amount) {
      return res.status(400).send("Error: No amount provided in the link.");
    }

    // CLEANING: Removes "$", commas, and extra spaces so " $1,200.50 " becomes "1200.50"
    const cleanAmount = amount.trim().replace(/[$,]/g, "");
    const unitAmount = Math.round(parseFloat(cleanAmount) * 100);

    if (isNaN(unitAmount)) {
      return res.status(400).send("Error: Invalid amount format received.");
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: `Invoice #${invoice}`,
              description: `Payment for Service Fusion Invoice ${invoice}`
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.protocol}://${req.get("host")}/success?invoice=${invoice}`,
      cancel_url: `${req.protocol}://${req.get("host")}/cancel?invoice=${invoice}`,
    });

    res.redirect(303, session.url);
  } catch (error) {
    console.error("Stripe Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Basic Success & Cancel Pages
app.get("/success", (req, res) => {
  res.send(`<h1>Payment Successful</h1><p>Invoice #${req.query.invoice} has been processed. Thank you!</p>`);
});

app.get("/cancel", (req, res) => {
  res.send(`<h1>Payment Canceled</h1><p>The checkout for invoice #${req.query.invoice} was closed.</p>`);
});

// Root Route
app.get("/", (req, res) => {
  res.send(`<h1>Stripe Payment Server is Live</h1>`);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
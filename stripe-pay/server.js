require('dotenv').config();
const express = require("express");
const Stripe = require("stripe");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());

// Main Payment Route
app.get("/pay", async (req, res) => {
  try {
    // 1. Grab the new 'cust' variable from the URL
    const { invoice, amount, cust } = req.query;

    if (!amount) return res.status(400).send("Error: Amount is required.");

    const cleanAmount = amount.trim().replace(/[$,]/g, "");
    const unitAmount = Math.round(parseFloat(cleanAmount) * 100);

    const session = await stripe.checkout.sessions.create({
     automatic_payment_methods: {
    enabled: true,
  },
 
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { 
            name: `Invoice #${invoice || 'General'}`,
            // 2. Use the name in the description
            description: `Final Payment Request for ${cust || 'Customer'} for Invoice #${invoice}`
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
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
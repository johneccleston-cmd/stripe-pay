require('dotenv').config(); // load .env variables
const express = require("express");
const app = express();
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
// universal payment endpoint
app.get("/pay", async (req, res) => {
  try {
    const invoice = req.query.invoice || "0000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Invoice #${invoice}` },
            unit_amount: 5000,
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
    // This sends the specific reason (e.g., "Invalid API Key") to the browser
    res.status(500).json({ error: error.message });
}
});

// success & cancel pages
app.get("/success", (req, res) => {
  res.send(`Payment for invoice #${req.query.invoice} was successful!`);
});

app.get("/cancel", (req, res) => {
  res.send(`Payment for invoice #${req.query.invoice} was canceled.`);
});

// root route
app.get("/", (req, res) => {
  res.send(`
    <h1>Stripe Payment Server</h1>
    <p>To test a payment, go to <a href="/pay?invoice=1234">/pay?invoice=1234</a></p>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
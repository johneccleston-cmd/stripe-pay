

const express = require("express");
const app = express();
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // use environment variable

app.use(express.json());

// universal payment endpoint
app.get("/pay", async (req, res) => {
  try {
    const invoice = req.query.invoice || "0000"; // dynamic invoice number

    // create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice #${invoice}`,
            },
            unit_amount: 5000, // $50.00, update dynamically if needed
          },
          quantity: 1,
        },
      ],
      success_url: `${req.protocol}://${req.get("host")}/success?invoice=${invoice}`,
      cancel_url: `${req.protocol}://${req.get("host")}/cancel?invoice=${invoice}`,
    });

    // redirect to Stripe checkout
    res.redirect(303, session.url);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating checkout session");
  }
});

// optional success & cancel pages
app.get("/success", (req, res) => {
  res.send(`Payment for invoice #${req.query.invoice} was successful!`);
});

app.get("/cancel", (req, res) => {
  res.send(`Payment for invoice #${req.query.invoice} was canceled.`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
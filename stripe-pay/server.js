require('dotenv').config();
const express = require("express");
const Stripe = require("stripe");

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(express.json());

app.get("/pay", async (req, res) => {
  try {
    const { job, invoice, amount, cust, email, type } = req.query;

    if (!amount) return res.status(400).send("Error: Amount is required.");

    // Clean the currency string (removes $, spaces, and commas)
    const cleanAmount = amount.trim().replace(/[$,]/g, "");
    let numericAmount = parseFloat(cleanAmount);

    let displayTitle = `Job #${job || invoice || 'General'}`;
    let paymentCategory = "Full Payment";

    // LOGIC: 
    // If it's a deposit, we calculate 50% of the provided amount.
    // If it's final (or anything else), we charge the full amount provided.
    if (type === "deposit") {
      numericAmount = numericAmount / 2; 
      displayTitle = `50% Deposit - Job #${job || invoice}`;
      paymentCategory = "Deposit";
    } else if (type === "final") {
      // No division here: charges the exact {Job:TotalDue} sent by Service Fusion
      displayTitle = `Final Balance - Job #${job || invoice}`;
      paymentCategory = "Final Balance";
    }

    const unitAmount = Math.round(numericAmount * 100);
    if (isNaN(unitAmount)) return res.status(400).send("Error: Invalid amount.");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "klarna", "us_bank_account"],
      payment_method_options: {
        us_bank_account: { verification_method: "instant" },
      },
      customer_email: email || undefined,
      // Metadata for your Google Sheets tracking
      metadata: {
        job_number: job || invoice || "N/A",
        customer_name: cust || "Unknown",
        payment_type: paymentCategory
      },
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { 
            name: displayTitle,
            description: `Deposit Payment Request for ${cust || 'Customer'}`
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      success_url: `${req.protocol}://${req.get("host")}/success?job=${job || invoice}`,
      cancel_url: `${req.protocol}://${req.get("host")}/cancel?job=${job || invoice}`,
    });

    res.redirect(303, session.url);
  } catch (error) {
    console.error("Stripe Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/success", (req, res) => {
  res.send(`<h1>Payment Successful</h1><p>Job #${req.query.job} processed. Thank you!</p>`);
});

app.get("/cancel", (req, res) => {
  res.send(`<h1>Payment Canceled</h1><p>Checkout for job #${req.query.job} was closed.</p>`);
});

app.get("/", (req, res) => {
  res.send(`<h1>Stripe Payment Server is Live</h1>`);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
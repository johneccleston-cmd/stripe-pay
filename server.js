const express = require('express');
// 1. Initialize Stripe with your Secret Key from Environment Variables
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());

app.get("/pay", async (req, res) => {
  try {
    let { job, invoice, amount, cust, email, type } = req.query;

    if (!amount) {
      return res.status(400).send("Error: No amount was provided.");
    }

    const rawAmount = Array.isArray(amount) ? amount[0] : amount;
    const cleanAmount = rawAmount.toString().replace(/[^0-9.]/g, "");
    let numericAmount = parseFloat(cleanAmount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).send(`Error: Invalid amount format (${rawAmount}).`);
    }

    let displayTitle = `Job #${job || invoice || 'General'}`;
    let paymentCategory = "Full Payment";

    if (type === "deposit") {
      numericAmount = numericAmount / 2; 
      displayTitle = `50% Deposit - Job #${job || invoice}`;
      paymentCategory = "Deposit";
    } else if (type === "final") {
      displayTitle = `Final Balance - Job #${job || invoice}`;
      paymentCategory = "Final Balance";
    }

    const unitAmount = Math.round(numericAmount * 100);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "klarna", "us_bank_account"],
      payment_method_options: {
        us_bank_account: { verification_method: "instant" },
      },
      customer_email: email || undefined,
      metadata: {
        job_number: job || invoice || "N/A",
        customer_name: cust || "Unknown",
        payment_type: paymentCategory,
        // This sends the UN-CLEANED full amount to your sheet
        full_total: amount 
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
      success_url: 'https://integritydoornwa.com/thank-you/',
cancel_url: 'https://integritydoornwa.com/',    });

    res.redirect(303, session.url);
  } catch (error) {
    console.error("Stripe Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 2. IMPORTANT: Add the port listener so Render can find your app
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
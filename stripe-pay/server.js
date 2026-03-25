app.get("/pay", async (req, res) => {
  try {
    const { job, invoice, amount, cust, email, type } = req.query;

    if (!amount) return res.status(400).send("Error: Amount is required.");

    // ULTIMATE CLEANING: Removes everything except numbers and the dot
    // This fixes the "Invalid Amount" error caused by spaces, $, or commas
    const cleanAmount = amount.replace(/[^0-9.]/g, "");
    let numericAmount = parseFloat(cleanAmount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).send("Error: Invalid amount format received.");
    }

    let displayTitle = `Job #${job || invoice || 'General'}`;
    let paymentCategory = "Full Payment";

    // LOGIC: Only divide by 2 for deposits
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
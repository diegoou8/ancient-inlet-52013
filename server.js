const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint for FoxyCart to call
app.post('/shipping', function (request, response) {
  console.log("Received shipping request with body:", request.body); // Log received payload

  try {
    // Extract relevant data from the request body (replace with your actual logic)
    const cart_details = request.body;
    // (Add your logic to calculate shipping rates based on cart_details)
    
    // Example shipping rates (replace with your calculated rates)
    const shipping_results = [
      {
        method: "Envío Bogotá",
        price: 8000, // Replace with calculated price
        service_id: 10001,
        service_name: "Envío Bogotá (24 – 48 Horas)",
      },
      {
        method: "Envío Prioritario Bogotá",
        price: 12000, // Replace with calculated price
        service_id: 10002,
        service_name: "Envío Prioritario Bogotá (3-4 horas)",
      },
    ];

    // Log the shipping_results array
    console.log("Shipping rates output:", JSON.stringify(shipping_results, null, 2));

    // Send the manually constructed response
    response.setHeader("Content-Type", "application/json");
    response.send({ ok: true, data: { shipping_results } });
  } catch (error) {
    console.error("Error during shipping rate setup:", error);
    response.status(500).send("Error processing request");
  }
});

// Start the server (Heroku-friendly port configuration)
const PORT = process.env.PORT || 6000; 
app.listen(PORT, function () {
  console.log(`Custom FoxyCart shipping server running on port ${PORT}`);
});
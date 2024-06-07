const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint for FoxyCart to call
app.post('/shipping', function(request, response) {
  console.log("Received shipping request with body:", request.body);

  try {
    const cart_details = request.body;

    // Access shipping address from _embedded['fx:shipment']
    const shippingAddress = cart_details?._embedded?.['fx:shipment']?.shipping_address;

    // Check if shippingAddress and city exist
    if (shippingAddress && shippingAddress.city) {
      const normalizedCity = shippingAddress.city.toLowerCase()
                              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                              .replace(/[^a-z]/g, '');

      if (normalizedCity.includes('bogota')) {
        // Fixed shipping rates for Bogotá
        const shipping_results = [
          {
            method: "Envío Bogotá",
            price: 8000,
            service_id: 10001,
            service_name: "Envío Bogotá (24 – 48 Horas)",
          },
          {
            method: "Envío Prioritario Bogotá",
            price: 12000,
            service_id: 10002,
            service_name: "Envío Prioritario Bogotá (3-4 horas)",
          },
        ];

        console.log("Shipping rates output:", JSON.stringify(shipping_results, null, 2));
        response.setHeader("Content-Type", "application/json");
        response.send({ ok: true, data: { shipping_results } }); // Wrap in { ok: true, data: { ... } }
      } else {
        // Handle cases where the city is not Bogotá
        console.log("Shipping not available for:", shippingCity);
        response.setHeader("Content-Type", "application/json");
        response.send({ ok: false, error: "No procesamos envios a esta ciudad." });
      }
    } else {
      // Handle cases where shippingAddress or city is missing
      console.error("Error: Shipping address or city is missing in the payload.");
      response.setHeader("Content-Type", "application/json");
      response.send({ ok: false, error: "No procesamos envios a esta ciudad." });
    }
  } catch (error) {
    console.error("Error during shipping rate setup:", error);
    response.status(500).send("Error processing request");
  }
});

// Start the server
const PORT = process.env.PORT || 6000; 
app.listen(PORT, function () {
  console.log(`Custom FoxyCart shipping server running on port ${PORT}`);
});
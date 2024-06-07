const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint for FoxyCart to call
app.post('/shipping', function (request, response) {
  console.log("Received shipping request with body:", request.body); 

  try {
    const cart_details = request.body;
    const shippingCity = cart_details._embedded['fx:shipment'].shipping_address.city;

    if (shippingCity.toLowerCase() === 'bogotá') {
      // Calculate shipping rates for Bogotá (replace with your actual logic)
      const totalWeight = cart_details._embedded['fx:shipment'].total_weight;
      const totalAmount = cart_details._embedded['fx:shipment'].total_item_price;

      let standardRate = 8000; // Base rate
      let priorityRate = 12000; // Base rate

      // Example: Adjust rates based on weight (customize this logic)
      if (totalWeight > 5) {
        standardRate += 2000;
        priorityRate += 3000;
      }

      // Example: Adjust rates based on total amount (customize this logic)
      if (totalAmount > 100000) {
        priorityRate -= 1000; // Discount for larger orders
      }

      const shipping_results = [
        {
          method: "Envío Bogotá",
          price: standardRate,
          service_id: 10001,
          service_name: "Envío Bogotá (24 – 48 Horas)",
        },
        {
          method: "Envío Prioritario Bogotá",
          price: priorityRate,
          service_id: 10002,
          service_name: "Envío Prioritario Bogotá (3-4 horas)",
        },
      ];

      console.log("Shipping rates output:", JSON.stringify(shipping_results, null, 2));
      response.setHeader("Content-Type", "application/json");
      response.send({ ok: true, data: { shipping_results } });
    } else {
      // Handle cases where the city is not Bogotá
      console.log("Shipping not available for:", shippingCity);
      response.setHeader("Content-Type", "application/json");
      response.send({ ok: false, error: "Envío disponible solo para Bogotá." });
    }
  } catch (error) {
    console.error("Error during shipping rate setup:", error);
    response.status(500).send("Error procesando el requerimiento");
  }
});

// Start the server (Heroku-friendly port configuration)
const PORT = process.env.PORT || 6000; 
app.listen(PORT, function () {
  console.log(`Custom FoxyCart shipping server running on port ${PORT}`);
});
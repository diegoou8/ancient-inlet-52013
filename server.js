const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Example cities in and around Bogotá
const citiesBogotaAndNearby = ['Bogotá', 'Chía', 'Soacha', 'Zipaquirá', 'Mosquera'];

app.post('/shipping', function (request, response) {
  try {
    // Use optional chaining to safely access nested properties
    const embeddedData = request.body['_embedded'];
    const shipmentData = embeddedData?.['fx:shipment'];
    const shippingAddress = shipmentData?.['shipping_address'];
    const city = shippingAddress?.city;

    // Log the specific fields being accessed
    console.log("Embedded data:", embeddedData);
    console.log("Shipment data:", shipmentData);
    console.log("Shipping address:", shippingAddress);
    console.log("City retrieved:", city);

    // Check if the city value is defined
    if (!city) {
      console.error("City is undefined, could not process the request");
      response.status(400).send("City information is missing in the request.");
      return;
    }

    let shipping_results = [];
    if (citiesBogotaAndNearby.includes(city)) {
      // Basic shipping option
      shipping_results.push({
        method: "Envío Bogotá",
        price: 8000,
        service_id: 10001,
        service_name: "Envío Bogotá (24 – 48 Horas)",
      });

      // Get the current hour
      const currentHour = new Date().getHours();
      console.log("Current hour:", currentHour);

      // Add "Envío Prioritario Bogotá" only if current hour is between 6 AM and 6 PM
      if (currentHour >= 6 && currentHour <= 18) {
        shipping_results.push({
          method: "Envío Prioritario Bogotá",
          price: 12000,
          service_id: 10002,
          service_name: "Envío Prioritario Bogotá (3-4 horas)",
        });
      }
    } else {
      // If the city is not Bogotá or nearby, no shipping available
      response.send({ ok: false, message: "Shipping not available for your location" });
      return;
    }

    // Send the manually constructed response with available shipping options
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

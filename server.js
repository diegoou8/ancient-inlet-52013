const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const citiesBogotaAndNearby = ['Bogotá', 'Chía', 'Soacha', 'Zipaquirá', 'Mosquera'];

app.post('/shipping', function (request, response) {
  console.log("Full request body:", JSON.stringify(request.body, null, 2));  // Log the full body to confirm structure

  try {
    // Log each part of the path to diagnose the issue
    console.log("Embedded:", request.body['_embedded']);
    const shipment = request.body['_embedded']?.['fx:shipment'];
    console.log("Shipment:", shipment);
    const shippingAddress = shipment?.['shipping_address'];
    console.log("Shipping Address:", shippingAddress);
    const city = shippingAddress?.city;
    console.log("City:", city);

    if (!city) {
      console.error("City is undefined, could not process the request");
      response.status(400).send("City information is missing in the request.");
      return;
    }

    let shipping_results = [];
    if (citiesBogotaAndNearby.includes(city)) {
      shipping_results.push({
        method: "Envío Bogotá",
        price: 8000,
        service_id: 10001,
        service_name: "Envío Bogotá (24 – 48 Horas)",
      });
      const currentHour = new Date().getHours();
      if (currentHour >= 6 && currentHour <= 18) {
        shipping_results.push({
          method: "Envío Prioritario Bogotá",
          price: 12000,
          service_id: 10002,
          service_name: "Envío Prioritario Bogotá (3-4 horas)",
        });
      }
    } else {
      response.send({ ok: false, message: "Shipping not available for your location" });
      return;
    }

    response.setHeader("Content-Type", "application/json");
    response.send({ ok: true, data: { shipping_results } });
  } catch (error) {
    console.error("Error during shipping rate setup:", error);
    response.status(500).send("Error processing request");
  }
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

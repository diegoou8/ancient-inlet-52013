const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Shipping Groups
const bogota = ['Bogotá'];
const nearBogota = ['Chía', 'Soacha', 'Zipaquirá', 'Mosquera'];
const otherRegions = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas',
    'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Guainía', 'Guaviare',
    'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo',
    'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
    'Valle del Cauca', 'Vaupés', 'Vichada'
];

app.post('/shipping', (request, response) => {
    console.log("Full request body:", JSON.stringify(request.body, null, 2));

    try {
        const shipment = request.body._embedded['fx:shipment'];

        // Priority for city (Bogota and nearby cities)
        let city = shipment?.city?.toLowerCase();
        if (bogota.includes(city) || nearBogota.includes(city)) {
            const shipping_results = [];

            // Bogotá shipping
            if (bogota.includes(city)) {
                shipping_results.push({
                    method: "Envío Bogotá",
                    price: 8000,
                    service_id: 10001,
                    service_name: "Envío Bogotá (24 – 48 Horas)",
                });

                const currentHour = new Date().getHours(); // Get current hour in your timezone (adjust if needed)
                if (currentHour >= 6 && currentHour <= 18) {
                    shipping_results.push({
                        method: "Envío Prioritario Bogotá",
                        price: 12000,
                        service_id: 10002,
                        service_name: "Envío Prioritario Bogotá (3-4 horas)",
                    });
                }
            } 

            // Near Bogotá shipping
            else if (nearBogota.includes(city)) {
                shipping_results.push({
                    method: "Envío Municipios Cerca a Bogotá",
                    price: 15000,
                    service_id: 10003,
                    service_name: "Envío Municipios Cerca a Bogotá (24-48 hrs)"
                });
            }

            // No shipping available (city not found)
            if (shipping_results.length === 0) {
                return response.send({ ok: false, message: "Shipping not available for your location" });
            }
            
            response.setHeader("Content-Type", "application/json");
            return response.send({ ok: true, data: { shipping_results } }); // Exit early if city is found
        }

        // If city not in Bogotá or nearby, check the region
        const region = shipment?.region?.toLowerCase();

        if (!region) {
            return response.status(400).send("Region/State information is missing in the request.");
        }

        const shipping_results = [];

        // Other states shipping
        if (otherRegions.map(r => r.toLowerCase()).includes(region)) {
            shipping_results.push({
                method: "Envíos fuera de Bogotá",
                price: 39000,
                service_id: 10004,
                service_name: "Envíos fuera de Bogotá (48-72 hrs)"
            });
        }

        // No shipping available
        if (shipping_results.length === 0) {
            return response.send({ ok: false, message: "Shipping not available for your location" });
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
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Shipping Groups with normalized city names (lowercase, no accents)
const bogota = ['bogota', 'bogotá, d.c.'];
const nearBogota = ['chía', 'soacha', 'zipaquirá', 'mosquera'];
const otherRegions = [
    'amazonas', 'antioquia', 'arauca', 'atlántico', 'bolívar', 'boyacá', 'caldas',
    'caquetá', 'casanare', 'cauca', 'cesar', 'chocó', 'córdoba', 'guainía', 'guaviare',
    'huila', 'la guajira', 'magdalena', 'meta', 'nariño', 'norte de santander', 'putumayo',
    'quindío', 'risaralda', 'san andrés y providencia', 'santander', 'sucre', 'tolima',
    'valle del cauca', 'vaupés', 'vichada'
];

// Function to normalize text (remove accents and convert to lowercase)
const normalizeText = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

app.post('/shipping', (request, response) => {
    console.log("Full request body:", JSON.stringify(request.body, null, 2));

    try {
        const shipment = request.body._embedded['fx:shipment'];
        const shipping_results = [];

        // Normalize and check city
        let city = normalizeText(shipment?.city || '');
        console.log("Normalized City:", city);

        // Bogotá or nearby cities shipping
        if (bogota.includes(city)) {
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
        } else if (nearBogota.includes(city)) {
            shipping_results.push({
                method: "Envío Municipios Cerca a Bogotá",
                price: 15000,
                service_id: 10003,
                service_name: "Envío Municipios Cerca a Bogotá (24-48 hrs)"
            });
        }

        // If city is not in Bogotá or nearby, check the region
        if (shipping_results.length === 0) {
            const region = normalizeText(shipment?.region || '');
            console.log("Normalized Region:", region);

            if (!region) {
                return response.status(400).send("Region/State information is missing in the request.");
            }

            if (otherRegions.includes(region)) {
                shipping_results.push({
                    method: "Envíos fuera de Bogotá",
                    price: 39000,
                    service_id: 10004,
                    service_name: "Envíos fuera de Bogotá (48-72 hrs)"
                });
            }
        }

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
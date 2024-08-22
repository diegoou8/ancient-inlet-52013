const express = require('express');
const bodyParser = require('body-parser');

// Function to normalize text (remove accents and convert to lowercase)
const normalizeText = (text) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Shipping Groups with normalized city/region names (lowercase, no accents)
const bogota = new Set(['bogota', 'bogotá', 'bogotá, d.c.', 'bogotá d.c', 'bogota dc.', 'bogota d.c', 'bogota dc','bogota '].map(normalizeText));
const nearBogota = new Set(['chia', 'chía', 'soacha', 'zipaquirá', 'zipaquira', 'cajica', 'mosquera'].map(normalizeText));
const otherRegions = new Set([
    'amazonas', 'antioquia', 'arauca', 'atlántico', 'bolívar', 'boyacá', 'caldas',
    'caquetá', 'casanare', 'cauca', 'cesar', 'chocó', 'córdoba', 'guainía', 'guaviare',
    'huila', 'la guajira', 'magdalena', 'meta', 'nariño', 'norte de santander', 'putumayo',
    'quindío', 'risaralda', 'san andrés y providencia', 'santander', 'sucre', 'tolima',
    'valle del cauca', 'vaupés', 'vichada'
].map(normalizeText));

// Threshold for order total
const ORDER_TOTAL_THRESHOLD = 70000;

app.post('/shipping', (request, response) => {
    console.log("Full request body:", JSON.stringify(request.body, null, 2));
    try {
        const shipment = request.body._embedded['fx:shipment'];
        const totalItemPrice = shipment?.total_item_price || 0; // Use total_item_price from the payload
        const normalizedCity = normalizeText(shipment?.shipping_address?.city || shipment?.city || '');
        const normalizedRegion = normalizeText(shipment?.shipping_address?.region || shipment?.region || '');

        console.log("Total Item Price:", totalItemPrice);
        console.log("Normalized City:", normalizedCity);
        console.log("Normalized Region:", normalizedRegion);

        const shippingResults = [];

        // Check if total item price exceeds threshold
        if (totalItemPrice >= ORDER_TOTAL_THRESHOLD) {
            console.log("Total item price exceeds threshold");

            // Bogotá Shipping
            if (bogota.has(normalizedCity)) {
                shippingResults.push({
                    method: "Envío Bogotá",
                    price: 0,
                    service_id: 10001,
                    service_name: "Envío Gratis Bogotá (24 – 48 Horas)",
                });

                // Priority Bogotá Shipping (conditional based on time)
                const currentHour = new Date().getHours();
                if (currentHour >= 6 && currentHour < 15) {
                    shippingResults.push({
                        method: "Envío Prioritario Bogotá",
                        price: 12000,
                        service_id: 10002,
                        service_name: "Envío Prioritario Bogotá (3-4 horas)",
                    });
                }
            }
            // Near Bogotá Shipping
            else if (nearBogota.has(normalizedCity) || normalizedRegion === "cundinamarca") {
                shippingResults.push({
                    method: "Envío Municipios Cerca a Bogotá",
                    price: 15000,
                    service_id: 10003,
                    service_name: "Envío Municipios Cerca a Bogotá (24-48 hrs)"
                });
            }

            // Other Regions Shipping
            else if (otherRegions.has(normalizedRegion)) {
                shippingResults.push({
                    method: "Envíos fuera de Bogotá",
                    price: 39000,
                    service_id: 10004,
                    service_name: "Envíos fuera de Bogotá (48-72 hrs)"
                });
            }

            // No Shipping Available
            if (shippingResults.length === 0) {
                console.log("No shipping options available for the location");
                return response.send({ ok: false, message: "Shipping not available for your location" });
            }
        } else {
            console.log("Total item price does not exceed threshold");
            return response.send({ ok: false, message: "Total item price must be greater than 70,000 to view shipping options" });
        }

        response.setHeader("Content-Type", "application/json");
        response.send({ ok: true, data: { shipping_results: shippingResults } });

    } catch (error) {
        console.error("Error during shipping rate setup:", error);
        response.status(500).send("Error processing request");
    }
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

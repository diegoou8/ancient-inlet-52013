const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Shipping Groups (Make sure to add all relevant Colombian states)
const bogota = ['Bogotá', 'Bogotá, D.C.']; // Added "Bogotá, D.C." for consistency
const nearBogota = ['Chía', 'Soacha', 'Zipaquirá', 'Mosquera'];
const otherRegions = [
    'amazonas', 'antioquia', 'arauca', 'atlántico', 'bolívar', 'boyacá', 'caldas',
    'caquetá', 'casanare', 'cauca', 'cesar', 'chocó', 'córdoba', 'guainía', 'guaviare',
    'huila', 'la guajira', 'magdalena', 'meta', 'nariño', 'norte de santander', 'putumayo',
    'quindío', 'risaralda', 'san andrés y providencia', 'santander', 'sucre', 'tolima',
    'valle del cauca', 'vaupés', 'vichada'
];

app.post('/shipping', (request, response) => {
    console.log("Full request body:", JSON.stringify(request.body, null, 2));

    try {
        const shipment = request.body._embedded['fx:shipment'];
        const shipping_results = []; // Declare shipping_results outside the conditional blocks

        // Priority for city (Bogota and nearby cities)
        let city = shipment?.city?.toLowerCase();
        if (bogota.includes(city) || nearBogota.includes(city)) {
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

        }

        // If city not in Bogotá or nearby, check the region
        else {
            const region = shipment?.region?.toLowerCase();

            if (!region) {
                return response.status(400).send("Region/State information is missing in the request.");
            }

            // Other states shipping
            if (otherRegions.includes(region)) { 
                shipping_results.push({
                    method: "Envíos fuera de Bogotá",
                    price: 39000,
                    service_id: 10004,
                    service_name: "Envíos fuera de Bogotá (48-72 hrs)"
                });
            }
        }  

        // Check if any shipping options were found (moved outside of if-else blocks)
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
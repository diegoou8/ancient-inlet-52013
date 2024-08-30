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

            // **City-Based Checks First** 
            // Barranquilla and Montería Shipping
            if (barranquillaMonteria.has(normalizedCity)) {
                shippingResults.push({
                    method: "Envío Barranquilla y Montería",
                    price: 39000,
                    service_id: 10005,
                    service_name: "Envío Barranquilla y Montería (72 hrs - Lunes, Martes, Miércoles)"
                });
            }
            // Bogotá Shipping
            else if (bogota.has(normalizedCity)) {
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
            else if (nearBogota.has(normalizedCity)) {
                shippingResults.push({
                    method: "Envío Municipios Cerca a Bogotá",
                    price: 15000,
                    service_id: 10003,
                    service_name: "Envío Municipios Cerca a Bogotá (24-48 hrs)"
                });
            }
            // **Region-Based Check After City Checks**
            else if (normalizedRegion === "cundinamarca") {
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

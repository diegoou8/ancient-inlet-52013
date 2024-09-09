app.post('/shipping', (request, response) => {
    try {
        const shipment = request.body._embedded['fx:shipment'];
        const items = request.body._embedded['fx:items'];
        const totalItemPrice = shipment?.total_item_price || 0;
        const normalizedCity = normalizeText(shipment?.shipping_address?.city || shipment?.city || '');
        const normalizedRegion = normalizeText(shipment?.shipping_address?.region || shipment?.region || '');
        const itemCount = shipment?.item_count || 0;

        console.log("Total Item Price:", totalItemPrice);
        console.log("Normalized City:", normalizedCity);
        console.log("Normalized Region:", normalizedRegion);

        const shippingResults = [];
        let hasReservaProduct = false;

        // Check if total item price exceeds threshold
        if (totalItemPrice >= ORDER_TOTAL_THRESHOLD) {
            console.log("Total item price exceeds threshold");

            for (let i = 0; i < itemCount; i++) {
                const item = items[i];
                
                // Check if '_embedded' and 'fx:item_category' exist
                if (item._embedded && item._embedded['fx:item_category'] && item._embedded['fx:item_category'].name) {
                    const itemCategoryName = normalizeText(item._embedded['fx:item_category'].name);
                    console.log(`Item ${i + 1} Category:`, itemCategoryName);
                    
                    if (reservaProducts.has(itemCategoryName)) {
                        hasReservaProduct = true;
                        break; // Stop checking once a "reserva" product is found
                    }
                } else {
                    // Log a warning if the item category structure is not as expected
                    console.warn(`Warning: Item ${i + 1} does not have a valid '_embedded' or 'fx:item_category' structure.`);
                }
            }

            // Bogotá Shipping
            if (bogota.has(normalizedCity)) {
                if (hasReservaProduct) {
                    shippingResults.push({
                        method: "Envío producto reserva",
                        price: 8000,
                        service_id: 10006,
                        service_name: "Enviaremos tu producto cuando esté disponible",
                    });
                } else {
                    shippingResults.push({
                        method: "Envío Bogotá",
                        price: 8000,
                        service_id: 10001,
                        service_name: "Envío Bogotá (24 – 48 Horas)",
                    });

                    const currentHour = new Date().getHours();
                    const currentDay = new Date().getDay();
                    if (
                        (currentDay >= 1 && currentDay <= 5 && currentHour >= 6 && currentHour < 15) ||
                        (currentDay === 6 && currentHour >= 6 && currentHour < 11)
                    ) {
                        shippingResults.push({
                            method: "Envío Prioritario Bogotá",
                            price: 12000,
                            service_id: 10002,
                            service_name: "Envío Prioritario Bogotá (3-4 horas)",
                        });
                    }
                }
            } else if (nearBogota.has(normalizedCity) || normalizedRegion === "cundinamarca") {
                if (hasReservaProduct) {
                    shippingResults.push({
                        method: "Envío producto reserva",
                        price: 15000,
                        service_id: 10006,
                        service_name: "Enviaremos tu producto cuando esté disponible",
                    });
                } else {
                    shippingResults.push({
                        method: "Envío Municipios Cerca a Bogotá",
                        price: 15000,
                        service_id: 10003,
                        service_name: "Envío Municipios Cerca a Bogotá (24-48 hrs)"
                    });
                }
            } else if (barranquillaMonteria.has(normalizedCity)) {
                if (hasReservaProduct) {
                    shippingResults.push({
                        method: "Envío producto reserva",
                        price: 39000,
                        service_id: 10006,
                        service_name: "Enviaremos tu producto cuando esté disponible",
                    });
                } else {
                    shippingResults.push({
                        method: "Envío a Barranquilla o Monteria",
                        price: 39000,
                        service_id: 10005,
                        service_name: "(72 horas - envios Lunes, Martes y Miercoles)"
                    });
                }
            } else if (otherRegions.has(normalizedRegion)) {
                if (hasReservaProduct) {
                    shippingResults.push({
                        method: "Envío producto reserva",
                        price: 39000,
                        service_id: 10006,
                        service_name: "Enviaremos tu producto cuando esté disponible",
                    });
                } else {
                    shippingResults.push({
                        method: "Envíos fuera de Bogotá",
                        price: 39000,
                        service_id: 10004,
                        service_name: "Envíos fuera de Bogotá (48-72 hrs)"
                    });
                }
            }

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

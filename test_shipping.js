const http = require('http');

const testRequest = (payload) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8016,
            path: '/shipping',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(JSON.stringify(payload));
        req.end();
    });
};

const runTests = async () => {
    console.log('--- Starting Shipping Logic Tests ---');

    const baseRequest = {
        _embedded: {
            'fx:shipment': {
                total_item_price: 100000,
                shipping_address: {
                    city: 'Bogotá',
                    region: 'Cundinamarca'
                }
            },
            'fx:items': [
                {
                    name: 'Product A',
                    _embedded: {
                        'fx:item_options': [
                            { name: 'ciudad', value: 'bogota' }
                        ]
                    }
                }
            ]
        }
    };

    // Test 1: Bogota product to Bogota
    try {
        const res1 = await testRequest(baseRequest);
        console.log('Test 1 (Bogota -> Bogota):', res1.ok === true ? 'PASS' : 'FAIL', res1.details || '');
    } catch (e) {
        console.log('Test 1 failed to connect. Is server running?');
        return;
    }

    // Test 2: Bogota product to Medellin (Should PASS)
    const req2 = JSON.parse(JSON.stringify(baseRequest));
    req2._embedded['fx:shipment'].shipping_address.city = 'Medellín';
    const res2 = await testRequest(req2);
    console.log('Test 2 (Bogota -> Medellin):', res2.ok === true ? 'PASS' : 'FAIL', res2.details || '');

    // Test 3: Bogota product to Cartagena (Should FAIL)
    const req3 = JSON.parse(JSON.stringify(baseRequest));
    req3._embedded['fx:shipment'].shipping_address.city = 'Cartagena';
    const res3 = await testRequest(req3);
    console.log('Test 3 (Bogota -> Cartagena):', res3.ok === false ? 'PASS' : 'FAIL', res3.details || '');

    // Test 4: "Todas" product to Cartagena (Should PASS)
    const req4 = JSON.parse(JSON.stringify(baseRequest));
    req4._embedded['fx:items'][0]._embedded['fx:item_options'][0].value = 'todas';
    req4._embedded['fx:shipment'].shipping_address.city = 'Cartagena';
    const res4 = await testRequest(req4);
    console.log('Test 4 (Todas -> Cartagena):', res4.ok === true ? 'PASS' : 'FAIL', res4.details || '');

    // Test 5: Bogota product to Barranquilla (Should FAIL)
    const req5 = JSON.parse(JSON.stringify(baseRequest));
    req5._embedded['fx:shipment'].shipping_address.city = 'Barranquilla';
    const res5 = await testRequest(req5);
    console.log('Test 5 (Bogota -> Barranquilla):', res5.ok === false ? 'PASS' : 'FAIL', res5.details || '');

    console.log('--- Tests Completed ---');
};

runTests();

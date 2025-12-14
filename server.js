const express = require('express');
const bodyParser = require('body-parser');

// Function to normalize text (remove accents and convert to lowercase)
const normalizeText = (text) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Shipping Groups with normalized city/region names (lowercase, no accents)
const bogota = new Set(
  [
    'bogota','bogotá','bogotá, d.c.','bogotá d.c', 'bogota dc.', 'bogota d.c', 'bogota dc', 'bogota ','bogotá d,c.','bogotá, d.c. ','bogotá d,c,','bogotá d,c. ','bogota,d.c','bogotáD.C','bogotá, DC',].map(normalizeText)
);

const nearBogota = new Set(
  ['chia', 'chía', 'soacha', 'zipaquirá', 'zipaquira', 'cajica', 'mosquera'].map(
    normalizeText
  )
);

const barranquillaMonteria = new Set(
  ['barranquilla', 'cartagena'].map(normalizeText)
);

const otherRegions = new Set(
  [
    'amazonas',
    'antioquia',
    'arauca',
    'atlántico',
    'bolívar',
    'boyacá',
    'caldas',
    'caquetá',
    'casanare',
    'cauca',
    'cesar',
    'chocó',
    'córdoba',
    'guainía',
    'guaviare',
    'huila',
    'la guajira',
    'magdalena',
    'meta',
    'nariño',
    'norte de santander',
    'putumayo',
    'quindío',
    'risaralda',
    'san andrés y providencia',
    'santander',
    'sucre',
    'tolima',
    'valle del cauca',
    'vaupés',
    'vichada',
  ].map(normalizeText)
);

const COLOMBIAN_HOLIDAYS = new Set([
  '2025-01-01', // Año Nuevo
  '2025-01-06', // Reyes Magos
  '2025-03-24', // San José
  '2025-04-17', // Jueves Santo
  '2025-04-18', // Viernes Santo
  '2025-05-01', // Día del Trabajo
  '2025-05-26', // Ascensión del Señor
  '2025-06-16', // Corpus Christi
  '2025-06-23', // Sagrado Corazón
  '2025-07-07', // San Pedro y San Pablo
  '2025-07-20', // Día de la Independencia
  '2025-08-07', // Batalla de Boyacá
  '2025-08-18', // Asunción de la Virgen
  '2025-10-13', // Día de la Raza
  '2025-11-03', // Todos los Santos
  '2025-11-17', // Independencia de Cartagena
  '2025-12-08', // Inmaculada Concepción
  '2025-12-25', // Navidad
]);

const isColombianHoliday = () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  return COLOMBIAN_HOLIDAYS.has(dateStr);
};

// Threshold for order total
const ORDER_TOTAL_THRESHOLD = 70000;

// Define product names for which "Envio reserva" applies
const reservaProducts = new Set(['Reserva'].map(normalizeText));

app.post('/shipping', (request, response) => {
  try {
    const todayIsHoliday = isColombianHoliday();
    const shipment = request.body._embedded?.['fx:shipment'];
    const items = request.body._embedded?.['fx:items'] || [];
    const totalItemPrice = shipment?.total_item_price || 0;

    const normalizedCity = normalizeText(
      shipment?.shipping_address?.city || shipment?.city || ''
    );

    const normalizedRegion = normalizeText(
      shipment?.shipping_address?.region || shipment?.region || ''
    );

    const itemCount = shipment?.item_count || 0;

    const shippingResults = [];
    let hasReservaProduct = false;
    let productCities = [];
    let invalidProductMessage = null;

    // 🔧 VALIDATE ALL ITEMS (no early return)
    for (const item of items) {
      const itemOptions = item._embedded?.['fx:item_options'] || [];

      const ciudadOption = itemOptions.find(
        (opt) => opt.name && normalizeText(opt.name) === 'ciudad'
      );

      if (ciudadOption && ciudadOption.value) {
        const rawValue = normalizeText(ciudadOption.value);

        const allowedCities = rawValue
          .split(/,| y /i)
          .map((c) => normalizeText(c))
          .filter((c) => c !== '');

        productCities.push({ name: item.name, allowedCities });
        console.log(`Product "${item.name}" allows cities:`, allowedCities);

        if (allowedCities.includes('todas')) {
          continue;
        }

        if (allowedCities.includes('bogota')) {
          if (barranquillaMonteria.has(normalizedCity)) {
            if (!invalidProductMessage) {
              invalidProductMessage = `El producto "${item.name}" no está disponible para ${
                shipment?.shipping_address?.city || 'tu ciudad'
              }.`;
            }
          }
          continue;
        }

        if (!allowedCities.includes(normalizedCity)) {
          if (!invalidProductMessage) {
            invalidProductMessage = `El producto "${item.name}" no está disponible para ${
              shipment?.shipping_address?.city || 'tu ciudad'
            }.`;
          }
        }
      }
    }

    // 🚫 BLOCK ONCE, AFTER ALL ITEMS ARE CHECKED
    if (invalidProductMessage) {
      return response.send({
        ok: false,
        details: invalidProductMessage,
      });
    }

    if (totalItemPrice < ORDER_TOTAL_THRESHOLD) {
      return response.send({
        ok: false,
        details:
          'El precio total debe ser mayor a 70,000 para ver las opciones de envío',
      });
    }

    // Detect reserva products
    for (let i = 0; i < itemCount; i++) {
      const item = items[i];

      if (item && item._embedded?.['fx:item_category']?.name) {
        const itemCategoryName = normalizeText(
          item._embedded['fx:item_category'].name
        );

        if (reservaProducts.has(itemCategoryName)) {
          hasReservaProduct = true;
          break;
        }
      }
    }

    // Shipping rules
    if (bogota.has(normalizedCity)) {
      if (hasReservaProduct) {
        shippingResults.push({
          method: 'Envío producto reserva',
          price: 8000,
          service_id: 10006,
          service_name: 'Enviaremos tu producto cuando esté disponible',
        });
      } else {
        shippingResults.push({
          method: 'Envío Bogotá gratis',
          price: 0,
          service_id: 10001,
          service_name: 'Envío Bogotá (24 – 48 Horas)',
        });

        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay();

        if (
          !todayIsHoliday &&
          ((currentDay >= 1 &&
            currentDay <= 5 &&
            currentHour >= 6 &&
            currentHour < 15) ||
            (currentDay === 6 && currentHour >= 6 && currentHour < 11))
        ) {
          shippingResults.push({
            method: 'Envío Prioritario Bogotá',
            price: 12000,
            service_id: 10002,
            service_name: 'Envío Prioritario Bogotá (3-4 horas)',
          });
        }
      }
    } else if (
      nearBogota.has(normalizedCity) ||
      normalizedRegion === 'cundinamarca'
    ) {
      shippingResults.push(
        hasReservaProduct
          ? {
              method: 'Envío producto reserva',
              price: 15000,
              service_id: 10006,
              service_name:
                'Enviaremos tu producto cuando esté disponible',
            }
          : {
              method: 'Envío Municipios Cerca a Bogotá',
              price: 15000,
              service_id: 10003,
              service_name:
                'Envío Municipios Cerca a Bogotá (24-48 hrs)',
            }
      );
    } else if (barranquillaMonteria.has(normalizedCity)) {
      shippingResults.push(
        hasReservaProduct
          ? {
              method: 'Envío producto reserva',
              price: 10000,
              service_id: 10006,
              service_name:
                'Enviaremos tu producto cuando esté disponible',
            }
          : {
              method: 'Envío a Barranquilla o Cartagena gratis',
              price: 0,
              service_id: 10005,
              service_name:
                'Envío Barranquilla o Cartagena (24 – 48 Horas)',
            }
      );
    } else if (otherRegions.has(normalizedRegion)) {
      shippingResults.push(
        hasReservaProduct
          ? {
              method: 'Envío producto reserva',
              price: 39000,
              service_id: 10006,
              service_name:
                'Enviaremos tu producto cuando esté disponible',
            }
          : {
              method: 'Envíos fuera de Bogotá',
              price: 39000,
              service_id: 10004,
              service_name:
                'Envíos fuera de Bogotá (48-72 hrs)',
            }
      );
    }

    if (shippingResults.length === 0) {
      return response.send({
        ok: false,
        details:
          'No hay opciones de envío disponibles para tu ubicación',
      });
    }

    response.setHeader('Content-Type', 'application/json');
    response.send({
      ok: true,
      data: { shipping_results: shippingResults },
    });
  } catch (error) {
    console.error('Error during shipping rate setup:', error);
    response.status(500).send('Error processing request');
  }
});

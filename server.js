const express = require('express');
const bodyParser = require('body-parser');

// Function to normalize text (remove accents and convert to lowercase)
const normalizeText = (text) =>
  (text || "")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Shipping Groups with normalized city/region names (lowercase, no accents)
const bogota = new Set(
  [
    'bogota',
    'bogotá',
    'bogotá, d.c.',
    'bogotá d.c',
    'bogota dc.',
    'bogota d.c',
    'bogota dc',
    'bogota ',
    'bogotá d,c.',
    'bogotá, d.c. ',
    'bogotá d,c,',
    'bogotá d,c. ',
    'bogota,d.c',
    'bogotáD.C',
    'bogotá, DC',
  ].map(normalizeText)
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
  '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18',
  '2025-05-01', '2025-05-26', '2025-06-16', '2025-06-23', '2025-07-07',
  '2025-07-20', '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03',
  '2025-11-17', '2025-12-08', '2025-12-25', '2025-12-31',
]);

const getBogotaTime = () => {
  const now = new Date();
  const timeZone = 'America/Bogota';
  // Create a date object that "looks" like the time in Bogota
  const bogotaDate = new Date(now.toLocaleString('en-US', { timeZone }));
  const dateStr = now.toLocaleDateString('en-CA', { timeZone }); // YYYY-MM-DD format

  return {
    fullDate: bogotaDate,
    dateStr,
    hour: parseInt(now.toLocaleTimeString('en-US', { timeZone, hour12: false, hour: 'numeric' })),
    day: bogotaDate.getDay(),
    month: bogotaDate.getMonth() + 1, // 1-12
    date: bogotaDate.getDate()
  };
};

const isColombianHoliday = () => {
  const { dateStr, month, date } = getBogotaTime();

  // Maestri Vacation block: Dec 27 to Jan 13
  if (month === 12 && date >= 27) return true;
  if (month === 1 && date <= 13) return true;

  return COLOMBIAN_HOLIDAYS.has(dateStr);
};

// Threshold for order total
const ORDER_TOTAL_THRESHOLD = 70000;

// Define product names for which "Envio reserva" applies
const reservaProducts = new Set(['Reserva'].map(normalizeText));

// Helper to find the "ciudad" parameter in various possible locations
const findCiudadValue = (item, normalizedShipmentCity) => {
  const emb = item._embedded || {};

  // 1. Search in fx:custom_fields (User requested priority)
  const custom_fields = emb['fx:custom_fields'] || item.custom_fields || [];
  if (Array.isArray(custom_fields)) {
    const found = custom_fields.find(f => f && normalizeText(f.name || '') === 'ciudad');
    if (found) return found.value;
  }

  // 2. Search in fx:item_options
  const options = emb['fx:item_options'] || item.item_options || item.options || [];
  if (Array.isArray(options)) {
    const found = options.find(o => o && normalizeText(o.name || '') === 'ciudad');
    if (found) return found.value;
  }

  // 3. Search in fx:attributes
  const attributes = emb['fx:attributes'] || item.attributes || [];
  if (Array.isArray(attributes)) {
    const found = attributes.find(a => a && normalizeText(a.name || '') === 'ciudad');
    if (found) return found.value;
  }

  // 4. Root level (avoiding clash with the target city)
  if (item.ciudad) return item.ciudad;
  if (item.city && normalizeText(item.city) !== normalizedShipmentCity) return item.city;

  return null;
};

app.post('/shipping', (request, response) => {
  try {
    const todayIsHoliday = isColombianHoliday();
    if (todayIsHoliday) {
      const { month, date } = getBogotaTime();
      if ((month === 12 && date >= 27) || (month === 1 && date <= 13)) {
        return response.send({
          ok: false,
          details: "Maestri Milano se encuentra en vacaciones colectivas. No se permiten pedidos del 27 de diciembre al 13 de enero.",
          message: "Maestri Milano se encuentra en vacaciones colectivas. No se permiten pedidos del 27 de diciembre al 13 de enero."
        });
      }
    }

    const shipment = request.body._embedded?.['fx:shipment'];
    const items = request.body._embedded?.['fx:items'] || [];
    const totalItemPrice = shipment?.total_item_price || 0;
    const normalizedCity = normalizeText(shipment?.shipping_address?.city || shipment?.city || '');
    const normalizedRegion = normalizeText(shipment?.shipping_address?.region || shipment?.region || '');
    const itemCount = shipment?.item_count || 0;

    const shippingResults = [];
    let hasReservaProduct = false;

    // 1. Filtering Logic
    for (const item of items) {
      const ciudadValue = findCiudadValue(item, normalizedCity);

      if (ciudadValue) {
        const rawValue = normalizeText(ciudadValue);
        const allowedCities = rawValue
          .split(/,| y /i)
          .map((c) => normalizeText(c))
          .filter((c) => c !== '');

        console.log(`Product "${item.name}" restriction found: [${allowedCities}]`);

        if (allowedCities.includes('todas')) continue;

        if (allowedCities.includes('bogota')) {
          if (barranquillaMonteria.has(normalizedCity)) {
            return response.send({
              ok: false,
              details: `El producto "${item.name}" no está disponible para ${shipment?.shipping_address?.city || 'tu ciudad'}.`,
              message: `El producto "${item.name}" no está disponible para ${shipment?.shipping_address?.city || 'tu ciudad'}.`
            });
          }
          continue;
        }

        if (!allowedCities.includes(normalizedCity)) {
          return response.send({
            ok: false,
            details: `El producto "${item.name}" no está disponible para ${shipment?.shipping_address?.city || 'tu ciudad'}.`,
            message: `El producto "${item.name}" no está disponible para ${shipment?.shipping_address?.city || 'tu ciudad'}.`
          });
        }
      } else {
        console.warn(`No city restriction found for product "${item.name}".`);
      }
    }

    // 2. Price Threshold Check
    if (totalItemPrice < ORDER_TOTAL_THRESHOLD) {
      return response.send({
        ok: false,
        details: 'El precio total debe ser mayor a 70,000 para ver las opciones de envío',
      });
    }

    // 3. Reserva Product Check
    for (const item of items) {
      if (item && item._embedded?.['fx:item_category']?.name) {
        const itemCategoryName = normalizeText(item._embedded['fx:item_category'].name);
        if (reservaProducts.has(itemCategoryName)) {
          hasReservaProduct = true;
          break;
        }
      }
    }

    // 4. Shipping Options (using prices from user snippet)
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
          method: 'Envío Bogotá',
          price: 8000,
          service_id: 10001,
          service_name: 'Envío Bogotá (24 – 48 Horas)',
        });

        const { hour: currentHour, day: currentDay } = getBogotaTime();

        if (
          !todayIsHoliday &&
          ((currentDay >= 1 && currentDay <= 5 && currentHour >= 6 && currentHour < 12) ||
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
    } else if (nearBogota.has(normalizedCity) || normalizedRegion === 'cundinamarca') {
      shippingResults.push({
        method: hasReservaProduct ? 'Envío producto reserva' : 'Envío Municipios Cerca a Bogotá',
        price: 15000,
        service_id: hasReservaProduct ? 10006 : 10003,
        service_name: hasReservaProduct ? 'Enviaremos tu producto cuando esté disponible' : 'Envío Municipios Cerca a Bogotá (24-48 hrs)',
      });
    } else if (barranquillaMonteria.has(normalizedCity)) {
      shippingResults.push({
        method: hasReservaProduct ? 'Envío producto reserva' : 'Envío a Barranquilla o Cartagena',
        price: 10000,
        service_id: hasReservaProduct ? 10006 : 10005,
        service_name: hasReservaProduct ? 'Enviaremos tu producto cuando esté disponible' : 'Envío Barranquilla o Cartagena (24 – 48 Horas)',
      });
    } else if (otherRegions.has(normalizedRegion)) {
      shippingResults.push({
        method: hasReservaProduct ? 'Envío producto reserva' : 'Envíos fuera de Bogotá',
        price: 39000,
        service_id: hasReservaProduct ? 10006 : 10004,
        service_name: hasReservaProduct ? 'Enviaremos tu producto cuando esté disponible' : 'Envíos fuera de Bogotá (5 días hábiles)',
      });
    }

    if (shippingResults.length === 0) {
      return response.send({
        ok: false,
        details: 'Shipping not available for your location',
      });
    }

    response.setHeader('Content-Type', 'application/json');
    response.send({ ok: true, data: { shipping_results: shippingResults } });

  } catch (error) {
    console.error('Error during shipping rate setup:', error);
    response.status(500).send('Error processing request');
  }
});

const PORT = process.env.PORT || 8016;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
/**
 * Service d'intégration Natcash (Natcom Haiti).
 *
 * Natcash utilise une API REST avec authentification par API key.
 * Le flow est similaire à MonCash : initier un paiement → redirect → callback.
 *
 * Variables d'environnement requises :
 *   NATCASH_MERCHANT_ID, NATCASH_API_KEY
 *   NATCASH_MODE = 'sandbox' | 'live'
 */
const { request } = require('undici');

const ENDPOINTS = {
  sandbox: {
    initiate: 'https://sandbox.natcash.natcom.com.ht/api/v1/payment/initiate',
    verify: 'https://sandbox.natcash.natcom.com.ht/api/v1/payment/verify',
  },
  live: {
    initiate: 'https://api.natcash.natcom.com.ht/api/v1/payment/initiate',
    verify: 'https://api.natcash.natcom.com.ht/api/v1/payment/verify',
  },
};

function getEndpoints() {
  const mode = process.env.NATCASH_MODE || 'sandbox';
  return ENDPOINTS[mode] || ENDPOINTS.sandbox;
}

function getHeaders() {
  const merchantId = process.env.NATCASH_MERCHANT_ID;
  const apiKey = process.env.NATCASH_API_KEY;

  if (!merchantId || !apiKey) {
    throw new Error('NATCASH_MERCHANT_ID et NATCASH_API_KEY requis');
  }

  return {
    'X-Merchant-Id': merchantId,
    'X-Api-Key': apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

/**
 * Initier un paiement Natcash.
 * @param {Object} params
 * @param {number} params.amount - Montant en HTG
 * @param {string} params.orderId - Identifiant unique de la commande
 * @param {string} params.callbackUrl - URL de callback après paiement
 * @returns {{ paymentUrl: string, reference: string }}
 */
async function createPayment({ amount, orderId, callbackUrl }) {
  const endpoints = getEndpoints();

  const { statusCode, body } = await request(endpoints.initiate, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      amount,
      orderId,
      callbackUrl,
      description: `Inscription tournoi — ${orderId}`,
    }),
  });

  const data = await body.json();

  if (statusCode < 200 || statusCode >= 300 || !data.paymentUrl) {
    throw new Error(`Natcash createPayment failed: ${JSON.stringify(data)}`);
  }

  return {
    paymentUrl: data.paymentUrl,
    reference: data.reference || orderId,
  };
}

/**
 * Vérifier le statut d'un paiement Natcash.
 * @param {string} orderId - L'orderId utilisé lors de la création
 * @returns {{ orderId: string, amount: number, status: string }}
 */
async function verifyPayment(orderId) {
  const endpoints = getEndpoints();

  const { statusCode, body } = await request(endpoints.verify, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ orderId }),
  });

  const data = await body.json();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Natcash verifyPayment failed: ${JSON.stringify(data)}`);
  }

  return {
    orderId: data.orderId || orderId,
    amount: data.amount || 0,
    status: data.status === 'SUCCESS' ? 'completed' : data.status === 'PENDING' ? 'pending' : 'failed',
    raw: data,
  };
}

module.exports = { createPayment, verifyPayment };

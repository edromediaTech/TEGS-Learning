/**
 * Service d'intégration MonCash (Digicel Haiti).
 *
 * API REST MonCash :
 * - Authentification OAuth2 (client_credentials) pour obtenir un access_token
 * - Création de paiement → retourne un redirect URL vers la page MonCash
 * - Vérification de transaction par transactionId
 *
 * Variables d'environnement requises :
 *   MONCASH_CLIENT_ID, MONCASH_CLIENT_SECRET
 *   MONCASH_MODE = 'sandbox' | 'live'
 */
const { request } = require('undici');

const ENDPOINTS = {
  sandbox: {
    auth: 'https://sandbox.moncashbutton.digicelgroup.com/Api/oauth/token',
    payment: 'https://sandbox.moncashbutton.digicelgroup.com/Api/v1/CreatePayment',
    retrieve: 'https://sandbox.moncashbutton.digicelgroup.com/Api/v1/RetrieveTransactionPayment',
    redirect: 'https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware',
  },
  live: {
    auth: 'https://moncashbutton.digicelgroup.com/Api/oauth/token',
    payment: 'https://moncashbutton.digicelgroup.com/Api/v1/CreatePayment',
    retrieve: 'https://moncashbutton.digicelgroup.com/Api/v1/RetrieveTransactionPayment',
    redirect: 'https://moncashbutton.digicelgroup.com/Moncash-middleware',
  },
};

function getEndpoints() {
  const mode = process.env.MONCASH_MODE || 'sandbox';
  return ENDPOINTS[mode] || ENDPOINTS.sandbox;
}

/**
 * Obtenir un access_token OAuth2 (client_credentials).
 */
async function getAccessToken() {
  const clientId = process.env.MONCASH_CLIENT_ID;
  const clientSecret = process.env.MONCASH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('MONCASH_CLIENT_ID et MONCASH_CLIENT_SECRET requis');
  }

  const endpoints = getEndpoints();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const { statusCode, body } = await request(endpoints.auth, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: 'scope=read,write&grant_type=client_credentials',
  });

  const data = await body.json();

  if (statusCode !== 200 || !data.access_token) {
    throw new Error(`MonCash auth failed: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * Créer un paiement MonCash.
 * @param {Object} params
 * @param {number} params.amount - Montant en HTG
 * @param {string} params.orderId - Identifiant unique de la commande (ex: transaction._id)
 * @returns {{ paymentUrl: string, token: string }} URL de redirection vers MonCash
 */
async function createPayment({ amount, orderId }) {
  const accessToken = await getAccessToken();
  const endpoints = getEndpoints();

  const { statusCode, body } = await request(endpoints.payment, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ amount, orderId }),
  });

  const data = await body.json();

  if (statusCode !== 202 || !data.payment_token) {
    throw new Error(`MonCash createPayment failed: ${JSON.stringify(data)}`);
  }

  return {
    paymentUrl: `${endpoints.redirect}/Payment/Redirect?token=${data.payment_token.token}`,
    token: data.payment_token.token,
  };
}

/**
 * Vérifier le statut d'une transaction MonCash.
 * @param {string} transactionId - L'ID de transaction retourné par MonCash
 * @returns {{ transactionId: string, amount: number, orderId: string, status: string }}
 */
async function verifyPayment(transactionId) {
  const accessToken = await getAccessToken();
  const endpoints = getEndpoints();

  const { statusCode, body } = await request(endpoints.retrieve, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ transactionId }),
  });

  const data = await body.json();

  if (statusCode !== 200 || !data.payment) {
    throw new Error(`MonCash verifyPayment failed: ${JSON.stringify(data)}`);
  }

  return {
    transactionId: data.payment.transaction_id,
    amount: data.payment.cost,
    orderId: data.payment.reference,
    status: data.payment.message === 'successful' ? 'completed' : 'failed',
    raw: data.payment,
  };
}

module.exports = { createPayment, verifyPayment };

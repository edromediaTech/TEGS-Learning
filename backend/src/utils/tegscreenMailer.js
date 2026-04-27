/**
 * Envoie le code d'activation TegScreen par email.
 *
 * Configuration via env :
 *   - SMTP_URL : ex. "smtps://user:pass@smtp.gmail.com:465"
 *   - SMTP_FROM (optionnel, default "TegScreen <noreply@tegslearning.com>")
 *
 * Si SMTP_URL n'est pas defini, on logge un avertissement et on retourne
 * false — le code reste visible dans la reponse API pour que l'admin
 * l'envoie manuellement.
 */

let cachedTransporter = null;
function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  if (!process.env.SMTP_URL) return null;
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (e) {
    console.warn('[tegscreen-mailer] nodemailer non installe');
    return null;
  }
  cachedTransporter = nodemailer.createTransport(process.env.SMTP_URL);
  return cachedTransporter;
}

/**
 * @param {string} email   adresse destinataire
 * @param {object} customer  document TegScreenCustomer
 * @returns {Promise<boolean>}  true si envoye, false si non configure
 */
async function sendActivationEmail(email, customer) {
  const transporter = getTransporter();
  if (!transporter) return false;

  const from = process.env.SMTP_FROM || 'TegScreen <noreply@tegslearning.com>';
  const subject = 'Votre code d\'activation TegScreen';
  const text =
`Bonjour,

Votre licence TegScreen est prete.

Code d'activation : ${customer.code}

Capacite :
  - PCs autorises : ${customer.numPcs}
  - Telephones simultanes par PC : ${customer.numPhonesPerPc}

Pour activer, lancez TegScreen et entrez votre email + ce code.
A bientot,
L'equipe TegScreen
`;
  const html = `
<p>Bonjour,</p>
<p>Votre licence <b>TegScreen</b> est prete.</p>
<p style="font-size: 1.5em; letter-spacing: 0.3em; font-family: monospace; background: #f4f4f4; padding: 12px 18px; display: inline-block; border-radius: 8px;">
  <b>${customer.code}</b>
</p>
<ul>
  <li>PCs autorises : <b>${customer.numPcs}</b></li>
  <li>Telephones simultanes par PC : <b>${customer.numPhonesPerPc}</b></li>
</ul>
<p>Pour activer, lancez TegScreen et entrez votre email + ce code.</p>
<p>A bientot,<br>L'equipe TegScreen</p>
`;

  await transporter.sendMail({ from, to: email, subject, text, html });
  return true;
}

module.exports = { sendActivationEmail };

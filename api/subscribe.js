// api/subscribe.js - Vercel Serverless Function
// Gère l'inscription Brevo pour Neoabita (listId: 65)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName, phone, source } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  // Formater le numéro de téléphone en format international
  let formattedPhone = '';
  if (phone) {
    // Enlever espaces, points, tirets, parenthèses
    let cleaned = phone.replace(/[\s.\-\(\)]/g, '');
    
    // Gérer le +33 ou 0033 déjà présent
    if (cleaned.startsWith('+33')) {
      formattedPhone = cleaned; // Déjà bon
    } else if (cleaned.startsWith('0033')) {
      formattedPhone = '+33' + cleaned.substring(4); // 0033612... -> +33612...
    } else if (cleaned.startsWith('33') && cleaned.length === 11) {
      formattedPhone = '+' + cleaned; // 33612... -> +33612...
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      formattedPhone = '+33' + cleaned.substring(1); // 0612... -> +33612...
    } else if (cleaned.length === 9 && !cleaned.startsWith('0')) {
      formattedPhone = '+33' + cleaned; // 612345678 -> +33612345678
    } else if (cleaned.length > 0) {
      formattedPhone = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
    }
  }

  // Liste Neoabita = 65
  const listId = 65;

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        attributes: {
          PRENOM: firstName || '',
          SMS: formattedPhone,
          SOURCE: source || 'neoabita-webinaire'
        },
        listIds: [listId],
        updateEnabled: true
      })
    });

    const data = await response.json();

    if (response.ok || response.status === 204) {
      return res.status(200).json({ success: true, message: 'Contact ajouté avec succès' });
    } else if (response.status === 400 && data.code === 'duplicate_parameter') {
      // Contact existe déjà, on le met à jour
      const updateResponse = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          attributes: {
            PRENOM: firstName || '',
            SMS: formattedPhone,
            SOURCE: source || 'neoabita-webinaire'
          },
          listIds: [listId]
        })
      });

      if (updateResponse.ok || updateResponse.status === 204) {
        return res.status(200).json({ success: true, message: 'Contact mis à jour' });
      }
    }

    console.error('Brevo error:', data);
    return res.status(response.status).json({ error: 'Erreur Brevo', details: data });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
}

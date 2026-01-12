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
          SMS: phone || '',
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
            SMS: phone || '',
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

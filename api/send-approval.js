export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const { to, subject, html, apiKey, attachments, from } = req.body || {};
  const resendApiKey = process.env.RESEND_API_KEY || apiKey;

  if (!resendApiKey) {
    return res.status(500).json({ error: 'Chave do Resend não configurada nas variáveis de ambiente do servidor (RESEND_API_KEY).' });
  }

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes: to, subject, html.' });
  }

  try {
    const emailPayload = {
      from: from || process.env.RESEND_FROM_EMAIL || 'Contaju Sistema <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Erro retornado pela API do Resend',
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      message: 'E-mail enviado com sucesso!',
      data
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Falha interna ao processar envio do e-mail',
      message: error.message
    });
  }
}

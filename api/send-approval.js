export default async function handler(req, res) {
  // Configurar CORS caso necessário
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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

  const { to, subject, html, apiKey } = req.body || {};
  const resendApiKey = apiKey || process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;

  if (!resendApiKey) {
    return res.status(500).json({ error: 'Chave do Resend não configurada nas variáveis de ambiente (RESEND_API_KEY).' });
  }

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes: to, subject, html.' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Contaju Sistema <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Erro retornado pela API do Resend',
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      message: 'E-mail de aprovação enviado com sucesso!',
      data
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Falha interna ao processar envio do e-mail',
      message: error.message
    });
  }
}

import dotenv from 'dotenv';
dotenv.config();

async function testResendAttachment() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('❌ RESEND_API_KEY não encontrada!');
    return;
  }

  const sampleJson = JSON.stringify({
    system: 'Contaju Contabilidade & Gestao',
    version: '2.5.0',
    test: true,
    date: new Date().toISOString()
  }, null, 2);

  const base64Content = Buffer.from(sampleJson).toString('base64');

  console.log('Testando envio de e-mail com anexo .json via Resend...');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Contaju Sistema <onboarding@resend.dev>',
      to: ['econtajuridico@gmail.com'],
      subject: '📦 Teste de Backup Automatizado .JSON - Contaju',
      html: '<p>Este é um teste da rotina automática de exportação de backup semanal do Contaju.</p>',
      attachments: [
        {
          filename: 'backup-teste-contaju.json',
          content: base64Content
        }
      ]
    })
  });

  const data = await response.json();
  console.log('Status HTTP:', response.status);
  console.log('Resposta Resend:', data);
}

testResendAttachment().catch(console.error);

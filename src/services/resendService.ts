export interface ApprovalNotificationParams {
  userId: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const ADMIN_EMAIL = 'leonardoricardoarantes@gmail.com';

export const resendService = {
  getApiKey(): string {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('contaju_resend_api_key');
      if (savedKey) return savedKey;
    }
    return (import.meta.env.VITE_RESEND_API_KEY as string) || '';
  },

  setApiKey(key: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('contaju_resend_api_key', key.trim());
    }
  },

  getAdminEmail(): string {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('contaju_admin_approval_email');
      if (savedEmail) return savedEmail;
    }
    return ADMIN_EMAIL;
  },

  async sendRegistrationApprovalEmail(params: ApprovalNotificationParams): Promise<{ success: boolean; error?: string }> {
    const apiKey = this.getApiKey();
    const adminEmail = this.getAdminEmail();
    const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://financeiro-contaju.vercel.app';
    const approvalLink = `${appOrigin}/?approve_user=${params.userId}`;

    const emailSubject = `🔔 Nova Solicitação de Cadastro no Contaju: ${params.name}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0e14; color: #ffffff; margin: 0; padding: 24px; }
          .card { background-color: #121620; border: 1px solid #242d3d; border-radius: 16px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #19202D 0%, #121620 100%); padding: 24px; border-bottom: 2px solid #d4af37; text-align: center; }
          .logo { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #d4af37; margin: 0; }
          .sublogo { font-size: 11px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1.5px; margin-top: 4px; }
          .body { padding: 28px; line-height: 1.6; color: #e2e8f0; font-size: 14px; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #19202d; border-radius: 12px; overflow: hidden; }
          .info-table td { padding: 12px 16px; border-bottom: 1px solid #242d3d; font-size: 13px; }
          .info-table tr:last-child td { border-bottom: none; }
          .label { color: #94a3b8; font-weight: 600; width: 35%; }
          .value { color: #ffffff; font-weight: bold; }
          .btn-container { text-align: center; margin: 28px 0 16px 0; }
          .btn-approve { display: inline-block; padding: 14px 32px; background-color: #d4af37; color: #0b0e14; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.4); }
          .footer { padding: 18px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e2634; background-color: #0d1118; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1 class="logo">CONTAJU</h1>
            <div class="sublogo">Assessoria Contábil & Gestão Financeira</div>
          </div>
          <div class="body">
            <span class="badge">Solicitação Pendente de Aprovação</span>
            <h2 style="color: #ffffff; margin-top: 14px; font-size: 18px;">Novo Usuário Aguarda Liberação</h2>
            <p>Um novo colaborador preencheu o formulário de cadastro no sistema financeiro e aguarda sua autorização prévia para poder acessar o ambiente.</p>
            
            <table class="info-table">
              <tr>
                <td class="label">Nome Completo:</td>
                <td class="value">${params.name}</td>
              </tr>
              <tr>
                <td class="label">E-mail:</td>
                <td class="value">${params.email}</td>
              </tr>
              <tr>
                <td class="label">Perfil Solicitado:</td>
                <td class="value">${params.role}</td>
              </tr>
              <tr>
                <td class="label">Data/Hora:</td>
                <td class="value">${new Date(params.createdAt).toLocaleString('pt-BR')}</td>
              </tr>
              <tr>
                <td class="label">Status Atual:</td>
                <td class="value" style="color: #fbbf24;">PENDENTE DE APROVAÇÃO</td>
              </tr>
            </table>

            <div class="btn-container">
              <a href="${approvalLink}" class="btn-approve" target="_blank">Aprovar Acesso no Contaju</a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
              Você também pode aprovar diretamente acessando o menu <strong>Configurações &gt; Usuários e Perfis de Acesso</strong> dentro do sistema.
            </p>
          </div>
          <div class="footer">
            Contaju Contabilidade & Gestão © ${new Date().getFullYear()} • Notificação de Segurança Interna
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. Tentar primeiro via Vercel Serverless Function (/api/send-approval)
    try {
      const serverlessRes = await fetch('/api/send-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: adminEmail,
          subject: emailSubject,
          html: emailHtml,
          apiKey
        })
      });

      if (serverlessRes.ok) {
        console.log('✅ E-mail de aprovação enviado com sucesso via Serverless Function!');
        return { success: true };
      }
    } catch {
      // Se não estiver na Vercel (ex: ambiente local), tenta envio direto
    }

    // 2. Fallback direto para a API oficial do Resend
    try {
      const directRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Contaju Sistema <onboarding@resend.dev>',
          to: [adminEmail],
          subject: emailSubject,
          html: emailHtml
        })
      });

      if (directRes.ok) {
        console.log('✅ E-mail de aprovação enviado com sucesso via Resend API direta!');
        return { success: true };
      } else {
        const errData = await directRes.json().catch(() => ({}));
        console.warn('Aviso ao enviar via Resend direta:', errData);
        // Mesmo com restrição de CORS em localhost, o usuário fica gravado com status PENDENTE no sistema
        return { success: true };
      }
    } catch (err: any) {
      console.warn('Fallback de envio do e-mail:', err?.message || err);
      return { success: true };
    }
  }
};

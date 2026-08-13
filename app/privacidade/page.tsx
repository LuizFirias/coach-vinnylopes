import type { Metadata } from "next";
import { LegalPageShell } from "@/app/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Política de Privacidade | Auronfit",
  description: "Política de Privacidade da plataforma Auronfit (LGPD).",
};

export default function PrivacidadePage() {
  return (
    <LegalPageShell
      title="Política de Privacidade"
      updatedAt="11 de agosto de 2026"
    >
      <Section title="1. Quem somos">
        <p>
          Esta Política descreve como o Auronfit trata dados pessoais de coaches
          e alunos, em conformidade com a Lei Geral de Proteção de Dados (LGPD
          — Lei nº 13.709/2018).
        </p>
      </Section>

      <Section title="2. Dados que coletamos">
        <ul>
          <li>
            <strong>Cadastro:</strong> nome, e-mail, telefone/WhatsApp, senha
            (armazenada de forma criptografada pelo provedor de autenticação),
            dados de perfil (ex.: data de nascimento, objetivo).
          </li>
          <li>
            <strong>Uso do produto:</strong> fichas de treino, planos
            alimentares, medidas, fotos de evolução, histórico de treinos,
            mensagens e preferências.
          </li>
          <li>
            <strong>Pagamentos:</strong> dados necessários ao processador
            (ex.: Asaas), como CPF/CNPJ e status de cobrança. Não armazenamos o
            número completo do cartão em nossos servidores.
          </li>
          <li>
            <strong>Técnicos:</strong> logs de acesso, identificadores de
            dispositivo, IP e cookies essenciais ao funcionamento.
          </li>
        </ul>
      </Section>

      <Section title="3. Finalidades">
        <ul>
          <li>Prestar e melhorar o serviço de gestão de treinos;</li>
          <li>Autenticar usuários e garantir segurança;</li>
          <li>Processar assinaturas e emitir cobranças;</li>
          <li>Comunicar avisos operacionais e suporte;</li>
          <li>Cumprir obrigações legais e defender direitos.</li>
        </ul>
      </Section>

      <Section title="4. Bases legais">
        <p>
          Tratamos dados com base em execução de contrato, legítimo interesse
          (segurança e melhoria do produto), consentimento quando exigido, e
          cumprimento de obrigação legal.
        </p>
      </Section>

      <Section title="5. Compartilhamento">
        <p>
          Podemos compartilhar dados com provedores essenciais: hospedagem,
          banco de dados, autenticação, e-mail transacional e processadores de
          pagamento. Não vendemos dados pessoais. Coaches têm acesso aos dados
          dos alunos vinculados à sua consultoria.
        </p>
      </Section>

      <Section title="6. Retenção e exclusão">
        <p>
          Mantemos dados enquanto a conta estiver ativa e pelo prazo necessário
          a obrigações legais. Você pode solicitar exclusão da conta e dos dados
          associados pelos canais do produto ou pelo e-mail de suporte, observados
          limites legais de retenção.
        </p>
      </Section>

      <Section title="7. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais razoáveis (controle de
          acesso, criptografia em trânsito, segregação de ambientes). Nenhum
          sistema é 100% isento de risco.
        </p>
      </Section>

      <Section title="8. Seus direitos (LGPD)">
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção,
          anonimização, portabilidade, eliminação de dados desnecessários,
          informação sobre compartilhamentos e revogação de consentimento, quando
          aplicável.
        </p>
      </Section>

      <Section title="9. Cookies">
        <p>
          Usamos cookies e armazenamento local essenciais à sessão e preferências
          (ex.: tema, “lembrar-me”). Não usamos cookies de publicidade de
          terceiros como parte central do produto.
        </p>
      </Section>

      <Section title="10. Contato do encarregado">
        <p>
          Para exercer direitos ou tirar dúvidas sobre privacidade:{" "}
          <a href="mailto:privacidade@auronfit.com.br">
            privacidade@auronfit.com.br
          </a>{" "}
          ou{" "}
          <a href="mailto:suporte@auronfit.com.br">suporte@auronfit.com.br</a>.
        </p>
      </Section>
    </LegalPageShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7 last:mb-0">
      <h2 className="text-base font-bold text-text-primary mb-2.5">{title}</h2>
      <div className="text-sm text-text-secondary leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-brand [&_a]:font-semibold [&_a]:hover:underline [&_strong]:text-text-primary">
        {children}
      </div>
    </section>
  );
}

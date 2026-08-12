import type { Metadata } from "next";
import { LegalPageShell } from "@/app/components/legal/LegalPageShell";

export const metadata: Metadata = {
  title: "Termos de Uso | Auronfit",
  description: "Termos de Uso da plataforma Auronfit.",
};

export default function TermosPage() {
  return (
    <LegalPageShell title="Termos de Uso" updatedAt="11 de agosto de 2026">
      <Section title="1. Aceitação">
        <p>
          Ao criar uma conta ou utilizar a plataforma Auronfit (“Auron”, “nós”),
          você concorda com estes Termos de Uso. Se não concordar, não utilize o
          serviço.
        </p>
      </Section>

      <Section title="2. O serviço">
        <p>
          O Auronfit é uma plataforma de gestão de treinos e acompanhamento para
          coaches (treinadores) e seus alunos, incluindo fichas de treino,
          nutrição, medidas, comunicação e, quando contratado, planos de
          assinatura pagos.
        </p>
      </Section>

      <Section title="3. Contas e responsabilidades">
        <ul>
          <li>
            Você é responsável por manter a confidencialidade da sua senha e
            pelo uso da conta.
          </li>
          <li>
            Coaches são responsáveis pelo conteúdo prescrito aos alunos e pelo
            relacionamento comercial com eles.
          </li>
          <li>
            Alunos devem fornecer informações verdadeiras e seguir orientações
            profissionais quando aplicável.
          </li>
          <li>
            É proibido usar a plataforma para fins ilícitos, spam, engenharia
            reversa abusiva ou violação de direitos de terceiros.
          </li>
        </ul>
      </Section>

      <Section title="4. Assinaturas e pagamentos">
        <p>
          Planos pagos (quando disponíveis) são cobrados conforme as condições
          exibidas no checkout. Períodos de teste, se houver, terminam na data
          indicada, podendo gerar cobrança automática se não houver cancelamento
          prévio. Cancelamentos seguem as regras da tela de assinatura e do
          processador de pagamento.
        </p>
      </Section>

      <Section title="5. Conteúdo do usuário">
        <p>
          Você mantém a titularidade do conteúdo que envia (treinos, planos,
          fotos, mensagens). Ao usar o Auronfit, concede-nos licença limitada
          para hospedar, processar e exibir esse conteúdo apenas para operar o
          serviço.
        </p>
      </Section>

      <Section title="6. Isenções importantes">
        <p>
          O Auronfit é uma ferramenta de gestão e não substitui acompanhamento
          médico ou nutricional presencial quando necessário. Orientamos que
          coaches e alunos busquem profissionais habilitados para questões de
          saúde. Não nos responsabilizamos por resultados físicos, lesões ou
          decisões tomadas com base em conteúdo gerado na plataforma.
        </p>
      </Section>

      <Section title="7. Disponibilidade">
        <p>
          Buscamos alta disponibilidade, mas o serviço pode sofrer interrupções
          por manutenção, falhas de rede ou de fornecedores. Não garantimos
          operação ininterrupta.
        </p>
      </Section>

      <Section title="8. Encerramento">
        <p>
          Você pode solicitar exclusão da conta conforme a LGPD. Podemos
          suspender ou encerrar contas que violem estes Termos ou a legislação
          aplicável.
        </p>
      </Section>

      <Section title="9. Alterações">
        <p>
          Podemos atualizar estes Termos. Alterações relevantes serão
          comunicadas na plataforma ou por e-mail. O uso contínuo após a
          publicação implica aceitação da versão atualizada.
        </p>
      </Section>

      <Section title="10. Contato">
        <p>
          Para questões sobre estes Termos:{" "}
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
      <div className="text-sm text-text-secondary leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-brand [&_a]:font-semibold [&_a]:hover:underline">
        {children}
      </div>
    </section>
  );
}

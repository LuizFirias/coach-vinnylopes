import "server-only";
import { Resend } from "resend";
import {
  getSubscriptionConfirmedHtml,
  getSubscriptionPaymentFailedHtml,
  getSubscriptionCancelledHtml,
  getSubscriptionPausedHtml,
} from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");
const FROM = "Auronfit <contato@auronfit.com.br>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.auronfit.com.br";

function fireAndForget(promise: Promise<unknown>) {
  promise.catch((err) => console.error("[SUBSCRIPTION-EMAIL]", err));
}

export function sendSubscriptionWelcomeEmail(
  email: string,
  fullName: string,
  planName: string,
  price: string
) {
  fireAndForget(
    resend.emails.send({
      from: FROM,
      to: email,
      subject: "Seu acesso ao AURON está liberado",
      html: getSubscriptionConfirmedHtml(fullName, planName, price, SITE_URL),
    })
  );
}

export function sendPaymentFailedEmail(email: string, fullName: string) {
  fireAndForget(
    resend.emails.send({
      from: FROM,
      to: email,
      subject: "Pagamento da assinatura não aprovado",
      html: getSubscriptionPaymentFailedHtml(fullName, `${SITE_URL}/admin/assinatura`),
    })
  );
}

export function sendSubscriptionCancelledEmail(
  email: string,
  fullName: string,
  accessUntil: string | null
) {
  fireAndForget(
    resend.emails.send({
      from: FROM,
      to: email,
      subject: "Assinatura cancelada",
      html: getSubscriptionCancelledHtml(fullName, accessUntil, SITE_URL),
    })
  );
}

export function sendSubscriptionPausedEmail(email: string, fullName: string) {
  fireAndForget(
    resend.emails.send({
      from: FROM,
      to: email,
      subject: "Sua assinatura está pausada",
      html: getSubscriptionPausedHtml(fullName, `${SITE_URL}/admin/assinatura`),
    })
  );
}

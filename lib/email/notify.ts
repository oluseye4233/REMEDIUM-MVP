import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_NOTIFY = 'notify@remediumsi.health'
const FROM_REPORTS = 'reports@remediumsi.health'
const FROM_BILLING = 'billing@remediumsi.health'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://remediumsi.health'

export const notify = {
  cvsVerified: (to: string, name: string) =>
    resend.emails.send({
      from: FROM_NOTIFY,
      to,
      subject: '✅ REMEDIUM SI — Your Credentials Are Verified!',
      text: `Hi ${name},\n\nYour credentials have been successfully verified. You can now generate Health Intelligence Reports.\n\nGet started: ${APP_URL}/hir/generate\n\nREMEDIUM SI Team`,
    }),

  cvsConditional: (to: string, name: string) =>
    resend.emails.send({
      from: FROM_NOTIFY,
      to,
      subject: '🔄 REMEDIUM SI — Additional Review Required',
      text: `Hi ${name},\n\nYour credential submission is under additional manual review. We will update you within 48 hours.\n\nIf you have questions, please contact support@remediumsi.health\n\nREMEDIUM SI Team`,
    }),

  cvsRejected: (to: string, name: string, reason?: string) =>
    resend.emails.send({
      from: FROM_NOTIFY,
      to,
      subject: '❌ REMEDIUM SI — Credential Verification Unsuccessful',
      text: `Hi ${name},\n\nUnfortunately your credential submission could not be verified.${reason ? `\n\nReason: ${reason}` : ''}\n\nPlease re-submit with clearer documentation or contact support@remediumsi.health for assistance.\n\nRe-submit: ${APP_URL}/cvs/submit\n\nREMEDIUM SI Team`,
    }),

  hirReady: (to: string, downloadUrl: string, hirType: string) =>
    resend.emails.send({
      from: FROM_REPORTS,
      to,
      subject: '📄 Your Health Intelligence Report is Ready',
      text: `Your ${hirType} Health Intelligence Report has been generated.\n\nDownload your report (link expires in 24 hours):\n${downloadUrl}\n\nView all your reports: ${APP_URL}/dashboard\n\nREMEDIUM SI Team`,
    }),

  lowCredits: (to: string, remaining: number) =>
    resend.emails.send({
      from: FROM_BILLING,
      to,
      subject: `⚠️ REMEDIUM SI — ${remaining} Report Credit${remaining === 1 ? '' : 's'} Remaining`,
      text: `You have ${remaining} report credit${remaining === 1 ? '' : 's'} remaining.\n\nTop up your credits: ${APP_URL}/billing\n\nREMEDIUM SI Team`,
    }),

  paymentFailed: (to: string, name: string) =>
    resend.emails.send({
      from: FROM_BILLING,
      to,
      subject: '⚠️ REMEDIUM SI — Payment Failed',
      text: `Hi ${name},\n\nYour recent payment could not be processed. Your subscription access may be affected.\n\nUpdate your payment method: ${APP_URL}/billing\n\nREMEDIUM SI Team`,
    }),

  subscriptionConfirmed: (to: string, name: string, plan: string, credits: number) =>
    resend.emails.send({
      from: FROM_BILLING,
      to,
      subject: '🎉 REMEDIUM SI — Subscription Confirmed',
      text: `Hi ${name},\n\nYour ${plan} subscription is now active. ${credits} report credits have been added to your account.\n\nStart generating reports: ${APP_URL}/hir/generate\n\nREMEDIUM SI Team`,
    }),
}

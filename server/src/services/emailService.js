const { Resend } = require('resend');

let resendClient;
const getResend = () => {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
};

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderPanel = (title, body, tone = 'blue') => {
  const tones = {
    blue: { bg: '#eff6ff', border: '#93c5fd', title: '#1d4ed8', text: '#1e3a8a' },
    teal: { bg: '#ecfeff', border: '#5eead4', title: '#0f766e', text: '#134e4a' },
    amber: { bg: '#fffbeb', border: '#fcd34d', title: '#b45309', text: '#92400e' },
    red: { bg: '#fef2f2', border: '#fca5a5', title: '#b91c1c', text: '#7f1d1d' },
    gray: { bg: '#f8fafc', border: '#cbd5e1', title: '#475569', text: '#334155' },
  };

  const palette = tones[tone] || tones.blue;

  return `
    <div style="margin:18px 0;padding:18px 20px;border:1px solid ${palette.border};border-radius:14px;background:${palette.bg};">
      <div style="margin-bottom:8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${palette.title};">
        ${escapeHtml(title)}
      </div>
      <div style="font-size:14px;line-height:1.8;color:${palette.text};">
        ${body}
      </div>
    </div>
  `;
};

const renderEmailLayout = ({
  eyebrow = 'Heritage City Scholarship Portal',
  title,
  subtitle,
  recipientName,
  intro,
  sections = [],
  ctaLabel,
  ctaUrl,
  footerNote,
  accent = '#0f3d6d',
  accentSoft = '#164f8c',
  ctaColor,
  logoUrl,
}) => `
  <div style="margin:0;padding:24px;background:#eef2f7;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ef;border-radius:18px;overflow:hidden;font-family:Arial,sans-serif;color:#334155;">
      <div style="background:linear-gradient(135deg, ${accent} 0%, ${accentSoft} 100%);padding:28px 32px 24px;">
        ${logoUrl ? `
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
          <img src="${logoUrl}" alt="Vigan City Seal" width="52" height="52" style="display:block;width:52px;height:52px;object-fit:contain;border-radius:50%;background:rgba(255,255,255,0.12);padding:4px;" />
          <div>
            <div style="font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#a7f3d0;">Heritage City Scholarship Portal</div>
            <div style="font-size:15px;font-weight:700;color:#ffffff;margin-top:2px;">City Government of Vigan</div>
            <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;margin-top:1px;">Province of Ilocos Sur</div>
          </div>
        </div>
        <div style="height:1px;background:rgba(255,255,255,0.15);margin-bottom:20px;"></div>
        ` : ''}
        <div style="text-align:center;">
          ${logoUrl ? '' : `<div style="font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#a7f3d0;">${escapeHtml(eyebrow)}</div>`}
          <h1 style="margin:${logoUrl ? '0' : '14px'} 0 0;font-size:28px;line-height:1.15;color:#ffffff;font-family:Georgia,serif;">
            ${escapeHtml(title)}
          </h1>
          <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#cbd5e1;">
            ${escapeHtml(subtitle)}
          </p>
        </div>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#1e293b;">
          Dear <strong>${escapeHtml(recipientName)}</strong>,
        </p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#475569;">
          ${intro}
        </p>

        ${sections.join('')}

        ${ctaLabel && ctaUrl ? `
          <div style="margin:28px 0 20px;text-align:center;">
            <a href="${ctaUrl}" style="display:inline-block;background:${ctaColor || accent};color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:12px;font-weight:700;font-size:14px;">
              ${escapeHtml(ctaLabel)}
            </a>
          </div>
        ` : ''}

        <div style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">
            ${escapeHtml(footerNote || 'This is an automated message from the scholarship portal. Please do not reply directly to this email.')}
          </p>
        </div>
      </div>
    </div>
  </div>
`;

const emailTemplates = {
  applicationSubmitted: (data) => ({
    subject: `Application Received - Reference #${data.refId}`,
    html: renderEmailLayout({
      title: 'Application Received',
      subtitle: 'Your scholarship application has been recorded successfully.',
      recipientName: data.name,
      intro: 'We received your scholarship application and it is now queued for review by the scholarship office.',
      sections: [
        renderPanel(
          'Reference Number',
          `Keep this application reference for tracking purposes:<br /><strong style="font-size:18px;color:#0f172a;font-family:monospace;">#${escapeHtml(data.refId)}</strong>`,
          'teal'
        ),
        renderPanel(
          'What Happens Next',
          'Your submitted details and uploaded requirements will be checked by the scholarship office. You will receive another email and a portal update once your application moves to the next stage.',
          'blue'
        ),
      ],
      ctaLabel: 'Check Application Status',
      ctaUrl: `${process.env.CLIENT_URL}/applicant/status`,
      footerNote: 'Please keep your portal email active and monitor both your inbox and applicant dashboard for updates.',
      accent: '#1E1B4B',
      accentSoft: '#0D9488',
    }),
  }),

  incomplete: (data) => ({
    subject: 'Action Required: Complete Your Requirements',
    html: renderEmailLayout({
      title: 'Requirements Need Attention',
      subtitle: 'Your application is waiting for the missing or incomplete requirements listed by the scholarship office.',
      recipientName: data.name,
      intro: `Your application${data.refId ? ` (Reference #${escapeHtml(data.refId)})` : ''} requires additional action before it can continue in the review process.`,
      sections: [
        data.remarks
          ? renderPanel('Remarks', escapeHtml(data.remarks), 'amber')
          : renderPanel('Next Step', 'Please log in to the portal and review the requirements that still need completion or correction.', 'amber'),
      ],
      ctaLabel: 'Go to Portal',
      ctaUrl: data.portalUrl || `${process.env.CLIENT_URL}/applicant/status`,
      accent: '#1E1B4B',
      accentSoft: '#0D9488',
    }),
  }),

  approved: (data) => ({
    subject: 'Congratulations! Please Submit Your COR',
    html: renderEmailLayout({
      title: 'Application Approved',
      subtitle: 'Your application passed review and is ready for the COR submission step.',
      recipientName: data.name,
      intro: `We are pleased to inform you that your scholarship application${data.refId ? ` (Reference #${escapeHtml(data.refId)})` : ''} has been approved.`,
      sections: [
        renderPanel('Next Step', 'Please log in to the portal and upload your Certificate of Registration (COR) to continue your scholarship processing.', 'teal'),
      ],
      ctaLabel: 'Submit COR Now',
      ctaUrl: data.portalUrl || `${process.env.CLIENT_URL}/applicant/cor`,
      accent: '#0D9488',
      accentSoft: '#10B981',
    }),
  }),

  corRejected: (data) => ({
    subject: 'Action Required: Resubmit Your COR',
    html: renderEmailLayout({
      title: 'COR Rejected',
      subtitle: 'Your uploaded COR needs correction before it can be accepted.',
      recipientName: data.name,
      intro: `Your submitted COR${data.refId ? ` for Reference #${escapeHtml(data.refId)}` : ''} has been reviewed and rejected.`,
      sections: [
        data.rejectionReason
          ? renderPanel('Reason', escapeHtml(data.rejectionReason), 'red')
          : renderPanel('Action Required', 'Please review the scholarship office remarks and upload a corrected COR through the portal.', 'red'),
      ],
      ctaLabel: 'Resubmit COR',
      ctaUrl: data.portalUrl || `${process.env.CLIENT_URL}/applicant/cor`,
      accent: '#EF4444',
      accentSoft: '#DC2626',
    }),
  }),

  accepted: (data) => ({
    subject: 'Welcome, Scholar! Your Application is Confirmed',
    html: renderEmailLayout({
      title: 'Welcome, Scholar',
      subtitle: 'Your scholarship application has been fully accepted and confirmed.',
      recipientName: data.name,
      intro: `We are pleased to officially welcome you to the scholarship program. Your application${data.refId ? ` (Reference #${escapeHtml(data.refId)})` : ''} has been fully accepted.`,
      sections: [
        renderPanel('Congratulations', 'This scholarship reflects the scholarship office\'s confidence in your potential and academic commitment. Please continue monitoring your portal for future notices.', 'teal'),
      ],
      ctaLabel: 'View Scholar Dashboard',
      ctaUrl: data.portalUrl || `${process.env.CLIENT_URL}/applicant/dashboard`,
      accent: '#1E1B4B',
      accentSoft: '#F59E0B',
    }),
  }),

  rejected: (data) => ({
    subject: 'Scholarship Application Update',
    html: renderEmailLayout({
      title: 'Application Update',
      subtitle: 'The scholarship office has completed its review of your application.',
      recipientName: data.name,
      intro: `Thank you for your interest in the scholarship program. After review, your application${data.refId ? ` (Reference #${escapeHtml(data.refId)})` : ''} was not selected at this time.`,
      sections: [
        data.rejectionReason
          ? renderPanel('Reason', escapeHtml(data.rejectionReason), 'gray')
          : renderPanel('Message', 'You may continue monitoring future scholarship announcements and apply again in a later cycle if you remain eligible.', 'gray'),
      ],
      accent: '#374151',
      accentSoft: '#6B7280',
    }),
  }),

  welcomeRegistration: (data) => ({
    subject: 'Welcome to the Vigan City Scholarship Portal',
    html: renderEmailLayout({
      title: 'Welcome to the Portal',
      subtitle: 'Your applicant account is ready to use.',
      recipientName: data.name,
      intro: 'Your scholarship portal account has been successfully created. You may now sign in and begin your scholarship application.',
      ctaLabel: 'Start Your Application',
      ctaUrl: `${process.env.CLIENT_URL}/applicant/apply`,
      accent: '#0f3d6d',
      accentSoft: '#164f8c',
    }),
  }),

  emailVerification: (data) => ({
    subject: 'Confirm Your Scholarship Portal Email',
    html: renderEmailLayout({
      title: 'Confirm Your Email',
      subtitle: 'Activate your scholarship portal account before your first sign in.',
      recipientName: data.name,
      intro: 'Your account has been created, but you still need to confirm the email address you used during registration.',
      sections: [
        renderPanel(
          'Important',
          'Click the confirmation button below to verify your email address. This confirmation link will expire in <strong>24 hours</strong>.',
          'amber'
        ),
        renderPanel(
          'Why This Step Is Required',
          'Email confirmation protects your applicant account and ensures that scholarship notices, requirement reminders, and status updates are sent to the correct inbox.',
          'blue'
        ),
      ],
      ctaLabel: 'Confirm Email Address',
      ctaUrl: data.verificationUrl,
      footerNote: 'If you did not register for the scholarship portal, you may ignore this message.',
      accent: '#0c2340',
      accentSoft: '#064e3b',
      ctaColor: '#10b981',
      logoUrl: `${process.env.CLIENT_URL}/logo.png`,
    }),
  }),

  notQualified: (data) => ({
    subject: 'Scholarship Application - Eligibility Result',
    html: renderEmailLayout({
      title: 'Eligibility Screening Result',
      subtitle: 'The scholarship office has finished the eligibility review for your application.',
      recipientName: data.name,
      intro: `After review, your application${data.refId ? ` (Reference #${escapeHtml(data.refId)})` : ''} did not meet the eligibility requirements for this scholarship cycle.`,
      sections: [
        data.remarks
          ? renderPanel('Remarks', escapeHtml(data.remarks), 'gray')
          : renderPanel('Message', 'Please review the published requirements and watch for the next application period if you plan to reapply.', 'gray'),
      ],
      accent: '#374151',
      accentSoft: '#6B7280',
    }),
  }),

  failedExam: (data) => ({
    subject: 'Scholarship Application - Exam/Interview Result',
    html: renderEmailLayout({
      title: 'Exam/Interview Result',
      subtitle: 'The scholarship office has completed the assessment stage of your application.',
      recipientName: data.name,
      intro: `Thank you for attending the exam/interview${data.refId ? ` for Reference #${escapeHtml(data.refId)}` : ''}. You did not pass this stage of the scholarship selection process.`,
      sections: [
        data.remarks
          ? renderPanel('Remarks', escapeHtml(data.remarks), 'gray')
          : renderPanel('Message', 'We appreciate your effort and encourage you to apply again in a future scholarship cycle.', 'gray'),
      ],
      accent: '#374151',
      accentSoft: '#6B7280',
    }),
  }),

  examScheduled: (data) => ({
    subject: 'Your Exam/Interview is Scheduled',
    html: renderEmailLayout({
      title: 'Exam/Interview Scheduled',
      subtitle: 'Please review your assessment schedule details carefully.',
      recipientName: data.name,
      intro: 'Your scholarship exam/interview schedule has been prepared. Please review the details below and arrive on time.',
      sections: [
        renderPanel(
          'Schedule Details',
          `<strong>Date and Time:</strong> ${escapeHtml(data.scheduledAt || 'Not specified')}<br />${data.location ? `<strong>Location:</strong> ${escapeHtml(data.location)}<br />` : ''}<strong>Type:</strong> ${escapeHtml(data.type || 'Not specified')}`,
          'teal'
        ),
      ],
      ctaLabel: 'View Details in Portal',
      ctaUrl: data.portalUrl || `${process.env.CLIENT_URL}/applicant/status`,
      accent: '#1E1B4B',
      accentSoft: '#0D9488',
    }),
  }),

  passwordReset: (data) => ({
    subject: 'Reset Your Scholarship Portal Password',
    html: renderEmailLayout({
      title: 'Password Reset Request',
      subtitle: 'A secure reset link has been prepared for your scholarship portal account.',
      recipientName: data.name,
      intro: 'We received a request to reset your scholarship portal password. If this request came from you, continue using the secure button below.',
      sections: [
        renderPanel(
          'Reset Window',
          'This password reset link will stay active for <strong>30 minutes</strong>. After that, you will need to request a new one.',
          'amber'
        ),
        renderPanel(
          'Security Reminder',
          'If you did not request this password reset, you can ignore this email. Your current password will remain unchanged until you complete the reset.',
          'blue'
        ),
      ],
      ctaLabel: 'Reset Password',
      ctaUrl: data.resetUrl,
      footerNote: 'For account safety, do not share your reset link with anyone.',
      accent: '#0c2340',
      accentSoft: '#064e3b',
      ctaColor: '#10b981',
      logoUrl: `${process.env.CLIENT_URL}/logo.png`,
    }),
  }),
};

const sendEmail = async ({ to, subject, template, data = {}, throwOnError = false }) => {
  try {
    const templateFn = emailTemplates[template];
    if (!templateFn) {
      console.warn(`Email template '${template}' not found`);
      return;
    }

    const rendered = templateFn(data);

    const from = process.env.EMAIL_FROM || 'Scholarship System <onboarding@resend.dev>';
    const { error } = await getResend().emails.send({
      from,
      to,
      subject: subject || rendered.subject,
      html: rendered.html,
    });

    if (error) throw new Error(error.message);
    console.log(`Email sent to ${to}: ${rendered.subject}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
    if (throwOnError) throw err;
  }
};

module.exports = { sendEmail };

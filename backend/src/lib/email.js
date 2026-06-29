import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 465,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP credentials not configured. Skipping email send to:', to);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"SkillSwap" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: wrapHtml(subject, html),
    });
    console.log(`✉️ Email sent to ${to} (${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    return false;
  }
};

function wrapHtml(title, content) {
  return `
    <div style="font-family: 'Inter', Helvetica, sans-serif; background-color: #EEEEF5; padding: 40px 20px; color: #272128;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background-color: #E92E20; padding: 30px 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">SkillSwap</h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px;">
          <h2 style="margin-top: 0; font-size: 20px; color: #E92E20;">${title}</h2>
          <div style="font-size: 16px; line-height: 1.6; color: #454049;">
            ${content}
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #F5F5F7; padding: 24px 40px; text-align: center; border-top: 1px solid #E5E5EA;">
          <p style="margin: 0; font-size: 13px; color: #828582;">
            You are receiving this email because of your notification preferences on SkillSwap.
            <br/>To unsubscribe, update your settings in the app.
          </p>
        </div>
        
      </div>
    </div>
  `;
}

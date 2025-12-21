const nodemailer = require("nodemailer");
require("dotenv").config();
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GOOGLE_APP_EMAIL,
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

const sendOtp = async (email, otp) => {
  try {
    return "message sent succesfully"
    const message = await transporter.sendMail({
      from: {
        name: "Royal Suit Admin",
        address: "mohammedsinan5023@gmail.com",
      },
      to: "zodphoenix4023@gmail.com",
      subject: "OTP For Youre Login",
      html: `<!DOCTYPE html>
   <html lang="en">
    <head>
         <meta charset="UTF-8">
       <title>Your One-Time Passcode</title>
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <style>
         /* Email-safe reset */
    body, table, td, p {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
    }
    body {
      background-color: #111319;
      color: #ffffff;
    }
    .wrapper {
      width: 100%;
      background-color: #111319;
      padding: 24px 0;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #17191e;
      border-radius: 12px;
      border: 1px solid rgba(75, 99, 255, 0.4);
      box-shadow: 0 12px 30px rgba(0,0,0,0.7);
      overflow: hidden;
    }
    .header {
      padding: 20px 24px 12px;
      text-align: center;
      background: linear-gradient(135deg, #17191e 0%, #22252b 100%);
    }
    .logo-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #4b63ff;
      text-transform: uppercase;
    }
    .sub-logo {
      font-size: 11px;
      color: #cfd2ff;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .content {
      padding: 20px 24px 24px;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #4b63ff;
      margin-bottom: 6px;
      text-align: left;
    }
    .greeting {
      font-size: 14px;
      color: #f5f5f5;
      margin-bottom: 8px;
    }
    .text {
      font-size: 13px;
      color: #c5c7d3;
      line-height: 1.6;
      margin-bottom: 18px;
    }
    .otp-box {
      margin: 0 auto 18px;
      padding: 14px 18px;
      border-radius: 10px;
      background: #111319;
      border: 1px solid rgba(75, 99, 255, 0.6);
      text-align: center;
    }
    .otp-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #9ea3ff;
      margin-bottom: 4px;
    }
    .otp-code {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.35em;
      color: #ffffff;
    }
    .meta {
      font-size: 12px;
      color: #8d90a3;
      margin-top: 4px;
    }
    .button-row {
      text-align: center;
      margin: 18px 0 10px;
    }
    .primary-btn {
      display: inline-block;
      padding: 10px 26px;
      border-radius: 999px;
      background-color: #4b63ff;
      color: #17191e;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
    }
    .footer {
      padding: 14px 24px 18px;
      border-top: 1px solid #232633;
      font-size: 11px;
      color: #7f8294;
      text-align: left;
      background-color: #17191e;
    }
    .footer strong {
      color: #cfd2ff;
    }

    @media (max-width: 600px) {
      .container { margin: 0 12px; }
      .otp-code { font-size: 24px; letter-spacing: 0.25em; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="container" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td class="header">
          <div class="logo-text">SUITMANAGER PRO</div>
          <div class="sub-logo">SECURE ACCESS</div>
        </td>
      </tr>
      <tr>
        <td class="content">
          <p class="title">Your verification code</p>
          <p class="greeting">Hi ${email},</p>
          <p class="text">
            Use the one‑time passcode below to complete your sign in to SuitManager Pro.
            This code is valid for a short time and can be used only once.
          </p>

          <div class="otp-box">
            <div class="otp-label">One‑Time Passcode</div>
            <div class="otp-code">${otp}</div>
            <div class="meta">Expires in 5–10 minutes.</div>
          </div>

          <div class="button-row">
            <a href="#" class="primary-btn">
              Open SuitManager Pro
            </a>
          </div>

          <p class="text" style="margin-top: 10px;">
            If you did not request this code, you can safely ignore this email.
            Someone may have typed your address by mistake.
          </p>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p><strong>Security tip:</strong> SuitManager Pro staff will never ask you to share this code over phone or chat.</p>
          <p style="margin-top: 6px;">© <%= new Date().getFullYear() %> SuitManager Pro. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`,
    });
    console.log(message.messageId);
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendOtp;

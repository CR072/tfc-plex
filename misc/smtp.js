const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "your-smtp-host",
  port: 587,
  secure: false,
  auth: {
    user: "your-smtp-username",
    pass: "your-smtp-password",
  },
});

async function sendEmail(to, subject, text) {
  const mailOptions = {
    from: "your-email@example.com",
    to: to,
    subject: subject,
    text: text,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };

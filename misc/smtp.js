const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.Host,
  port: process.env.Port,
  secure: false,
  auth: {
    user: process.env.username,
    pass: process.env.password,
  },
});

async function sendEmail(to, subject, text) {
  const mailOptions = {
    from: process.env.From,
    to: to,
    subject: subject,
    text: text,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };

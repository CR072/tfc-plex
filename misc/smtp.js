const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "host",
  port: 1080, // ur port
  secure: false,
  auth: {
    user: "user",
    pass: "pass",
  },
});

async function sendEmail(to, subject, text) {
  const mailOptions = {
    from: "from",
    to: to,
    subject: subject,
    text: text,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendEmail };

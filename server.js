const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./config/db');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'process.env.EMAIL',
    pass: 'process.env.EMAIL_PASSWORD'
  }
});



// Serve static files
app.use(express.static('views'));

// Register endpoint
app.post('/register', (req, res) => {
  const { username, password, firstname, lastname, email } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);
  const confirmationCode = crypto.randomBytes(16).toString('hex');

  const query = 'INSERT INTO users (username, password, firstname, lastname, email, confirmation_code) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(query, [username, hashedPassword, firstname, lastname, email, confirmationCode], (err, results) => {
    if (err) {
      console.error('Error inserting user:', err);
      return res.status(400).send('User already exists or email is already in use');
    }

    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Email Confirmation',
      text: `Please confirm your email by clicking on the following link: http://localhost:3000/confirm?code=${confirmationCode}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).send('Error sending confirmation email');
      }
      res.send('User registered successfully. Please check your email for confirmation.');
    });
  });
});

// Confirm endpoint
app.get('/confirm', (req, res) => {
  const { code } = req.query;
  const query = 'UPDATE users SET is_confirmed = true WHERE confirmation_code = ?';

  db.query(query, [code], (err, results) => {
    if (err || results.affectedRows === 0) {
      console.error('Error confirming email:', err);
      return res.status(400).send('Invalid confirmation code');
    }
    res.sendFile(path.join(__dirname, 'views', 'confirm.html'));
  });
});

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT password, is_confirmed FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err || results.length === 0) {
      console.error('User not found:', err);
      return res.status(400).send('User not found');
    }

    if (!results[0].is_confirmed) {
      return res.status(401).send('Please confirm your email first');
    }

    const isPasswordValid = bcrypt.compareSync(password, results[0].password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid password');
    }

    res.send('Login successful');
  });
});

// Serve HTML files
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/confirm', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'confirm.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

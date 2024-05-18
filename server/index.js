const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const axios = require('axios');

// Server Variable Setup
dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());


// Database Variables
const db = mysql.createConnection({
 host: process.env.ADMIN_DATABASE_HOSTNAME,
  user: process.env.ADMIN_DATABASE_USERNAME,
  password: process.env.ADMIN_DATABASE_PASSWORD,
  database: process.env.ADMIN_DATABASE_DBNAME
});


// Database Connection
db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});


// Route to login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE user_email = ? AND user_password = ?"; 
  db.query(sql, [email, password], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }

    if (data.length > 0) {
      return res.status(200).json({ message: 'Valid User' });
    } else {
      return res.status(404).json({ message: 'Invalid User' });
    }
  });
});

// Nodemailer configuration [ Please Config this asap]
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ampanna.otp@gmail.com',
    pass: 'AmpannaSL123@'
  }
});

// Route to send email [ Please Config this asap]
app.post('/send-email', (req, res) => {
  const { to, subject, text } = req.body;

  const mailOptions = {
    from: 'ampanna.otp@gmail.com',
    to: to,
    subject: subject,
    text: text
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).send('Error sending email');
    } else {
      console.log('Email sent: ' + info.response);
      return res.status(200).send('Email sent successfully');
    }
  });
});


// Route to change Password
app.post('/change-password', async (req, res) => {
const { email, password, updatedPassword } = req.body;

if(password === updatedPassword) {
  return res.status(400).json({ message: 'New password cannot be same as old password' });
}
else{


    const sql = "SELECT * FROM users WHERE user_email = ? AND user_password = ?"; 
  db.query(sql, [email, password], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }

    if (data.length > 0) {


      const updateSql = "UPDATE users SET user_password = ? WHERE user_email = ?"; 
      db.query(updateSql, [updatedPassword, email], (err, data) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
        }
        return res.status(200).json({ message: 'Password updated successfully' });
      });

    } else {
      return res.status(404).json({ message: 'Invalid User' });
    }
  });

}})

// Route to check User Availability
app.get('/check-availability', (req, res) => {
  const { email } = req.body;

  const sql = "SELECT * FROM users WHERE user_email = ?"; 
  db.query(sql, [email], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }

    if (data.length > 0) {
      return res.status(200).json({ message: 'User already exists' });
    } else {
      return res.status(404).json({ message: 'User is available' });
    }
  });
});

//Route to get the last user ID
app.get('/last-user-id', (req, res) => {
  const sql = "SELECT * FROM users ORDER BY user_id DESC LIMIT 1"; 
  db.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.length > 0) {
      const lastUserId = data[0].user_id;
      return res.status(200).json({ lastUserId });
    } else {
      return res.status(404).json({ message: 'No users found' });
    }
}) ;
});


//  Generate Next User ID
function generateNextUserId(currentUserId) {

  const numericPart = parseInt(currentUserId.substring(4)); 
  const nextNumericPart = numericPart + 1;
  const nextUserId = "USER" + nextNumericPart.toString().padStart(4, "0"); 
  return nextUserId;

}

// Route to register a user
app.post('/register', async (req, res) => {
  try {
    // Make a GET request to the /last-user-id endpoint
    const response = await axios.get('http://localhost:8081/last-user-id');
    const lastUserId = response.data.lastUserId;

    // Generate the next user ID using the lastUserId
    const nextUserId = generateNextUserId(lastUserId);
    const userStatus = "Online";

    const { name, email, password } = req.body;

    // SQL query to insert a new user
    const sql = "INSERT INTO users (user_id, user_name, user_email, user_password, user_status) VALUES (?, ?, ?, ?, ?)"; 
    db.query(sql, [nextUserId, name, email, password, userStatus], (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
      }
      return res.status(200).json({ message: 'User registered successfully', userId: nextUserId });
    });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
  }
});


// Start server
app.listen(8081, () => {
  console.log("Listening on port 8081");
});

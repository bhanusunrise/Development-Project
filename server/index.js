const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser'); // Ensure you can read POST data

const app = express();
app.use(cors());
app.use(bodyParser.json()); // Parse JSON request bodies

const db = mysql.createConnection({
  host: "localhost",
  user: 'root',
  password: '',
  database: 'development_project_beta'
});

app.get('/', (req, res) => {
  return res.json("From backend side");
});

app.post('/login', (req, res) => {
  const { username, password } = req.body; // Extract username and password from request

  const sql = "SELECT * FROM users WHERE user_email = ? AND user_password = ?"; // Query to find user
  db.query(sql, [username, password], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    if (data.length > 0) {
      return res.status(200).json({ message: 'User is available' });
    } else {
      return res.status(404).json({ message: 'User is not available' });
    }
  });
});

app.listen(8081, () => {
  console.log("Listening on port 8081");
});

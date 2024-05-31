const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');


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

app.post('/login', async (req, res) => {

  const { email, password } = req.body;

  const sql = "SELECT user_id, user_name, user_email, user_profile_url, user_status  FROM users WHERE user_email = ? AND user_password = ?"; 

  var hashedPassword = await getHashedPassword(password);
  console.log(email, password, hashedPassword);
  db.query(sql, [email, hashedPassword], (err, data) => {
    if (err) {
      //console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }

    if (data.length > 0) {
      req.session.email = result[0].email;
      console.log(req.session.email);
      return res.status(200).json({ message: 'Signining in ...' });
    } else {
      return res.status(404).json({ message: 'Username or password is incorrect' });
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
const { email, updatedPassword } = req.body;
const updatedHashedPassword = await getHashedPassword(updatedPassword);


const sql = "SELECT user_password FROM users WHERE user_email = ?"; 
  db.query(sql, [email], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }

    if (data.length > 0) {

      

      const updateSql = "UPDATE users SET user_password = ? WHERE user_email = ?"; 
      db.query(updateSql, [updatedHashedPassword, email], (err, data) => {
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

})

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
       return res.status(200).json({ lastUserId: 'USER1000' });
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

//  Generate Hashed Password
async function getHashedPassword(password) {
  const additionalFront = "$2b$10$";
  const additionalBack = "$asd";
  password = additionalFront + password + additionalBack;

  // Create MD5 hash of the modified password
  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

  return hashedPassword;
}
// Route to register a user
app.post('/register', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:8081/last-user-id');
    const lastUserId = response.data.lastUserId;
    console.log(lastUserId);

    if (lastUserId === '' || lastUserId === 'No users found' || lastUserId === null) {
      lastUserId = 'USER1000';
    }

    const nextUserId = generateNextUserId(lastUserId);
    const userStatus = "Offline";
    const userRestriction = "Allowed";
    const userPosition = "Open";

    const { name, email, password } = req.body;

    const hashedPassword = await getHashedPassword(password);

    const sql = "INSERT INTO users (user_id, user_name, user_email, user_password, user_status, user_restriction, user_position) VALUES (?, ?, ?, ?, ?, ?, ?)"; 
    db.query(sql, [nextUserId, name, email, hashedPassword, userStatus, userRestriction, userPosition], (err, data) => {
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

// Route to get single user
app.get('/user/:id', (req, res) => {
  const { id } = req.params;
  const sql = "SELECT user_id, user_name, user_email, user_profile_url, user_status FROM users WHERE user_id = ?"; 
  db.query(sql, [id], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.length > 0) {
      return res.status(200).json({ user: data[0] });
    } else {
      return res.status(404).json({ message: 'User not found' });
    }
  });
});

//Route to get all users with profile url
app.get('/users', (req, res) => {
  const sql = "SELECT user_id, user_name, user_email, user_profile_url, user_status, user_restriction, user_position FROM users"; 
  db.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.length > 0) {
      return res.status(200).json({ users: data });
    } else {
      return res.status(404).json({ message: 'No users found' });
    }
  });
});

//Route to get all users without profile url
app.get('/usersList', (req, res) => {
  const sql = "SELECT user_id, user_name, user_email, user_status, user_restriction, user_position FROM users"; 
  db.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.length > 0) {
      return res.status(200).json({ users: data });
    } else {
      return res.status(404).json({ message: 'No users found' });
    }
  });
});

//Route to change the restriction stage
app.post('/swapRestrict', (req, res) => {
  const {user_id, user_restriction} = req.body;
  const updateSql = "UPDATE users SET user_restriction= ? where user_id = ?";

  var newRestriction = "Allowed"

  if(user_restriction === 'Allowed'){
    newRestriction = "Restricted"
  } else{
    newRestriction = "Allowed";
  }

  db.query(updateSql, [newRestriction, user_id], (err, data) => {

     if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
        }
        return res.status(200).json({ message: 'Restriction Updated Successfully' });
      });
})

// Route to Get last hardware ID
app.get('/last-hardware-id', (req, res) => {
  
  const sql = "SELECT * FROM hardwares ORDER BY hardware_id DESC LIMIT 1"; 

  db.query(sql, (err, data) => {

    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });

    }
    if (data.length > 0) {

      const lastHardwareId = data[0].hardware_id;
      return res.status(200).json({ lastHardwareId });

    } else {
       return res.status(200).json({ lastHardwareId: 'SHOP100000' });
    }
}) ;
})


//  Function to generate next hardware ID

function generateNextHardwareId(lastHardwareId) {
  const numericPart = parseInt(lastHardwareId.replace('SHOP', '')) + 1;
  return 'SHOP' + numericPart.toString().padStart(5, '0');
}

// Route to Register a Hardware

app.post('/registerHardware', async (req, res) => {
  try {
    const { hardware_name, hardware_address, hardware_contact_no } = req.body;

    // Check if hardware_address already exists
    const checkResponse = await new Promise((resolve, reject) => {
      const checkSql = "SELECT hardware_id FROM hardwares WHERE hardware_address = ?";
      db.query(checkSql, [hardware_address], (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });

    if (checkResponse.length > 0) {
      return res.status(400).json({ message: 'Hardware address already exists' });
    }

    const response = await axios.get('http://localhost:8081/last-hardware-id');
    let lastHardwareId = response.data.lastHardwareId;

    if (!lastHardwareId || lastHardwareId === 'No hardware found' || lastHardwareId === null) {
      lastHardwareId = 'SHOP10000';
    }

    const nextHardwareId = generateNextHardwareId(lastHardwareId);

    const sql = "INSERT INTO hardwares (hardware_id, hardware_name, hardware_address, hardware_contact_no) VALUES (?, ?, ?, ?)";
    db.query(sql, [nextHardwareId, hardware_name, hardware_address, hardware_contact_no], (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
      }
      return res.status(200).json({ message: 'Hardware registered successfully', hardwareId: nextHardwareId });
    });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
  }
});


// Route to get a single hardware

app.get('/hardware/:address', (req, res) => {
  const { address } = req.params;
  const sql = "SELECT hardware_id, hardware_address, hardware_name, hardware_contact_no FROM hardwares WHERE hardware_address = ?"; 
  db.query(sql, [address], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.length > 0) {
      return res.status(200).json({ hardware: data[0] });
    } else {
      return res.status(404).json({ message: 'Hardware not found' });
    }
  });
});

// Route to get all hardwares

app.get('/hardwares', (req, res) => {
  const sql = "SELECT hardware_id, hardware_address, hardware_name, hardware_contact_no FROM hardwares"; 
  db.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.length > 0) {
      return res.status(200).json({ hardwares: data });
    } else {
      return res.status(404).json({ message: 'No hardwares found' });
    }
  });
});

//  Route to update a single hardware

app.put('/hardwareChange/:address', (req, res) => {
  const { address } = req.params;
  const { hardware_name, hardware_address, hardware_contact_no } = req.body;
  const sql = "UPDATE hardwares SET hardware_name = ?, hardware_address = ?, hardware_contact_no = ? WHERE hardware_address = ?";
  db.query(sql, [hardware_name, hardware_address, hardware_contact_no, address], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.affectedRows > 0) {
      return res.status(200).json({ message: 'Hardware updated successfully' });
    } else {
      return res.status(404).json({ message: 'Hardware not found' });
    }
  });
});

//  Route to delete a single hardware

app.delete('/hardwareDelete/:address', (req, res) => {
  const { address } = req.params;
  const sql = "DELETE FROM hardwares WHERE hardware_address = ?";
  db.query(sql, [address], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.affectedRows > 0) {
      return res.status(200).json({ message: 'Hardware deleted successfully' });
    } else {
      return res.status(404).json({ message: 'Hardware not found' });
    }
  });
});

// Route to read all packages

app.get('/packages', (req, res) => {
  const sql = "SELECT * FROM packages";
  db.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.length > 0) {
      return res.status(200).json({ packages: data });
    } else {
      return res.status(404).json({ message: 'No packages found' });
    }
  });
});

// Route to get latest package id

app.get('/latestPackageId', (req, res) => {
  const sql = "SELECT package_id FROM packages ORDER BY package_id DESC LIMIT 1";
  db.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.length > 0) {
      return res.status(200).json({ latestPackageId: data[0].package_id });
    } else {
      return res.status(404).json({ message: 'No packages found' });
    }
  });
});

// Function to generate the next package id

async function generateNextPackageId() {
  try {
    const response = await axios.get('http://localhost:8081/latestPackageId');
    if (response.status === 200) {
      const latestPackageId = response.data.latestPackageId;
      const numericPart = parseInt(latestPackageId.replace('PACK', ''));
      const nextNumericPart = numericPart + 1;
      return `PACK${nextNumericPart}`;
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // If no packages are found, return the default ID
      return 'PACK101';
    }
    console.error('Error generating next package ID:', error);
    throw new Error('Unable to generate next package ID');
  }
}

// Route to register a new package

app.post('/registerPackage', async (req, res) => {
  const {package_name, package_price, package_expire_time } = req.body;

  const validate_package_price = checkRange(package_price, null, 0);
  const validate_package_expire_time = checkRange(package_expire_time, null, 30);

  if (!validate_package_price || !validate_package_expire_time) {
    return res.status(400).json({ message: 'Invalid package price or expire time' });
  }

    if(!validatePackageCount){
    return res.status(400).json({ message: 'Sorry. We are in a trouble.' });
  }

  const sql = "INSERT INTO packages (package_id, package_name, package_price, package_expire_time) VALUES (?, ?, ?, ?)";

  const package_id = await generateNextPackageId();
  db.query(sql, [package_id, package_name, package_price, package_expire_time], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    return res.status(200).json({ message: 'Package registered successfully' });
  });
});

// Route to update a single package

app.put('/packageUpdate/:package_id', (req, res) => {
  const { package_id } = req.params;
  const { package_name, package_price, package_expire_time, package_display } = req.body;

  const validate_package_price = checkRange(package_price, null, 0);
  const validate_package_expire_time = checkRange(package_expire_time, null, 30);

  if (!validate_package_price || !validate_package_expire_time) {
    return res.status(400).json({ message: 'Invalid package price or expire time' });
  }

  if(!validatePackageCount){
    return res.status(400).json({ message: 'Sorry. We are in a trouble.' });
  }


  const sql = "UPDATE packages SET package_name = ?, package_price = ?, package_expire_time = ?, package_display = ? WHERE package_id = ?";
  db.query(sql, [package_name, package_price, package_expire_time, package_display,package_id], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.affectedRows > 0) {
      return res.status(200).json({ message: 'Package updated successfully' });
    } else {
      return res.status(404).json({ message: 'Package not found' });
    }
  });
});

// Route to get all package features

app.get('/packageFeatures/:package_id', (req, res) => {
    const { package_id } = req.params;
    const sql = "SELECT * FROM package_features WHERE package_id = ?";
    db.query(sql, [package_id], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
        }
        if (data.length > 0) {
            return res.status(200).json({ packageFeatures: data });
        } else {
            return res.status(404).json({ message: 'No package features found' });
        }
    });
});

// Route to delete a single package

app.delete('/packageDelete/:package_id', (req, res) => {
  const { package_id } = req.params;
  const sql = "DELETE FROM packages WHERE package_id = ?";
  db.query(sql, [package_id], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.affectedRows > 0) {
      return res.status(200).json({ message: 'Package deleted successfully' });
    } else {
      return res.status(404).json({ message: 'Package not found' });
    }
  });
});

// Route to add a new package feature

app.post('/addPackageFeature', async (req, res) => {
  try {
    const { feature, package_id } = req.body;
    const feature_id = await generateNextPackageFeatureId();  // Await the function here
    const sql = "INSERT INTO package_features (feature_name, package_id, feature_id) VALUES (?, ?, ?)";
    db.query(sql, [feature, package_id, feature_id], (err, data) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
      }
      return res.status(200).json({ message: 'Package feature added successfully' });
    });
  } catch (error) {
    console.error('Error adding package feature:', error);
    return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
  }
});

// Function to generate the next package feature id
async function generateNextPackageFeatureId() {
  try {
    const response = await axios.get('http://localhost:8081/latestPackageFeatureId');
    if (response.status === 200) {
      const latestPackageFeatureId = response.data.latestPackageFeatureId;
      const numericPart = parseInt(latestPackageFeatureId.replace('FEAT', ''));
      const nextNumericPart = numericPart + 1;
      return `FEAT${nextNumericPart}`;
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // If no package features are found, return the default ID
      return 'FEAT101';
    }
    console.error('Error generating next package feature ID:', error);
    throw new Error('Unable to generate next package feature ID');
  }
}

// Route to get the latest package feature id
app.get('/latestPackageFeatureId', (req, res) => {
  const sql = "SELECT feature_id FROM package_features ORDER BY feature_id DESC LIMIT 1";
  db.query(sql, (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    if (data.length > 0) {
      return res.status(200).json({ latestPackageFeatureId: data[0].feature_id });
    } else {
      return res.status(404).json({ message: 'No package features found' });
    }
  });
});


// Route to delete a single package feature

app.delete('/deletePackageFeature/:feature_id', (req, res) => {
  const { feature_id } = req.params;
  const sql = "DELETE FROM package_features WHERE feature_id = ?";
  
  db.query(sql, [feature_id], (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
    }
    
    if (data.affectedRows > 0) {
      return res.status(200).json({ message: 'Package feature deleted successfully' });
    } else {
      return res.status(404).json({ message: 'Package feature not found' });
    }
  });
});


// Function to check range

function checkRange(value, upperRange, lowerRange) {
 if (upperRange === null || upperRange === undefined || upperRange === '') {
   return value >= lowerRange;
 } else if (lowerRange === null || lowerRange === undefined || lowerRange === '') {
   return value <= upperRange;
 } else {
   return value >= lowerRange && value <= upperRange;
 }
}


// Route to update a feature

app.put('/updateFeature/:feature_id', (req, res) => {
    const { feature_id } = req.params;
    const { feature_name } = req.body;
    const sql = "UPDATE package_features SET feature_name = ? WHERE feature_id = ?";
    db.query(sql, [feature_name, feature_id], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
        }
        if (data.affectedRows > 0) {
            return res.status(200).json({ message: 'Feature updated successfully' });
        } else {
            return res.status(404).json({ message: 'Feature not found' });
        }
    });
});


// Route to get all accessible packages

app.get('/getAccessiblePackages', (req, res) => {
    const sql = "SELECT * FROM packages WHERE package_display = 'Y'";
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
        }
        if (data.length > 0) {
            return res.status(200).json({ accessiblePackages: data });
        } else {
            return res.status(404).json({ message: 'No accessible packages found' });
        }
    });
});


// Route to get Displaying enabled package count

app.get('/getEnabledPackageCount', (req, res) => {
    const sql = "SELECT COUNT(*) AS count FROM packages WHERE package_display = 'Y'";
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
        }
        if (data.length > 0) {
            return res.status(200).json({ enabledPackageCount: data[0].count });
        } else {
            return res.status(404).json({ message: 'No enabled packages found' });
        }
    });
});

// Function to validate package count
async function validatePackageCount() {
    try {
        // Fetch enabled package count
        const response = await axios.get('http://localhost:8081/getEnabledPackageCount');
        const enabledPackageCount = response.data.enabledPackageCount;

        // Validate package count
        if (enabledPackageCount > 4) {
            return false;
        } 
        return true;

    } catch (error) {
        console.error('Error validating package count:', error);
        // Handle error, return true by default
        return true;
    }
}

app.get('/searchPackages', (req, res) => {
    let { 
      package_name, 
      package_price_lower_range, 
      package_price_upper_range, 
      expire_time_lower_range, 
      expire_time_upper_range,
      package_display_status
    } = req.query; // Use req.query to parse query parameters

    if(package_price_lower_range === null || package_price_lower_range === undefined || package_price_lower_range === ''){
        package_price_lower_range = 0;
    }

    if(package_price_upper_range === null || package_price_upper_range === undefined || package_price_upper_range === ''){
        package_price_upper_range = 9999999999;
    }

    if(expire_time_lower_range === null || expire_time_lower_range === undefined || expire_time_lower_range === ''){
        expire_time_lower_range = 0;
    }

    if(expire_time_upper_range === null || expire_time_upper_range === undefined || expire_time_upper_range === ''){
        expire_time_upper_range = 9999999;
    }

    let sql;
    let params;

    if(package_display_status === null || package_display_status === undefined || package_display_status === ''){
        sql = "SELECT * FROM packages WHERE package_name LIKE ? AND package_price >= ? AND package_price <= ? AND package_expire_time >= ? AND package_expire_time <= ?";
        params = [`%${package_name}%`, package_price_lower_range, package_price_upper_range, expire_time_lower_range, expire_time_upper_range];
    } else {
        sql = "SELECT * FROM packages WHERE package_name LIKE ? AND package_price >= ? AND package_price <= ? AND package_expire_time >= ? AND package_expire_time <= ? AND package_display = ?";
        params = [`%${package_name}%`, package_price_lower_range, package_price_upper_range, expire_time_lower_range, expire_time_upper_range, package_display_status];
    }

    db.query(sql, params, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Sorry. We are in a trouble.' });
        }
        if (data.length > 0) {
            return res.status(200).json({ packages: data });
        } else {
            return res.status(404).json({ message: 'No packages found' });
        }
    });
});


// Start server
app.listen(8081, () => {
  console.log("Listening on port 8081");
});



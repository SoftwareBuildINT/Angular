const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const app = express();
app.use(cors());

// Add the body parsing middleware
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

const connection = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'H_surveillance',
});
// Function to hash the password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

app.post('/register', async (req, res) => {
  const { EmailId, password, FirstName, LastName, contact, role_id } = req.body;

  if (!EmailId || !password || !FirstName || !LastName || !contact || !role_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if the user with the given EmailId already exists
    connection.query(
      'SELECT email_id FROM users WHERE email_id = ?',
      [EmailId],
      (err, results) => {
        if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length > 0) {
          return res.status(409).json({ error: 'Email is already in use' });
        }

        // Proceed with registration if the email is not in use
        hashPassword(password).then((hashedPassword) => {
          connection.query(
            'INSERT INTO users (email_id, password, first_name, last_name, contact, role_id) VALUES (?, ?, ?, ?, ?, ?)',
            [EmailId, hashedPassword, FirstName, LastName, contact, role_id],
            (err, results) => {
              if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ error: 'Internal server error' });
              }
              return res.status(201).json({ message: 'User registered successfully' });
            }
          );
        }).catch((error) => {
          console.error('Error during password hashing:', error);
          return res.status(500).json({ error: 'Internal server error' });
        });
      }
    );
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// Login route
app.post('/login', async (req, res) => {
  const { EmailId, password } = req.body;

  if (!EmailId || !password) {
    return res.status(400).json({ error: 'EmailId and password are required' });
  }

  try {
    // Fetch user details from the database based on the provided email
    connection.query(
      'SELECT * FROM users WHERE email_id = ?',
      [EmailId],
      async (err, results) => {
        if (err) {
          console.error('Database query error:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (results.length === 0) {
          console.log('User not found:', EmailId);
          return res.status(401).json({ error: 'Invalid EmailId or password' });
        }

        const user = results[0];
        console.log('Fetched user details:', user);

        // Compare the provided password with the hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          console.log('Password mismatch for user:', EmailId);
          return res.status(401).json({ error: 'Invalid EmailId or password' });
        }

        // User is authenticated; generate a JWT token
        const token = jwt.sign(
          {
            FirstName: user.FirstName,
            LastName: user.LastName,
            EmailId: user.EmailId,
            role: user.role,
            Id: user.Id,
          },
          'your-secret-key', // Replace with your secret key or use environment variables
          {
            expiresIn: '1h', // Token expires in 1 hour
          }
        );

        // Respond with the JWT token
        return res.status(200).json({ token });
      }
    );
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/LHO', (req, res) => {
  const { LHO_Name } = req.body;

  // Validate input
  if (!LHO_Name) {
    return res.status(400).json({ message: 'LHO_Name is required.' });
  }

  // Check if LHO_Name already exists in the database
  const checkLHOQuery = 'SELECT * FROM SiteDetails WHERE LHO_Name = ?';
  connection.query(checkLHOQuery, [LHO_Name], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      return res.status(500).json({ message: 'Error checking LHO_Name in the database.' });
    }

    // If LHO_Name already exists, return an error response
    if (results.length > 0) {
      return res.status(400).json({ message: 'LHO_Name already exists. Duplicate entries are not allowed.' });
    }

    // If LHO_Name does not exist, proceed to insert the new entry
    const insertLHOQuery = 'INSERT INTO SiteDetails (LHO_Name) VALUES (?)';
    connection.query(insertLHOQuery, [LHO_Name], (err) => {
      if (err) {
        console.error('Error inserting data into MySQL:', err);
        return res.status(500).json({ message: 'Error inserting data into the database.' });
      }

      return res.status(201).json({ message: 'LHO added successfully', LHO_Name });
    });
  });
});


app.put('/add-atmid', (req, res) => {
  const { LHO_Name, atm_id } = req.body;

  // Check if LHO_Name and atm_id are provided
  if (!LHO_Name || !atm_id) {
    return res.status(400).json({ error: 'LHO_Name and ATMID are required.' });
  }

  // Query the database to get the current list of ATMIDs for the given LHO_Name
  connection.query('SELECT ATMID FROM SiteDetails WHERE LHO_Name = ?', [LHO_Name], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    // If no results are found, return an error message
    if (results.length === 0) {
      return res.status(404).json({ message: 'LHO_Name does not exist. Please add LHO_Name first.' });
    }

    try {
      // Get the ATMID field from the results
      const atmidsField = results[0].ATMID;
      let atmIdsArray = [];

      // Parse the ATMID field if it exists
      if (atmidsField) {
        try {
          atmIdsArray = JSON.parse(atmidsField);
        } catch (parseError) {
          console.error('Error parsing ATMID:', parseError.message);
          return res.status(500).json({ error: 'Error processing ATMID data.' });
        }
      }

      // Ensure atmIdsArray is an array
      if (!Array.isArray(atmIdsArray)) {
        atmIdsArray = [];
      }

      // Check if the provided atm_id is already in the list
      if (!atmIdsArray.includes(atm_id)) {
        // Add the new atm_id to the array
        atmIdsArray.push(atm_id);
        const updatedATMIDs = JSON.stringify(atmIdsArray);

        // Update the database with the new list of ATMIDs
        connection.query('UPDATE SiteDetails SET ATMID = ? WHERE LHO_Name = ?', [updatedATMIDs, LHO_Name], (updateErr) => {
          if (updateErr) {
            console.error('Database update error:', updateErr);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          res.status(200).json({ message: 'ATMID(s) updated successfully.' });
        });
      } else {
        res.status(200).json({ message: 'ATMID already exists in the list.' });
      }
      
    } catch (error) {
      console.error('Unexpected error:', error.message);
      res.status(500).json({ error: 'Unexpected error occurred.' });
    }
  });
});



// New endpoint to get ATMIDs for a given LHO_Name
app.get('/get-atmid/:name', (req, res) => {
  const { name } = req.params;

  connection.query('SELECT ATMID FROM SiteDetails WHERE LHO_Name = ?', [name], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Database query error.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'LHO_Name not found.' });
    }

    let existingATMID = [];

    try {
      const atmidsField = results[0].ATMID;
      if (Array.isArray(atmidsField)) {
        existingATMID = atmidsField;
      } else if (typeof atmidsField === 'string') {
        existingATMID = JSON.parse(atmidsField);
      } else {
        throw new Error('Unexpected data type for ATMID');
      }
    } catch (parseError) {
      console.error('Error parsing ATMID:', parseError.message);
      existingATMID = [];
    }

    res.status(200).json({ LHO_Name: name, ATMIDs: existingATMID });
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

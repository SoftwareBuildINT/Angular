const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Register route
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

const port = process.env.PORT || 7558;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

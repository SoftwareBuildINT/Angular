const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
app.use(cors());

// Add the body parsing middleware
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads

const connection = mysql.createPool({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'H_surveillance'
});
// Function to hash the password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

app.post('/register', async (req, res) => {
  const { email_id, password, first_name, last_name, contact, role_id } = req.body;

  if (!email_id || !password || !first_name || !last_name || !contact || !role_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }


  try {
    // Check if the user with the given EmailId already exists
    connection.query('SELECT email_id FROM users WHERE email_id = ?', [email_id], (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (results.length > 0) {
        return res.status(409).json({ error: 'Email is already in use' });
      }

      // Proceed with registration if the email is not in use
      hashPassword(password)
      .then((hashedPassword) => {
        connection.query(
          'INSERT INTO users (email_id, password, first_name, last_name, contact, role_id) VALUES (?, ?, ?, ?, ?, ?)',
          [email_id, hashedPassword, first_name, last_name, contact, role_id],
          (err, results) => {
            if (err) {
              console.error('Database query error:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }
            return res.status(201).json({ message: 'User registered successfully' });
          }
        );
      })
      .catch((error) => {
        console.error('Error during password hashing:', error);
        return res.status(500).json({ error: 'Internal server error' });
      });
  });
} catch (error) {
  console.error('Error during registration:', error);
  return res.status(500).json({ error: 'Internal server error' });
}
});

app.listen(5000, () => {
console.log('Server running on port 5000');
});
// Login route
app.post('/login', async (req, res) => {
  const { EmailId, password } = req.body;

  if (!EmailId || !password) {
    return res.status(400).json({ error: 'EmailId and password are required' });
  }

  try {
    // Fetch user details from the database based on the provided email
    connection.query('SELECT * FROM users WHERE email_id = ?', [EmailId], async (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (results.length === 0) {
        console.log('User not found:', EmailId);
        return res.status(401).json({ error: 'Username not found' });
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
          Id: user.Id
        },
        'your-secret-key',
        {
          expiresIn: '1h'
        }
      );

      // Respond with the JWT token
      return res.status(200).json({ token });
    });
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

    res.status(200).json({ LHO_Name: name, count: existingATMID.length, ATMIDs: existingATMID });
  });
});

app.get('/LHO', (req, res) => {
  // Query to fetch all LHO_Name entries and the count of ATMIDs associated with each LHO_Name
  const getAllLHOQuery = `
    SELECT LHO_Name, 
           JSON_LENGTH(ATMID) AS atm_count 
    FROM SiteDetails;
  `;

  connection.query(getAllLHOQuery, (err, results) => {
    if (err) {
      console.error('Error fetching data from MySQL:', err);
      return res.status(500).json({ message: 'Error retrieving data from the database.' });
    }

    // Prepare the response data
    const lhoList = results.map((row) => ({
      LHO_Name: row.LHO_Name,
      atm_count: row.atm_count
    }));

    // Return the list of LHO_Name with ATMID counts and the total count of LHO entries
    return res.status(200).json({
      count: lhoList.length,
      lhoList: lhoList
    });
  });
});

app.get('/lho-list', async (req, res) => {
  const lho_id = req.query.lho_id;

  const query = lho_id
    ? `
    SELECT l.lho_id, l.lho_name, COUNT(a.atm_id) AS total_locations, 
    GROUP_CONCAT(a.atm_id ORDER BY a.atm_id SEPARATOR ',') AS atm_ids
    FROM H_surveillance.LHO_list l
    JOIN atm_list a ON l.lho_id = a.lho_id
    WHERE l.lho_id = ?
    GROUP BY l.lho_id, l.lho_name;`
    : `
    SELECT l.lho_id, l.lho_name, COUNT(a.atm_id) AS total_locations, 
    GROUP_CONCAT(a.atm_id ORDER BY a.atm_id SEPARATOR ',') AS atm_ids
    FROM H_surveillance.LHO_list l
    LEFT JOIN atm_list a ON l.lho_id = a.lho_id
    GROUP BY l.lho_id, l.lho_name;`;

  try {
    connection.query(query, [lho_id], async (err, results) => {
      if (err) {
        console.error('Error fetching data from MySQL:', err);
        return res.status(500).json({ message: 'Error retrieving data from the database.' });
      }

      results = results.map(row => ({
        ...row,
        atm_ids: row.atm_ids ? row.atm_ids.split(',') : []
      }));

      const headers = { 'Content-Type': 'application/json', 'X-Password': 'thePass' };
      let siteDetails = [], siteDetails2 = [];

      const fetchAPIData = async () => {
        try {
          const [itlApiData, birdsIApiData] = await Promise.all([
            axios.post('https://tom.itlems.com/megaapi/CameraReport', {}, { headers }),
            axios.get('https://aapl.birdsi.in/Birds-i_HITACHI_DASHBOARD_API/api/SiteDetailsAll')
          ]);
          siteDetails2 = itlApiData.data;
          siteDetails = JSON.parse(birdsIApiData.data);
        } catch (error) {
          console.error('Error fetching data from APIs:', error);
        }
      };

      await fetchAPIData();

      const atmIdSet = new Set();
      const allSiteDetails = [...siteDetails];

      siteDetails2.forEach(site => {
        if (!atmIdSet.has(site.AtmID)) {
          const lastCheckedTime = new Date(site.LastChecked);
          const currentTime = new Date();
          const timeDifference = (currentTime - lastCheckedTime) / 60000; // in minutes
          const status = timeDifference <= 15 ? 'ONLINE' : 'OFFLINE';

          allSiteDetails.push({
            ATM_ID: site.AtmID,
            unitname: site.BankName || 'N/A',
            city: site.CityName || 'N/A',
            state: site.StateName || 'N/A',
            SiteStatus: status
          });
          atmIdSet.add(site.AtmID);
        }
      });

      const enrichedResults = results.map(lho => {
        let onlineCount = 0, offlineCount = 0;

        const atmData = lho.atm_ids.map(atm_id => {
          const siteDetail = allSiteDetails.find(site => site.ATM_ID === atm_id);
          const status = siteDetail ? siteDetail.SiteStatus : 'NO DATA';
          if (status === 'ONLINE') onlineCount++;
          else if (status === 'OFFLINE') offlineCount++;

          return {
            atm_id,
            siteName: siteDetail ? siteDetail.unitname : 'NO DATA',
            city: siteDetail ? siteDetail.city : 'NO DATA',
            state: siteDetail ? siteDetail.state : 'NO DATA',
            status
          };
        });

        const totalATMs = onlineCount + offlineCount;
        const percentage = totalATMs ? ((onlineCount / totalATMs) * 100).toFixed(2) : '0.00';

        return {
          ...lho,
          onlineCount,
          offlineCount,
          percentage: parseFloat(percentage),
          atm_data: atmData
        };
      });

      return res.status(200).json(enrichedResults);
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return res.status(500).json({ message: 'Error retrieving data.' });
  }
});

app.post('/add-lho', (req, res) => {
  const { lho_name } = req.body;
  const query = `INSERT INTO H_surveillance.LHO_list (lho_name) values (?);`;

  connection.query(query, [lho_name], (err, results) => {
    if (err) {
      console.error('Error inserting data into MySQL:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'LHO Name already exists in the database.' });
      }
      return res.status(500).json({ message: 'Error inserting data into the database.' });
    }
    return res.status(201).json({ message: 'LHO added successfully', lho_id: results.insertId });
  });
});

app.post('/add-atm', (req, res) => {
  const { atmId, lho_id } = req.body;

  const query = `
    INSERT INTO H_surveillance.atm_list (atm_id, lho_id) VALUES (?, ?)
  `;

  connection.query(query, [atmId, lho_id], (error, result) => {
    if (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        // If there's a duplicate entry, fetch the LHO name of the existing ATM ID
        const fetchLHOQuery = `
          SELECT l.lho_id, l.lho_name 
          FROM H_surveillance.atm_list a 
          JOIN H_surveillance.LHO_list l ON a.lho_id = l.lho_id 
          WHERE a.atm_id = ?;
        `;
        
        connection.query(fetchLHOQuery, [atmId], (fetchError, fetchResult) => {
          if (fetchError) {
            console.error('Error fetching LHO data:', fetchError.message);
            return res.status(500).json({ message: 'Error fetching LHO data from the database.' });
          }
          if (fetchResult.length > 0) {
            return res.status(409).json({ message: `ATM ID already exists in ${fetchResult[0].lho_name}` });
          } else {
            return res.status(404).json({ message: 'ATM ID exists but no matching LHO found.' });
          }
        });
      } else {
        return res.status(500).json({ message: 'Error inserting data into the database.' });
      }
    } else {
      return res.status(201).json({ message: 'ATM added successfully' });
    }
  });
});

const port = process.env.PORT || 5002;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

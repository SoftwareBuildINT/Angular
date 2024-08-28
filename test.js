const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

app.use(express.json());

const connection = mysql.createConnection({
  host: '3.7.158.221',
  user: 'admin_buildINT',
  password: 'buildINT@2023$',
  database: 'Hitachi_Surveillance'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the database.');
});

// Existing endpoint to update ATMID
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



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

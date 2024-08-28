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

app.put('/add-atmid', (req, res) => {
  const { LHO_Name, ATMID } = req.body;

  if (!LHO_Name || !ATMID) {
    return res.status(400).json({ error: 'LHO_Name and ATMID are required.' });
  }

  // Ensure ATMID is treated as an array
  const atmidsToAdd = Array.isArray(ATMID) ? ATMID : [ATMID];

  connection.query('SELECT SIte_ID, ATMID FROM SiteDetails WHERE LHO_Name = ?', [LHO_Name], (err, results) => {
    if (err) {
      console.error('Database query error:', err);
      return res.status(500).json({ error: 'Database query error.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'LHO_Name does not exist. Please add LHO_Name first.' });
    }

    let existingATMID = [];

    try {
      // Parse existing ATMID JSON, handle cases where it might be invalid or empty
      if (results[0].ATMID) {
        existingATMID = JSON.parse(results[0].ATMID);
        if (!Array.isArray(existingATMID)) {
          throw new Error('Parsed data is not an array');
        }
      }
    } catch (parseError) {
      console.error('Error parsing ATMID:', parseError.message);
      // Initialize as an empty array if parsing fails
      existingATMID = [];
    }

    // Add new ATMIDs to the existing list without duplicates
    atmidsToAdd.forEach(atmid => {
      if (!existingATMID.includes(atmid)) {
        existingATMID.push(atmid);
      }
    });

    // Convert updated array back to JSON format
    const updatedATMID = JSON.stringify(existingATMID);

    connection.query('UPDATE SiteDetails SET ATMID = ? WHERE SIte_ID = ?', [updatedATMID, results[0].SIte_ID], (err) => {
      if (err) {
        console.error('Error updating record:', err);
        return res.status(500).json({ error: 'Error updating record.' });
      }
      res.status(200).json({ message: 'ATMID(s) updated successfully.', updatedATMID: existingATMID });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

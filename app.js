const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
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
  database: 'Hitachi_Surveillance',
});

app.post('/LHO', (req, res) => {
  const { LHO_Name } = req.body;

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

    if (results.length > 0) {
      // If LHO_Name already exists, return an error response
      return res.status(400).json({ message: 'LHO_Name already exists. Duplicate entries are not allowed.' });
    } else {
      // If LHO_Name does not exist, proceed to insert the new entry
      const sql = 'INSERT INTO SiteDetails (LHO_Name) VALUES (?)';
      connection.query(sql, [LHO_Name], (err, results) => {
        if (err) {
          console.error('Error inserting data into MySQL:', err);
          return res.status(500).json({ message: 'Error inserting data into the database.' });
        }

        return res.json({ message: 'LHO added successfully', results: LHO_Name });
      });
    }
  });
});

app.post('/ATM', (req, res) => {
  const { ATMID, LHO_Name } = req.body;

  if (!ATMID) {
    return res.status(400).json({ message: 'ATMID is required.' });
  }

  if (!LHO_Name) {
    return res.status(400).json({ message: 'LHO_Name is required.' });
  }

  // Check if LHO_Name exists in the SiteDetails table
  const checkSiteDetailsQuery = 'SELECT ATMID FROM SiteDetails WHERE LHO_Name = ?';
  connection.query(checkSiteDetailsQuery, [LHO_Name], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      return res.status(500).json({ message: 'Error checking LHO_Name in the database.' });
    }

    if (results.length > 0) {
      let existingATMs;

      try {
        existingATMs = JSON.parse(results[0].ATMID);
        if (!Array.isArray(existingATMs)) {
          // If existing ATMID is not an array, initialize as an empty array
          existingATMs = [];
        }
      } catch (error) {
        // If JSON parsing fails, initialize as an empty array
        console.error('Error parsing ATMID as JSON:', error);
        existingATMs = [];
      }

      // Check if the ATMID already exists
      if (existingATMs.includes(ATMID)) {
        return res.status(400).json({ message: 'ATMID already exists for this LHO_Name.' });
      } else {
        // Append new ATMID to the existing list and update the record
        existingATMs.push(ATMID);
        const updatedATMIDs = JSON.stringify(existingATMs); // Convert array to JSON string

        const updateATMQuery = 'UPDATE SiteDetails SET ATMID = ? WHERE LHO_Name = ?';
        connection.query(updateATMQuery, [updatedATMIDs, LHO_Name], (err, updateResults) => {
          if (err) {
            console.error('Error updating data in MySQL:', err);
            return res.status(500).json({ message: 'Error updating data in the database.' });
          }

          return res.json({ message: 'ATMID added to existing LHO_Name successfully', results: { ATMID, LHO_Name } });
        });
      }
    } else {
      // If LHO_Name does not exist, insert a new entry with ATMID in JSON format
      const newATMIDs = JSON.stringify([ATMID]);
      const insertATMQuery = 'INSERT INTO SiteDetails (ATMID, LHO_Name) VALUES (?, ?)';
      connection.query(insertATMQuery, [newATMIDs, LHO_Name], (err, insertResults) => {
        if (err) {
          console.error('Error inserting data into MySQL:', err);
          return res.status(500).json({ message: 'Error inserting data into the database.' });
        }

        return res.json({ message: 'Item added successfully', results: { ATMID, LHO_Name } });
      });
    }
  });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

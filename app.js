const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
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
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

const port = process.env.PORT || 7558;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
let ffmpegProcess;

// Directory to store HLS streams
const streamDir = path.join(__dirname, 'src', 'assets', 'streams');
if (!fs.existsSync(streamDir)) {
  fs.mkdirSync(streamDir, { recursive: true });
}

// Function to hash the password
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { atmId, cameraId } = req.body;

    // Set the path where files will be saved, using atmId and cameraId
    const streamDir = path.join(__dirname, 'src', 'assets', 'streams', atmId, cameraId);
    if (!fs.existsSync(streamDir)) {
      fs.mkdirSync(streamDir, { recursive: true });
    }

    cb(null, streamDir); // Save files in the atmId/cameraId directory
  },
  filename: (req, file, cb) => {
    // Keep the original filename or customize as needed
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Function to start RTSP to HLS conversion
function startRtspToHls(rtspUrl, cameraId, atmId) {
  // Create a directory for each atmId and organize camera streams inside
  const outputDir = path.join(streamDir, atmId, cameraId);

  // Create directory for this atmId and camera's stream
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ffmpegArgs = [
    '-v',
    'debug',
    '-rtsp_transport',
    'tcp', // RTSP over TCP for better stability
    '-i',
    rtspUrl, // Input RTSP stream URL
    '-f',
    'hls', // Output format: HLS
    '-hls_time',
    '2', // Segment duration (in seconds)
    '-hls_list_size',
    '5', // Number of segments in the playlist
    '-hls_flags',
    'delete_segments', // Remove old segments
    path.join(outputDir, 'output.m3u8') // Output HLS file path
  ];

  // Start the FFmpeg process
  ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  // Log FFmpeg stdout and stderr for debugging
  ffmpegProcess.stdout.on('data', (data) => {
    console.log(`[${atmId}][${cameraId}] stdout: ${data}`);
  });

  ffmpegProcess.stderr.on('data', (data) => {
    console.error(`[${atmId}][${cameraId}] stderr: ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`[${atmId}][${cameraId}] FFmpeg process exited with code ${code}`);
  });
}

// Function to stop the ffmpeg process
function stopFfmpeg() {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGINT'); // Gracefully stop the process
    console.log('ffmpeg process terminated');
  }
}

app.get('/check-file-exists', (req, res) => {
  const filePath = path.join(__dirname, req.query.path); // Construct the full file path

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.json({ exists: false });
    }
    res.json({ exists: true });
  });
});

app.post('/clear-streams', (req, res) => {
  // Clear the streams folder
  fs.readdir(streamDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: 'Error reading streams folder' });
    }

    // Remove each file in the folder
    const fileDeletionPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        fs.unlink(path.join(streamDir, file), (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });

    Promise.all(fileDeletionPromises)
      .then(() => {
        res.json({ message: 'Streams folder cleared' });
      })
      .catch((err) => {
        res.status(500).json({ message: 'Error deleting files', error: err });
      });
  });
});

// API Endpoint to start RTSP-to-HLS conversion
app.post('/convert-rtsp', (req, res) => {
  const { rtspUrl, cameraId, atmId } = req.body;

  if (!rtspUrl || !cameraId) {
    return res.status(400).json({ error: 'RTSP URL and Camera ID are required' });
  }

  // Start the conversion
  startRtspToHls(rtspUrl, cameraId, atmId);

  // Return the HLS stream URL to the client
  const hlsUrl = `https://sbi-dashboard-hitachi.ifiber.in:7558/streams/${atmId}/${cameraId}/output.m3u8`;
  res.json({ hlsUrl });
});

// Serve static HLS streams
app.use('/streams', express.static(streamDir));

app.post('/get-hls-streams', upload.single('hlsFile'), (req, res) => {
  const { atmId, cameraId } = req.body;
  const file = req.file; // Multer saves the file to the directory

  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  res.status(200).send({
    message: 'HLS stream file saved successfully',
    filePath: file.path,
    atmId: atmId,
    cameraId: cameraId
  });
});

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
      return res.json({ role: user.role_id, token });
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

  try {
    await new Promise((resolve, reject) => {
      connection.query('SET SESSION group_concat_max_len = 1000000;', (err) => {
        if (err) {
          console.error('Error setting session variable:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Second query: Fetch the LHO list with ATM IDs
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

    connection.query(query, [lho_id], async (err, results) => {
      if (err) {
        console.error('Error fetching data from MySQL:', err);
        return res.status(500).json({ message: 'Error retrieving data from the database.' });
      }

      results = results.map((row) => ({
        ...row,
        atm_ids: row.atm_ids ? row.atm_ids.split(',') : []
      }));

      const headers = { 'Content-Type': 'application/json', 'X-Password': 'thePass' };
      let siteDetails = [],
        siteDetails2 = [],
        siteDetails3 = [];

      const fetchAPIData = async () => {
        try {
          const [itlApiData, birdsIApiData, securanceApiData] = await Promise.all([
            axios.post('https://tom.itlems.com/megaapi/CameraReport', {}, { headers }),
            axios.get('https://aapl.birdsi.in/Birds-i_HITACHI_DASHBOARD_API/api/SiteDetailsAll'),
            axios.get('https://icms.sspl.securens.in:15101/Lotus/api/AllSiteDetails')
          ]);

          const securanceData = securanceApiData.data['data'].split('||').map((record) => {
            const [ATM_ID, unitname, state, city, SiteStatus] = record.split('|');
            return { ATM_ID, unitname, state, city, SiteStatus };
          });

          siteDetails = JSON.parse(birdsIApiData.data);
          siteDetails2 = itlApiData.data;
          siteDetails3 = securanceData;
        } catch (error) {
          console.error('Error fetching data from APIs:', error);
        }
      };

      await fetchAPIData();

      const atmIdSet = new Set();
      const allSiteDetails = [...siteDetails];

      siteDetails2.forEach((site) => {
        if (!atmIdSet.has(site.AtmID)) {
          const lastCheckedTime = new Date(site.LastChecked);
          const currentTime = new Date();
          const timeDifference = (currentTime - lastCheckedTime) / 60000;
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

      siteDetails3.forEach((site) => {
        if (!atmIdSet.has(site.ATM_ID)) {
          allSiteDetails.push({
            ATM_ID: site.ATM_ID,
            unitname: site.unitname || 'N/A',
            city: site.city || 'N/A',
            state: site.state || 'N/A',
            SiteStatus: site.SiteStatus || 'NO DATA'
          });
          atmIdSet.add(site.ATM_ID);
        }
      });

      let totalLocations = 0;
      let totalOnline = 0;
      let totalOffline = 0;

      const enrichedResults = results.map((lho) => {
        let onlineCount = 0,
          offlineCount = 0;

        const atmData = lho.atm_ids.map((atm_id) => {
          const siteDetail = allSiteDetails.find((site) => site.ATM_ID === atm_id);
          const status = siteDetail ? siteDetail.SiteStatus : 'NO DATA';
          if (status.toLowerCase() === 'online') {
            onlineCount++;
          } else if (status.toLowerCase() === 'offline' || status.toLowerCase() === 'no data') {
            offlineCount++;
          }

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

        totalLocations += lho.total_locations;
        totalOnline += onlineCount;
        totalOffline += offlineCount;

        return {
          ...lho,
          onlineCount,
          offlineCount,
          percentage: parseFloat(percentage),
          atm_data: atmData
        };
      });

      const overallPercentage = totalLocations ? ((totalOnline / (totalOnline + totalOffline)) * 100).toFixed(2) : '0.00';

      return res.status(200).json({
        totalLocations,
        totalOnline,
        totalOffline,
        totalPercentage: parseFloat(overallPercentage),
        lhoDetails: enrichedResults
      });
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return res.status(500).json({ message: 'Error retrieving data.' });
  }
});

app.post('/securance-site-list/:atmId', async (req, res) => {
  const { atmId } = req.params;
  const { services, token } = req.body;

  try {
    // Fetch external API data
    const fetchAPIData = async () => {
      try {
        const response = await axios({
          method: 'post',
          url: `https://apip.sspl.securens.in:14333/api/v1/siteList?services=${services}`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        return response.data.data;
      } catch (error) {
        console.error('Error fetching data from API:', error);
        throw new Error('Failed to fetch data from external API');
      }
    };

    const siteDetails = await fetchAPIData();
    const matchedSite = siteDetails.find((site) => site.siteId === atmId);

    if (matchedSite) {
      const config = matchedSite.site_config[0];
      const siteDataToStore = {
        siteId: matchedSite.siteId,
        dvr_user_id: config.dvr_user_id,
        dvr_password: config.dvr_password,
        dvr_manufacturer: config.dvr_manufacturer,
        siteIp: config.dvr_ip,
        camera_num: config.camera_num.split(',').length,
        rtsp_port: config.rtsp_port
      };

      let camera_num = config.camera_num.split(',');
      let cameras = camera_num.map((camera) => Number(camera));

      // console.log(siteDataToStore);

      // Prepare the function to fetch live view data for each camera
      const fetchLiveViewData = async (camera) => {
        try {
          const response = await axios({
            method: 'post',
            url: `https://apip.sspl.securens.in:14333/api/v1/livestreaming?dvr_user_id=${encodeURIComponent(config.dvr_user_id)}&dvr_password=${encodeURIComponent(config.dvr_password)}&dvr_manufacturer=${encodeURIComponent(config.dvr_manufacturer)}&siteIp=${encodeURIComponent(config.dvr_ip)}&camera_num=${encodeURIComponent(camera)}&rtsp_port=${encodeURIComponent(config.rtsp_port)}`,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          return response.data.data;
        } catch (error) {
          console.error(`Error fetching live view data for camera ${camera}:`, error.response ? error.response.data : error.message);
          throw new Error(`Failed to fetch live view data for camera ${camera}`);
        }
      };

      // Loop through each camera and fetch live view data
      const liveViewLinksPromises = cameras.map((camera) => fetchLiveViewData(camera));
      const liveViewLinksArray = await Promise.all(liveViewLinksPromises);

      // Build dynamic response object
      const responseObj = {
        siteId: siteDataToStore.siteId
      };

      // Loop through cameras and add live view data for each camera in the response object
      liveViewLinksArray.forEach((liveViewLinks, index) => {
        responseObj[`camera_${index + 1}`] = {
          liveViewLinks: liveViewLinks
        };
      });

      console.log('Live View Links successfully fetched for all cameras');
      // Send the dynamic response
      res.status(200).json(responseObj);
    } else {
      res.status(404).json({
        message: 'ATM ID not found in external API data'
      });
    }
  } catch (error) {
    console.error('Error in /securance-site-list:', error.message);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

app.post('/aniket-rtsp-link/:atmId', async (req, res) => {
  console.log('inside aniket-rtsp-link');
  const { atmId } = req.params;

  try {
    const fetchAPIData = async () => {
      try {
        const response = await axios({
          method: 'get',
          url: `https://aapl.birdsi.in/Birds-i_HITACHI_DASHBOARD_API/api/GetLiveStreamURL/${atmId}`
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching data from API:', error);
        throw new Error('Failed to fetch data from external API');
      }
    };

    const siteDetails = await fetchAPIData();

    // Parse the response string to a JSON object
    const parsedData = JSON.parse(siteDetails);

    if (parsedData && parsedData.length > 0) {
      const data = parsedData[0];
      const atmId = data.ATM_ID;

      const cameras = Object.keys(data)
        .filter((key) => key.toLowerCase().startsWith('camera'))
        .reduce((obj, key, index) => {
          // Replace camera key format to 'camera_x'
          obj[`camera_${index + 1}`] = data[key];
          return obj;
        }, {});

      res.status(200).json({
        siteId: atmId,
        cameras
      });
    } else {
      res.status(404).json({
        message: 'No data found for the specified ATM ID'
      });
    }
  } catch (error) {
    console.error('Error in /aniket-rtsp-link:', error.message);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message
    });
  }
});

app.post('/atm-vendor', (req, res) => {
  const atmId = req.body.atmId;

  const query = `SELECT vendor FROM H_surveillance.atm_list WHERE atm_id = ?;`;

  connection.query(query, [atmId], (err, result) => {
    if (err) {
      console.error('Error fetching data from MySQL:', err);
      return res.status(500).json({ message: 'Error fetching data from the database.' });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: 'Vendor not found in the database.' });
    }
    return res.status(200).json({ vendor: result[0].vendor });
  });
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

app.get('/Role', async (req, res) => {
  try {
    // Query the database to get all users
    connection.query('SELECT role_name FROM role', (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Return the user data as a JSON response
      return res.status(200).json(results);
    });
  } catch (error) {
    console.error('Error during fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/users', async (req, res) => {
  try {
    // Query the database to get all users
    connection.query('SELECT email_id, first_name, last_name, contact, role_id FROM users', (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Return the user data as a JSON response
      return res.status(200).json(results);
    });
  } catch (error) {
    console.error('Error during fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

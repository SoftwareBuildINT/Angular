const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Update the directory path to src/assets/streams
const streamDir = path.join(__dirname, 'src', 'assets', 'streams');
if (!fs.existsSync(streamDir)) {
  fs.mkdirSync(streamDir, { recursive: true });
}

// Camera configuration
const cameras = [
  {
    id: 'camera1',
    rtspUrl: 'rtsp://admin:Buildint%402023@172.14.1.96:81/cam/realmonitor?channel=1&subtype=1'
    // rtspUrl: 'rtsp://hitachi:hitachi12345@172.16.35.211:81/cam/realmonitor?channel=1&subtype=1'
    // rtspUrl: 'rtsp://hitachi:hitachi12345@172.16.35.211/MPEG4/ch1/main/av_stream'
  },
  {
    id: 'camera2',
    rtspUrl: 'rtsp://admin:Buildint%402023@172.14.1.96:81/cam/realmonitor?channel=1&subtype=1'
  },
  {
    id: 'camera3',
    rtspUrl: 'rtsp://admin:Buildint%402023@172.14.1.96:81/cam/realmonitor?channel=1&subtype=1'
  },
  {
    id: 'camera4',
    rtspUrl: 'rtsp://admin:Buildint%402023@172.14.1.96:81/cam/realmonitor?channel=1&subtype=1'
  }
  // {
  //   id: 'camera5',
  //   rtspUrl: 'rtsp://admin:Buildint%402024@172.14.2.106:81/cam/realmonitor?channel=5&subtype=1'
  // }
];

// Convert RTSP to HLS using FFmpeg
function startStream(camera) {
  const { id, rtspUrl } = camera;
  const outputDir = path.join(streamDir, id);

  // Create directories for each camera stream if they don't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const ffmpegArgs = [
    '-rtsp_transport',
    'tcp',
    '-i',
    rtspUrl,
    '-f',
    'hls',
    '-hls_time',
    '30',
    '-hls_list_size',
    '1',
    '-hls_flags',
    'delete_segments',
    path.join(outputDir, 'output.m3u8')
  ];

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.stdout.on('data', (data) => {
    console.log(`[${id}] stdout: ${data}`);
  });

  ffmpegProcess.stderr.on('data', (data) => {
    console.error(`[${id}] stderr: ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`[${id}] process exited with code ${code}`);
  });
}

// Start streams for all cameras
cameras.forEach((camera) => {
  startStream(camera);
});

// Serve static files from src/assets/streams
app.use('/streams', express.static(streamDir));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

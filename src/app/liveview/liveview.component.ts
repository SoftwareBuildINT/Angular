import { Component, AfterViewInit, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router'; // To get query parameters
import { HttpClient, HttpHeaders } from '@angular/common/http'; // To make API calls
import Hls from 'hls.js'; // Correct import

@Component({
  selector: 'app-liveview',
  templateUrl: './liveview.component.html',
  styleUrls: ['./liveview.component.scss']
})

export class LiveviewComponent implements AfterViewInit, OnInit {
  atmId: string | null = null; // Variable to store atmId
  apiResponse: any = null;

  constructor(private route: ActivatedRoute, private http: HttpClient) { }

  ngOnInit() {
    // Access the atmId from the URL
    this.route.queryParams.subscribe(params => {
      this.atmId = params['atmId'];
      if (this.atmId) {
        this.checkVendorAndLoadStreams();
      } else {
        console.error('ATM ID not found in URL');
      }
    });
  }

  // Function to call API with atmId
  callApiWithAtmId(atmId: string) {
    const apiUrl = `https://sbi-dashboard-hitachi.ifiber.in:7558/api/securance-site-list/${atmId}`;

    const token = localStorage.getItem('authToken');
    const services = localStorage.getItem('services');

    const payload = {
      token: token,
      services: services
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    this.http.post(apiUrl, payload, { headers })
      .subscribe({
        next: (response: any) => {
          console.log('API Response:', response);
          this.apiResponse = response; // Store the response data for later use
          this.convertAndPlayStreams();
        },
        error: (error) => {
          console.error('Error during API call:', error);
        }
      });
  }

  // Function to check vendor and decide the next steps
  checkVendorAndLoadStreams() {
    const vendorApiUrl = `https://sbi-dashboard-hitachi.ifiber.in:7558/api/atm-vendor`;

    // Create the payload with atmId in the body
    const payload = { atmId: this.atmId };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Make a POST request instead of GET
    this.http.post(vendorApiUrl, payload, { headers })
      .subscribe({
        next: (response: any) => {
          const vendorId = response.vendor; // Assuming the response contains a vendorId field
          console.log('Vendor ID:', vendorId);

          if (vendorId === 3) {
            console.log('Vendor is 3, performing RTSP to HLS conversion');
            this.callApiWithAtmId(this.atmId);
          } else {
            console.log('Vendor is not 3, directly playing streams');
            this.playStreamsDirectly(); // Use the new polling mechanism here
          }
        },
        error: (error) => {
          console.error('Error fetching vendor ID:', error);
        }
      });
  }

  // Function to convert RTSP to HLS for vendor 3 and load the stream
  convertAndPlayStreams() {
    let rtspLinks: { [key: string]: string } = {};

    for (let i = 1; i <= 4; i++) {
      const cameraKey = `camera_${i}`;
      if (this.apiResponse[cameraKey] && this.apiResponse[cameraKey].liveViewLinks) {
        rtspLinks[cameraKey] = this.apiResponse[cameraKey].liveViewLinks.rtsp;
      }
    }

    console.log("RTSP links:", rtspLinks);

    Object.keys(rtspLinks).forEach(cameraKey => {
      const rtspUrl = rtspLinks[cameraKey];
      this.convertRtspToHls(rtspUrl, cameraKey);
    });
  }

  // Poll for stream file existence and load the stream when available
  pollStreamFile(cameraKey: string, filePath: string, retryInterval = 5000) {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Check if the file exists by calling a backend endpoint
    const checkUrl = `https://sbi-dashboard-hitachi.ifiber.in:7558/api/check-file-exists?path=${filePath}`; // Backend route to check file existence

    this.http.get(checkUrl, { headers })
      .subscribe({
        next: (response: any) => {
          if (response.exists) {
            // File exists, play the stream
            console.log(`${filePath} found, playing stream`);
            this.loadStream(cameraKey, filePath);
          } else {
            // File doesn't exist, retry after 5 seconds
            console.log(`${filePath} not found, retrying in ${retryInterval / 1000} seconds`);
            setTimeout(() => this.pollStreamFile(cameraKey, filePath), retryInterval);
          }
        },
        error: (error) => {
          console.error('Error checking file existence:', error);
          // Retry after 5 seconds on error
          setTimeout(() => this.pollStreamFile(cameraKey, filePath), retryInterval);
        }
      });
  }

  // Function to directly play streams for other vendors or poll for file creation
  playStreamsDirectly() {
    // Define the direct file paths for the camera streams
    const filePaths = {
      camera_1: `assets/streams/${this.atmId}/camera_1/output.m3u8`,
      camera_2: `assets/streams/${this.atmId}/camera_2/output.m3u8`,
      camera_3: `assets/streams/${this.atmId}/camera_3/output.m3u8`,
      camera_4: `assets/streams/${this.atmId}/camera_4/output.m3u8`
    };

    // Poll for each camera stream file
    Object.keys(filePaths).forEach(cameraKey => {
      const filePath = filePaths[cameraKey];
      // console.log("filePath",filePath);
      // console.log("cameraKey",cameraKey);
      this.loadStream(cameraKey, filePath);
    });
  }

  // Convert RTSP to HLS using API and load into video elements
  convertRtspToHls(rtspUrl: string, cameraId: string) {
    const apiUrl = `https://sbi-dashboard-hitachi.ifiber.in:7558/api/convert-rtsp`;

    const payload = {
      rtspUrl: rtspUrl,
      cameraId: cameraId,
      atmId: this.atmId
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    this.http.post(apiUrl, payload, { headers })
      .subscribe({
        next: (response: any) => {
          console.log('RTSP to HLS conversion successful:', response);
          const hlsUrl = `assets/streams/${payload.atmId}/${cameraId}/output.m3u8`;
          this.loadStream(cameraId, hlsUrl);
        },
        error: (error) => {
          console.error('Error during RTSP to HLS conversion:', error);
        }
      });
  }

  // Load the HLS or RTSP stream into video element
  loadStream(cameraId: string, streamUrl: string) {
    const videoElementId = `video_${cameraId}`;
    const video = document.getElementById(videoElementId) as HTMLVideoElement;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      // Wait for user interaction to start playback
      document.addEventListener('click', () => {
        video.muted = true; // Ensure it's muted to bypass autoplay restrictions
        video.play().catch((error) => {
          console.error('Autoplay error:', error);
        });
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed, ready to play');
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.muted = true; // Ensure muted is set

      document.addEventListener('click', () => {
        video.play().catch((error) => {
          console.error('Autoplay error:', error);
        });
      });
    } else {
      console.error('HLS not supported in this browser');
    }
  }

  // ngAfterViewInit runs after the view has been initialized
  ngAfterViewInit() {
    if (this.atmId) {
      this.callApiWithAtmId(this.atmId);
    }
  }
}

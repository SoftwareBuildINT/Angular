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

  constructor(private route: ActivatedRoute, private http: HttpClient) {}

  // ngOnInit runs when the component is initialized
  ngOnInit() {
    // Access the atmId from the URL
    this.route.queryParams.subscribe(params => {
      this.atmId = params['atmId']; // Get atmId from URL
      if (this.atmId) {
        this.callApiWithAtmId(this.atmId); // Call the API with atmId
      } else {
        console.error('ATM ID not found in URL');
      }
    });
  }

  // Function to call API with atmId
  callApiWithAtmId(atmId: string) {
    const apiUrl = `http://localhost:7558/securance-site-list/${atmId}`;

    // Prepare the token and services to be sent in the body
    const token = localStorage.getItem('authToken'); // Retrieve token from local storage
    const services = localStorage.getItem('services'); // Retrieve services from local storage

    // Prepare the payload with token, and services
    const payload = {
      token: token, 
      services: services
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Make the POST request to your backend with the payload
    this.http.post(apiUrl, payload, { headers })
      .subscribe({
        next: (response) => {
          console.log('API Response:', response);
          this.apiResponse = response; // Store the response data for later use
          // Handle the response (you can store the data or do something with it)
        },
        error: (error) => {
          console.error('Error during API call:', error);
        }
      });
  }

  // Your existing ngAfterViewInit for streaming functionality
  ngAfterViewInit() {
    function loadStream(videoElementId: string, streamUrl: string) {
      // console.log("The function has started!");
      const video = document.getElementById(videoElementId) as HTMLVideoElement;
      if (!video) {
        console.error('Video element not found:', videoElementId);
        return;
      }

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // console.log('Manifest parsed for', streamUrl);
          video.play();
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          // console.log('Metadata loaded for', streamUrl);
          video.play();
        });
      } else {
        console.error('HLS not supported in this browser');
      }
    }

    // Initialize each camera stream
    loadStream('video1', '/assets/streams/camera1/output.m3u8');
    loadStream('video2', '/assets/streams/camera2/output.m3u8');
    loadStream('video3', '/assets/streams/camera3/output.m3u8');
    loadStream('video4', '/assets/streams/camera4/output.m3u8');
  }
}

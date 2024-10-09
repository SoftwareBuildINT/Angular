import { Component, AfterViewInit, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import Hls from 'hls.js';

@Component({
  selector: 'app-liveview',
  templateUrl: './liveview.component.html',
  styleUrls: ['./liveview.component.scss']
})

export class LiveviewComponent implements OnInit {
  atmId: string = '';
  videoUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.atmId = params['atmId'];

      if (this.atmId) {
        this.loadVideoStream();
      }else{
        console.log("ATM ID not found")
      }
    });
  }

  loadVideoStream(): void {
    const apiUrl = `http://localhost:7558/live-view-links?atmId=${this.atmId}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    // Make the API call to get the stream data
    this.http.post(apiUrl, {headers}).subscribe(response => {
      // Process response if needed

      // Set video URL for the HLS stream
      this.videoUrl = `assets/streams/${this.atmId}/camera_1/output.m3u8`;

      // Load and play the HLS stream
      this.initHlsStream();
    }, error => {
      console.error('Error fetching stream data:', error);
    });
  }

  initHlsStream(): void {
    const videoElement = document.getElementById('video_camera_1') as HTMLVideoElement;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(this.videoUrl);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play();
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari native HLS support
      videoElement.src = this.videoUrl;
      videoElement.play();
    }
  }
}

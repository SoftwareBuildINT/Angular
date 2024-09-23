import { Component, AfterViewInit } from '@angular/core';
import Hls from 'hls.js';

@Component({
  selector: 'app-liveview',
  templateUrl: './liveview.component.html',
  styleUrls: ['./liveview.component.scss']
})
export class LiveviewComponent implements AfterViewInit {
  ngAfterViewInit() {
    function loadStream(videoElementId: string, streamUrl: string, spinnerId: string) {
      const video = document.getElementById(videoElementId) as HTMLVideoElement;
      const spinner = document.getElementById(spinnerId);
      if (!video) {
        console.error('Video element not found:', videoElementId);
        return;
      }

      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play();
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
        });
        video.addEventListener('playing', () => {
          if (spinner) {
            spinner.style.display = 'none'; // Hide spinner once the video is playing
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          video.play();
        });
        video.addEventListener('playing', () => {
          if (spinner) {
            spinner.style.display = 'none'; // Hide spinner
          }
        });
      } else {
        console.error('HLS not supported in this browser');
      }
    }

    // Initialize each camera stream
    loadStream('video1', '/assets/streams/camera1/output.m3u8', 'spinner1');
    loadStream('video2', '/assets/streams/camera2/output.m3u8', 'spinner2');
    loadStream('video3', '/assets/streams/camera3/output.m3u8', 'spinner3');
    loadStream('video4', '/assets/streams/camera4/output.m3u8', 'spinner4');
  }
}

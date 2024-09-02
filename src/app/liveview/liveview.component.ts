import { Component, AfterViewInit } from '@angular/core';
import Hls from 'hls.js'; // Correct import

@Component({
  selector: 'app-liveview',
  templateUrl: './liveview.component.html',
  styleUrls: ['./liveview.component.scss']
})
export class LiveviewComponent implements AfterViewInit {
  ngAfterViewInit() {
    function loadStream(videoElementId: string, streamUrl: string) {
      console.log("The function has started!");
      const video = document.getElementById(videoElementId) as HTMLVideoElement;
      if (!video) {
        console.error('Video element not found:', videoElementId);
        return;
      }

      if (Hls.isSupported()) {  // No change needed here if Hls is imported correctly
        const hls = new Hls();  // This should work if Hls is a default import
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('Manifest parsed for', streamUrl);
          video.play();
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data);
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', () => {
          console.log('Metadata loaded for', streamUrl);
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

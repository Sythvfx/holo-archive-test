// 1. Force the API to load correctly
if (!window.YT) {
  const tag = document.createElement('script');
  tag.src = "https://youtube.com";
  document.head.appendChild(tag);
}

// 2. Exact video identification configuration
let player;
let subtitleCueList = [];
let currentVideoId = 'WM0XE6Susds'; // Forced default Hololive ID
let subtitleInterval;

function onYouTubeIframeAPIReady() {
  player = new YT.Player('player', {
    videoId: currentVideoId,
    playerVars: {
      'autoplay': 0,
      'playsinline': 1,
      'rel': 0,
      'modestbranding': 1,
      'origin': window.location.origin
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  // Pre-load the subtitles file so it's ready instantly
  fetchSubtitles('subtitles/test.vtt');
}

// 3. Robust button routing configuration
function loadVideo(videoId, vttUrl) {
  currentVideoId = videoId;
  if (player && typeof player.loadVideoById === 'function') {
    player.loadVideoById(videoId);
    fetchSubtitles(vttUrl);
  } else {
    console.error("YouTube Player is still initializing. Please wait.");
  }
}

// 4. Enhanced fetching & error control
async function fetchSubtitles(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const text = await response.text();
    subtitleCueList = parseVTT(text);
    console.log("Subtitles successfully loaded:", subtitleCueList.length, "cues found.");
  } catch (error) {
    console.error("Subtitle file tracking failure:", error);
    subtitleCueList = [];
  }
}

// 5. Native VTT Text block parser
function parseVTT(vttText) {
  const cues = [];
  const cleanText = vttText.replace(/^\uFEFF/, ''); // Strip potential UTF-8 BOM
  const blocks = cleanText.trim().split(/\r?\n\r?\n/);
  
  const startIdx = blocks[0].toUpperCase().startsWith('WEBVTT') ? 1 : 0;

  for (let i = startIdx; i < blocks.length; i++) {
    const lines = blocks[i].trim().split('\n');
    if (lines.length >= 2) {
      let timeLine = lines[0];
      let textIndex = 1;

      if (!timeLine.includes('-->') && lines[1] && lines[1].includes('-->')) {
        timeLine = lines[1];
        textIndex = 2;
      }

      if (timeLine.includes('-->')) {
        const [startStr, endStr] = timeLine.split('-->');
        const textStr = lines.slice(textIndex).join('\n');
        
        cues.push({
          start: parseVttTime(startStr.trim()),
          end: parseVttTime(endStr.trim()),
          text: textStr
        });
      }
    }
  }
  return cues;
}

function parseVttTime(timeStr) {
  const parts = timeStr.split(':');
  let hrs = 0, mins = 0, secs = 0;
  
  if (parts.length === 3) {
    hrs = parseFloat(parts[0]);
    mins = parseFloat(parts[1]);
    secs = parseFloat(parts[2]);
  } else {
    mins = parseFloat(parts[0]);
    secs = parseFloat(parts[1]);
  }
  return (hrs * 3600) + (mins * 60) + secs;
}

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING) {
    clearInterval(subtitleInterval);
    subtitleInterval = setInterval(updateSubtitles, 100);
  } else {
    clearInterval(subtitleInterval);
  }
}

function updateSubtitles() {
  if (!player || !player.getCurrentTime) return;
  const currentTime = player.getCurrentTime();
  const subOverlay = document.getElementById('subtitle-overlay');
  const activeCue = subtitleCueList.find(cue => currentTime >= cue.start && currentTime <= cue.end);
  subOverlay.innerText = activeCue ? activeCue.text : "";
}

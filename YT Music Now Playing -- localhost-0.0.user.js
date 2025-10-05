// ==UserScript==
// @name        YT Music Now Playing -> localhost
// @match       https://music.youtube.com/*
// @run-at      document-idle
// @grant       none
// ==/UserScript==
(function () {
  const endpoint = 'http://127.0.0.1:57234/nowplaying';

  const post = data =>
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {});

  const toSec = s => s?.split(':').reduce((a, v) => a * 60 + Number(v), 0) ?? null;

  function readInfo() {
    // Try Media Session metadata first
    const ms = navigator.mediaSession;
    const msTitle = ms?.metadata?.title || '';
    const msArtist = ms?.metadata?.artist || '';

    // Fallback to DOM
    const title =
      msTitle ||
      document.querySelector('.title.ytmusic-player-bar')?.textContent?.trim() ||
      '';
    const artist =
      msArtist ||
      document.querySelector('.byline.ytmusic-player-bar')?.textContent?.trim() ||
      '';

    const timeText =
      document.querySelector('.time-info.ytmusic-player-bar')?.textContent?.trim() ||
      ''; // e.g., "1:23 / 3:45"
    const m = timeText.match(/^\s*([\d:]+)\s*\/\s*([\d:]+)\s*$/);
    const position = m ? toSec(m[1]) : null;
    const duration = m ? toSec(m[2]) : null;

    // Playback state if available
    const playing = !document.querySelector('tp-yt-paper-icon-button.play-pause-button[title="Play"]');

    return {
      title,
      artist,
      position,
      duration,
      timeText,
      playing,
      ts: Date.now(),
      url: location.href,
    };
  }

  let last = '';
  function tick() {
    const info = readInfo();
    const json = JSON.stringify(info);
    if (info.title && json !== last) {
      last = json;
      post(info);
    }
  }

  const mo = new MutationObserver(tick);
  mo.observe(document.body, { subtree: true, childList: true, characterData: true });

  setInterval(tick, 1000);
  window.addEventListener('beforeunload', () => post({ state: 'closed' }), { once: true });
  tick();
})();
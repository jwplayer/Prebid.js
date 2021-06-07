var events = require('../../src/events.js');

export const jwplayerVideoFactory = function (config) {
  this.player;
  const playerConfig = config.playerConfig;
  const divId = config.divId;

  this.init = function() {
    if(!jwplayer) {
      //error ?
      return;
    }

    const player = jwplayer(divId);
    if(player.getState() === undefined) {
      player.setup(getJwConfig(playerConfig))
        .on('ready', () => {
        // trigger setupComplete
      });
    } else {
      //trigger setupComplete
    }
    this.player = player;
  }

  this.getId = function() {
    return divId;
  }

  this.getVideoParams = function() {
    const player = this.player;
    const config = this.player.getConfig();
    const adConfig = config.advertising;

    const video = {
      mimes: filterCanPlay(MEDIA_TYPES),
      protocols: [
        PROTOCOLS.VAST_2_0,
        PROTOCOLS.VAST_3_0,
        PROTOCOLS.VAST_4_0,
        PROTOCOLS.VAST_2_0_WRAPPER,
        PROTOCOLS.VAST_3_0_WRAPPER,
        PROTOCOLS.VAST_4_0_WRAPPER
      ],
      h: player.getHeight(),
      w: player.getWidth(),
      startdelay: getStartDelay(),
      placement: getPlacement(adConfig)
      // linearity is omitted because both forms are supported.
      //sequence
      //battr
      maxextended: -1,
      boxingallowed: 1,
      playbackmethod: [ getPlaybackMethod(config) ],
      playbackend: 1,
      // companionad - todo add in future version
      api: [
        API_FRAMEWORKS.VPAID_2_0
      ],
    };

    if (isOmidSupported(adConfig.adClient)) {
      video.api.push(API_FRAMEWORKS.OMID_1_0);
    }

    const skipoffset = adConfig.skipoffset;
    if (skipoffset !== undefined) {
      const skippable = skipoffset >= 0;
      video.skip = skippable ? 1 : 0;
      if (skippable) {
        video.skipmin = skipoffset + 2;
        video.skipafter = skipoffset;
      }
    }

    if (player.getFullscreen()) {
      // only specify ad position when in Fullscreen since computational cost is low
      // ad position options are listed in oRTB 2.5 section 5.4
      // https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf
      video.pos = 7;
    }

    const item = this.player.getPlaylistItem();
    const duration = this.player.getDuration();
    const content = {
      id: item.mediaid,
      url: item.file,
      title: item.title,
      // cat?
      // keywords?
      len: duration,
      livestream: duration > 0 ? 0 : 1
    };

    return {
      video,
      content
    }
  }

  this.renderAd = function(adTagUrl) {
    this.player.playAd(adTagUrl);
  }

  this.onEvents = function(events, callback) {
    const player = this.player;

    events.forEach(event => {
      switch (event) {
        case 'setupComplete':
          player.on('setup', e => {

          });

        case 'setupFailed':
          player.on('setupError', e => {

          });

        case 'destroyed':

        case 'adRequest':

        case 'adLoaded':

        case 'adBreakStart':

        case 'adImpression':

        case 'adStarted':

        case 'adTime':

        case 'adPause':

        case 'adPlay':

        case 'adError':

        case 'adClick':

        case 'adSkipped':

        case 'adComplete':

        case 'adBreakEnd':

        case 'playbackRequest':

        case 'play':

        case 'pause':

        case 'buffer':

        case 'autostartBlocked':

        case 'playAttemptFailed':

        case 'time':

        case 'seekStart':

        case 'seekEnd':

        case 'complete':

        case 'error':

        case 'playlist':

        case 'contentLoaded':

        case 'playlistComplete':

        case 'mute':

        case 'volume':

        case 'renditionUpdate':

        case 'fullscreen':

        case 'playerResize':

        case 'viewable':

      }
    });

  }

  this.offEvents = function(events, callback) {

  }

  this.destroy = function() {
    this.offEvents();
    this.player = null;
    // trigger destroyed
  }

  return {
    init,
    getId,
    getVideoParams,
    renderAd,
    onEvents,
    offEvents,
    destroy
  };
};

function getJwConfig(config) {
  const jwConfig = config.params.vendorConfig || {};
  if (jwConfig.autostart === undefined) {
    jwConfig.autostart = config.autostart;
  }

  if (jwConfig.mute === undefined) {
    jwConfig.mute = config.mute;
  }

  if (!jwConfig.key) {
    jwConfig.key = config.licenseKey;
  }

  const advertising = jwConfig.advertising || {};
  if (!jwConfig.file && !jwConfig.playlist && !jwConfig.source) {
    advertising.outstream = true;
    advertising.client = advertising.client || 'vast';
  }

  jwConfig.advertising = advertising;
  return jwConfig;
}

const MEDIA_TYPES = [
  'video/mp4', 'video/ogg', 'video/webm', 'video/aac', 'application/vnd.apple.mpegurl'
];

function filterCanPlay(mediaTypes = []) {
  const el = document.createElement('video');
  return mediaTypes
    .filter(mediaType => el.canPlayType(mediaType))
    .concat('application/javascript'); // Always allow VPAIDs.
}

function getStartDelay() {
  //todo calculate
}

function getPlacement(adConfig) {
  if (!adConfig.outstream) {
    // https://developer.jwplayer.com/jwplayer/docs/jw8-embed-an-outstream-player for more info on outstream
    return 1;
  }
  // todo possibly omit if outstream? Hard to determine placement.
}

const PLAYBACK_METHODS = { // Spec 5.10.
  AUTOPLAY: 1,
  AUTOPLAY_MUTED: 2,
  CLICK_TO_PLAY: 3,
  CLICK_TO_PLAY_MUTED: 4,
  VIEWABLE: 5,
  VIEWABLE_MUTED: 6
};

const PROTOCOLS = { // Spec 5.8.
  // VAST_1_0: 1,
  VAST_2_0: 2,
  VAST_3_0: 3,
  // VAST_1_O_WRAPPER: 4,
  VAST_2_0_WRAPPER: 5,
  VAST_3_0_WRAPPER: 6,
  VAST_4_0: 7,
  VAST_4_0_WRAPPER: 8
};

const API_FRAMEWORKS = { // Spec 5.6.
  VPAID_1_0: 1,
  VPAID_2_0: 2,
  OMID_1_0: 7
};

function getPlaybackMethod({ autoplay, mute, autoplayAdsMuted }) {
  if (autoplay) {
    // Determine whether player is going to start muted.
    const isMuted = mute || autoplayAdsMuted; // todo autoplayAdsMuted only applies to preRoll
    return isMuted ? PLAYBACK_METHODS.AUTOPLAY_MUTED : PLAYBACK_METHODS.AUTOPLAY;
  }
  return PLAYBACK_METHODS.CLICK_TO_PLAY;
}

/**
 * Indicates if Omid is supported
 *
 * @param {string=} adClient - The identifier of the ad plugin requesting the bid
 * @returns {boolean} - support of omid
 */
function isOmidSupported(adClient) {
  const omidIsLoaded = window.OmidSessionClient !== undefined;
  return omidIsLoaded && adClient === 'vast';
}

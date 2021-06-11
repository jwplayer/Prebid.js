
const jwplayerVideoFactory = function (config) {
  const jwplayer = window.jwplayer;
  let player = null;
  const playerConfig = config.playerConfig;
  const divId = config.divId;
  const minimumSupportedPlayerVersion = '8.20.0';
  let adState = null;
  let timeState = null;
  let pendingSeek = {};

  const initStates = function(config) {
    adState = new AdState(config.advertising);
    timeState = new TimeState();
  }

  const init = function() {
    if (!jwplayer) {
      // error ?
      return;
    }

    player = jwplayer(divId);
    if (player.getState() === undefined) {
      player.setup(getJwConfig(playerConfig))
        .on('ready', () => {
          initStates(playerConfig);
        // trigger setupComplete
        });
    } else {
      // trigger setupComplete
      initStates(playerConfig);
    }
  }

  const getId = function() {
    return divId;
  }

  const getVideoParams = function() {
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
      placement: getPlacement(adConfig),
      // linearity is omitted because both forms are supported.
      // sequence
      // battr
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

  const renderAd = function(adTagUrl) {
    player.playAd(adTagUrl);
  }

  const onEvents = function(events, callback) {
    const player = this.player;
    const playerVersion = jwplayer.version;
    const divId = this.divId;

    events.forEach(event => {
      switch (event) {
        case 'setupComplete':
          player.on('setup', e => {
            const payload = {
              divId,
              playerVersion,
              type: 'setupComplete'
            };
            callback(event, payload);
          });
          break;

        case 'setupFailed':
          player.on('setupError', e => {
            const payload = {
              divId,
              playerVersion,
              type: 'setupFailed',
              errorCode: e.code,
              errorMessage: e.message,
              sourceError: e.sourceError
            };
            callback(event, payload);
          });
          break;

        case 'destroyed':
          //.on('remove') ?
          break;

        case 'adRequest':
          player.on('adRequest', e => {
            const payload = {
              divId,
              type: 'adRequest',
              adTagUrl: e.tag
            };
            callback(event, payload);
          });
          break;

        case 'adLoaded':
          player.on('adLoaded', e => {
            adState.updateForEvent(e);
            const payload = Object.assign({
              divId,
              type: 'adLoaded',
            }, adState.getState());
            callback(event, payload);
          });
          break;

        case 'adBreakStart':
          player.on('adBreakStart', e => {
            const payload = {
              divId,
              type: 'adBreakStart',
              offset: e.adPosition
            };
            callback(event, payload);
          });
          break;

        case 'adImpression':
          player.on('adViewableImpression', e => {
            const payload = Object.assign({
              divId,
              type: 'adImpression',
            }, adState.getState(), timeState.getState());
            callback(event, payload);
          });
          break;

        case 'adStarted':
          player.on('adImpression', e => {
            const payload = Object.assign({
              divId,
              type: 'adStarted',
            }, adState.getState());
            callback(event, payload);
          });
          break;

        case 'adTime':
          player.on('adTime', e => {
            timeState.updateForEvent(e);
            const payload = {
              divId,
              type: 'adTime',
              adTagUrl: e.tag,
              time: e.position,
              duration: e.duration,
            };
            callback(event, payload);
          });
          break;

        case 'adPause':
          player.on('adPause', e => {
            const payload = {
              divId,
              type: 'adPause',
              adTagUrl: e.tag,
            };
            callback(event, payload);
          });
          break;

        case 'adPlay':
          player.on('adPlay', e => {
            const payload = {
              divId,
              type: 'adPlay',
              adTagUrl: e.tag,
            };
            callback(event, payload);
          });
          break;

        case 'adError':
          player.on('adError', e => {
            const payload = Object.assign({
              divId,
              type: 'adError',
              playerErrorCode: e.adErrorCode,
              vastErrorCode: e.code,
              errorMessage: e.message,
              sourceError: e.sourceError
              // timeout
            }, adState.getState(), timeState.getState());
            adState.resetToBaseState();
            callback(event, payload);
          });
          break;

        case 'adClick':
          player.on('adClick', e => {
            const payload = Object.assign({
              divId,
              type: 'adClick',
            }, adState.getState(), timeState.getState());
            callback(event, payload);
          });
          break;

        case 'adSkipped':
          player.on('adSkipped', e => {
            const payload = {
              divId,
              type: 'adSkipped',
              time: e.position,
              duration: e.duration,
            };
            callback(event, payload);
            adState.resetToBaseState();
          });
          break;

        case 'adComplete':
          player.on('adComplete', e => {
            const payload = {
              divId,
              type: 'adComplete',
              adTagUrl: e.tag,
            };
            callback(event, payload);
            adState.resetToBaseState();
          });
          break;

        case 'adBreakEnd':
          player.on('adBreakEnd', e => {
            const payload = {
              divId,
              type: 'adBreakEnd',
              offset: e.adPosition
            };
            callback(event, payload);
          });
          break;

        case 'playbackRequest':
          player.on('playAttempt', e => {
            const payload = {
              divId,
              type: 'playbackRequest',
              playReason: e.playReason,
            };
            callback(event, payload);
          });
          break;

        case 'play':
          player.on('play', e => {
            const payload = {
              divId,
              type: 'play',
            };
            callback(event, payload);
          });
          break;

        case 'pause':
          player.on('pause', e => {
            const payload = {
              divId,
              type: 'pause',
            };
            callback(event, payload);
          });
          break;

        case 'buffer':
          player.on('buffer', e => {
            const payload = Object.assign({
              divId,
              type: 'buffer'
            }, timeState.getState());
            callback(event, payload);
          });
          break;

        case 'autostartBlocked':
          player.on('autostartNotAllowed', e => {
            const payload = {
              divId,
              type: 'autostartBlocked',
              sourceError: e.error,
              errorCode: e.code,
              errorMessage: e.message
            };
            callback(event, payload);
          });
          break;

        case 'playAttemptFailed':
          player.on('playAttemptFailed', e => {
            const payload = {
              divId,
              type: 'playAttemptFailed',
              playReason: e.playReason,
              sourceError: e.sourceError,
              errorCode: e.code,
              errorMessage: e.message
            };
            callback(event, payload);
          });
          break;

        case 'time':
          player.on('time', e => {
            const payload = {
              divId,
              type: 'time',
              position: e.position,
              duration: e.duration
            };
            callback(event, payload);
          });
          break;

        case 'seekStart':
          player.on('seek', e => {
            const duration = e.duration;
            pendingSeek = {
              duration,
              offset: e.offset
            };
            const payload = {
              divId,
              type: 'seekStart',
              position: e.position,
              duration: duration
            };
            callback(event, payload);
          });
          break;

        case 'seekEnd':
          player.on('seeked', e => {
            const payload = {
              divId,
              type: 'seekEnd',
              position: pendingSeek.offset,
              duration: pendingSeek.duration
            };
            callback(event, payload);
            pendingSeek = {};
          });
          break;

        case 'complete':
          player.on('complete', e => {
            const payload = {
              divId,
              type: 'complete',
            };
            callback(event, payload);
          });
          break;

        case 'error':
          player.on('error', e => {
            const payload = {
              divId,
              type: 'error',
              sourceError: e.sourceError,
              errorCode: e.code,
              errorMessage: e.message,
            };
            callback(event, payload);
          });
          break;

        case 'playlist':
          player.on('playlist', e => {
            const playlistItemCount = e.playlist.length;
            const payload = {
              divId,
              type: 'playlist',
              playlistItemCount,
              autostart: playerConfig.autostart
            };
            callback(event, payload);
          });
          break;

        case 'contentLoaded':
          player.on('playlistItem', e => {
            const { item, index } = e;
            const payload = {
              divId,
              type: 'contentLoaded',
              contentId: item.mediaid,
              contentUrl: item.file, // cover other sources ? util ?
              title: item.title,
              description: item.description,
              playlistIndex: index,
              // Content Tags (Required - nullable)
            };
            callback(event, payload);
          });
          break;

        case 'playlistComplete':
          player.on('playlistComplete', e => {
            const payload = {
              divId,
              type: 'playlistComplete',
            };
            callback(event, payload);
          });
          break;

        case 'mute':
          player.on('mute', e => {
            const payload = {
              divId,
              type: 'mute',
              mute: e.mute
            };
            callback(event, payload);
          });
          break;

        case 'volume':
          player.on('volume', e => {
            const payload = {
              divId,
              type: 'volume',
              volumePercentage: e.volume,
            };
            callback(event, payload);
          });
          break;

        case 'renditionUpdate':
          player.on('visualQuality', e => {
            const bitrate = e.bitrate;
            const level = e.level;
            const payload = {
              divId,
              type: 'renditionUpdate',
              videoReportedBitrate: bitrate,
              audioReportedBitrate: bitrate,
              encodedVideoWidth: level.width,
              encodedVideoHeight: level.height,
              // videoFramerate (Required)
            };
            callback(event, payload);
          });
          break;

        case 'fullscreen':
          player.on('fullscreen', e => {
            const payload = {
              divId,
              type: 'fullscreen',
              fullscreen: e.fullscreen,
            };
            callback(event, payload);
          });
          break;

        case 'playerResize':
          player.on('resize', e => {
            const payload = {
              divId,
              type: 'playerResize',
              height: e.height,
              width: e.width,
            };
            callback(event, payload);
          });
          break;

        case 'viewable':
          player.on('viewable', e => {
            const payload = {
              divId,
              type: 'viewable',
              viewable: e.viewable,
              viewabilityPercentage: jwplayer().getPercentViewable() * 100,
            };
            callback(event, payload);
          });
          break;

        case 'cast':
          player.on('cast', e => {
            const payload = {
              divId,
              type: 'cast',
              casting: e.active
            };
            callback(event, payload);
          });
          break;
      }
    });
  }

  const offEvents = function(events, callback) {

  }

  const destroy = function() {
    this.offEvents();
    player = null;
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
  // todo calculate
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

function jwplayerPlacementToCode(placement) {
  switch (placement) {
    case 'instream':
      return 1;
      break;

    case 'banner':
      return 2;
      break;

    case 'article':
      return 3;
      break;

    case 'feed':
      return 4;
      break;

    case 'interstitial':
    case 'slider':
    case 'floating':
      return 5;
  }
}

class AdState extends State {
  constructor(adConfig) {
    super({
      skippable: adConfig.skippable,
      skipOffset: adConfig.skipOffset,
    });
  }

  updateForEvent(event) {
    const updates = {
      adTagUrl: event.tag,
      offset: event.adPosition,
      loadTime: event.timeLoading,
      vastAdId: event.id,
      adDescription: event.description,
      adServer: event.adsystem,
      adTitle: event.adtitle,
      advertiserId: event.advertiserId,
      advertiserName: event.advertiser,
      dealId: event.dealId,
      // adCategories
      linear: event.linear,
      vastVersion: event.vastversion,
      // campaignId:
      creativeUrl: event.mediaFile,
      adId: event.adId,
      universalAdId: event.universalAdId,
      creativeId: event.creativeAdId,
      creativeType: event.creativetype,
      redirectUrl: event.clickThroughUrl,
      adPlacementType: jwplayerPlacementToCode(event.placement),
      waterfallIndex: event.witem,
      waterfallCount: event.wcount,
      adPodCount: event.podcount,
      adPodIndex: event.sequence,
    };
    updateState(updates);
  }
}

class TimeState extends State {
  updateForEvent(event) {
    const { position, duration } = event;

    let playbackMode;
    if (duration > 0) {
      playbackMode = 0; //vod
    } else if (duration < 0) {
      playbackMode = 2; //dvr
    } else {
      playbackMode = 1; //live
    }

    updateState({
      time: position,
      duration,
      playbackMode
    });
  }
}

class State {
  constructor(baseState) {
    this.state = this.baseState = baseState || {};
  }

  updateState(update) {
    Object.assign(this.state, update);
  }

  getState() {
    return this.state;
  }

  resetToBaseState() {
    this.state = this.baseState;
  }

  clearState() {
    this.state = null;
  }
}

window.jwplayerVideoFactory = jwplayerVideoFactory;

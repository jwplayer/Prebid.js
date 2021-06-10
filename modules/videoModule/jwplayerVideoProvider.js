
// export
const jwplayerVideoFactory = function (config) {
  this.player = null;
  const playerConfig = config.playerConfig;
  const divId = config.divId;
  const jwplayer = window.jwplayer;
  const minimumSupportedPlayerVersion = '8.20.0';
  let adState = null; //adStaticState ?
  let adTimeState = null;
  let mediaState = null;
  let mediaTimeState = null;
  let seekState = null;
  let playlistState = null;

  this.init = function() {
    if (!jwplayer) {
      // error ?
      return;
    }

    const player = jwplayer(divId);
    if (player.getState() === undefined) {
      player.setup(getJwConfig(playerConfig))
        .on('ready', () => {
        // trigger setupComplete
        });
    } else {
      // trigger setupComplete
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

  this.renderAd = function(adTagUrl) {
    this.player.playAd(adTagUrl);
  }

  function getBasePayload() {
    return {

    };
  }

  function updateAdTime(event) {
    const updates = {
      adCurrentTime: event.position,
      adDuration: event.duration
    };
    this.adTime = updates;
  }

  function updateAdState(event) {
    const updates = {};
    updates.adTagUrl = event.tag,
    updates.offset = event.adPosition,
    // loadTime
    updates.vastAdId = event.id,
    updates.adDescription = event.description,
    updates.adServer = event.adsystem,
    updates.adTitle = event.adtitle,
    updates.advertiserId = event.advertiserId,
    updates.advertiserName = event.advertiser,
    updates.dealId = event.dealId,
    // adCategories
    updates.linear = event.linear,
    updates.vastVersion = event.vastversion,
    // campaignId =
    updates.creativeUrl = event.mediaFile,
    updates.adId = event.adId,
    updates.universalAdId = event.universalAdId,
    updates.creativeId = event.creativeAdId,
    updates.creativeType = event.creativetype,
    updates.redirectUrl = event.clickThroughUrl,
    updates.adPlacementType = jwplayerPlacementToCode(event.placement)

      // might have to be updated
    updates.waterfallIndex = event.witem,
    updates.waterfallCount = event.wcount,
    //ad pod count
    //ad pod index

      // get from config
    // skippable =
    // skipOffset =
      // timeout ?
    this.adState = updates;
  }

  function updateMediaState(event) {
    const item = event.item;
    contentId: item.mediaid,
      contentUrl: item.file, // cover other sources ? util ?
      title: item.title,
      description: item.description,
      playlistIndex: event.index,
  }

  function updateMediaTimeState(event) {
    const { position, duration } = event;
    let playbackMode;
    if (duration > 0) {
      playbackMode = 0; //vod
    } else if (duration < 0) {
      playbackMode = 2; //dvr
    } else {
      playbackMode = 1; //live
    }

    this.mediaTimeState = {
      position,
      duration,
      playbackMode
    }
  }

  this.onEvents = function(events, callback) {
    const player = this.player;
    const playerVersion = jwplayer.version;
    const divId = this.divId;
    let adState = null;

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
              error: e.sourceError // rename to source error ?
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
            updateAdState(e);
            const payload = {
              divId,
              type: 'adLoaded',
              adTagUrl: e.tag,
              loadTime: e.timeLoadingd
            };
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
            // update, has waterfall data
            const payload = Object.assign({
              divId,
              type: 'adImpression',
              waterfallIndex: e.witem,
              waterfallCount: e.wcount,
            }, this.adState, this.adTime);
            callback(event, payload);
          });
          break;

        case 'adStarted':
          player.on('adImpression', e => {
            // update, has waterfall data
            const payload = Object.assign({
              divId,
              type: 'adStarted',
              duration: e.duration,
              waterfallIndex: e.witem,
              waterfallCount: e.wcount,
              //ad pod count
              //ad pod index
            }, this.adState);
            callback(event, payload);
          });
          break;

        case 'adTime':
          player.on('adTime', e => {
            updateAdTime(e);
            const payload = {
              divId,
              type: 'adTime',
              adTagUrl: e.tag,
              adCurrentTime: e.position,
              adDuration: e.duration,
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
            }, this.adState, this.adTime);
            callback(event, payload);
          });
          break;

        case 'adClick':
          player.on('adClick', e => {
            const payload = Object.assign({
              divId,
              type: 'adClick',
            }, this.adState, this.adTime);
            callback(event, payload);
          });
          break;

        case 'adSkipped':
          player.on('adSkipped', e => {
            const payload = {
              divId,
              type: 'adSkipped',
              adCurrentTime: e.position,
              adDuration: e.duration,
            };
            callback(event, payload);
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
          player.on('playAttempt', () => {
            const payload = {
              divId,
              type: 'playbackRequest'
            };
            callback(event, payload);
          });
          break;

        case 'play':
          player.on('play', e => {
            const mediaState = this.mediaState;
            const payload = {
              divId,
              type: 'play',
              contentId: mediaState.contentId,
              contentUrl: mediaState.contentUrl
              // casting:
            };
            callback(event, payload);
          });
          break;

        case 'pause':
          player.on('pause', e => {
            const mediaState = this.mediaState;
            const payload = {
              divId,
              type: 'pause',
              contentId: mediaState.contentId,
              contentUrl: mediaState.contentUrl
              // casting:
            };
            callback(event, payload);
          });
          break;

        case 'buffer':
          player.on('buffer', e => {
            const payload = Object.assign({
              divId,
              type: 'buffer'
            }, this.mediaTimeState);
            callback(event, payload);
          });
          break;

        case 'autostartBlocked':
          player.on('autostartNotAllowed', e => {
            const mediaState = this.mediaState;
            const playbackMode = this.mediaTimeState.playbackMode;
            const payload = {
              divId,
              type: 'autostartBlocked',
              contentId: mediaState.contentId,
              contentUrl: mediaState.contentUrl
              playbackMode,
              // casting:

              /*
Play reason (Required)
Error Code (optional)
Error message (optional)
Error (optional)

               */
            };
            callback(event, payload);
          });
          break;

        case 'playAttemptFailed':
          player.on('playAttemptFailed', e => {
            const mediaState = this.mediaState;
            const playbackMode = this.mediaTimeState.playbackMode;
            const { playlistItemCount, playlistItemIndex } = this.playlistState;
            const payload = {
              divId,
              type: 'playAttemptFailed',
              contentId: mediaState.contentId,
              contentUrl: mediaState.contentUrl,
              // casting:
              playlistItemIndex,
              playlistItemCount,
              playbackMode,
              playReason: e.playReason,
              error: e.error
            };
            callback(event, payload);
          });
          break;

          /*
Playback method (Required)
Error Code (optional)
Error Message (optional)
           */

        case 'time':
          player.on('time', e => {
            const { contentId, contentUrl } = this.mediaState;
            const payload = {
              divId,
              type: 'time',
              contentId,
              contentUrl,
              position: e.position,
              duration: e.duration
            };
            callback(event, payload);
          });
          break;

        case 'seekStart':
          player.on('seek', e => {
            const mediaState = this.mediaState;
            const duration = e.duration;
            this.seekState = {
              duration,
              offset: e.offset
            };
            const payload = {
              divId,
              type: 'seekStart',
              contentId: mediaState.contentId,
              contentUrl: mediaState.contentUrl,
              position: e.position,
              duration: duration
            };
            callback(event, payload);
          });
          break;

        case 'seekEnd':
          player.on('seeked', e => {
            const mediaState = this.mediaState;
            const seekState = this.seekState;
            const payload = {
              divId,
              type: 'seekEnd',
              contentId: mediaState.contentId,
              contentUrl: mediaState.contentUrl,
              position: seekState.offset,
              duration: seekState.duration
            };
            callback(event, payload);
          });
          break;

        case 'complete':
          player.on('complete', e => {
            const { contentId, contentUrl } = this.mediaState;
            const { playlistItemCount, playlistItemIndex } = this.playlistState;
            const playbackMode = this.mediaTimeState.playbackMode;
            const payload = {
              divId,
              type: 'complete',
              contentId,
              contentUrl,
              playlistItemCount,
              playlistItemIndex,
              playbackMode
            };
            callback(event, payload);
          });
          break;

        case 'error':
          player.on('error', e => {
            const { contentId, contentUrl } = this.mediaState;
            const { playlistItemCount, playlistItemIndex } = this.playlistState;
            const payload = {
              divId,
              type: 'error',
              error: e.sourceError,
              errorCode: e.code,
              errorMessage: e.message,
              contentId,
              contentUrl,
              playlistItemCount,
              playlistItemIndex
            };
            callback(event, payload);
          });
          break;

        case 'playlist':
          player.on('playlist', e => {
            const playlistItemCount = e.playlist.length;
            this.playlistState = {
              playlistItemCount
            };
            const payload = {
              divId,
              type: 'playlist',
              playlistItemCount
              /*
autostart
               */
            };
            callback(event, payload);
          });
          break;

        case 'contentLoaded':
          player.on('playlistItem', e => {
            const { item, index } = e;
            updateMediaState(item);
            this.playlistState.playlistItemIndex = index;
            const payload = {
              divId,
              type: 'contentLoaded',
              contentId: item.mediaid,
              contentUrl: item.file, // cover other sources ? util ?
              title: item.title,
              description: item.description,
              playlistIndex: index,
              playlistItemCount: this.playlistState.playlistItemCount

              /*
autostart
               */
            };
            callback(event, payload);
          });
          break;
          /*
Content Tags (Required - nullable)
Autostart (Required)
Casting (optional)
Video Height (Required)
Video Width (Required)
play reason (Required)
Playback method (Required)

           */

        case 'playlistComplete':
          player.on('playlistComplete', e => {
            const payload = {
              divId,
              type: 'playlistComplete',
              playlistItemCount: this.playlistState.playlistItemCount
            };
            callback(event, payload);
          });
          break;

        case 'mute':
          player.on('mute', e => {
            const { contentId, contentUrl } = this.mediaState;
            const payload = {
              divId,
              type: 'mute',
              mute: e.mute,
              contentId,
              contentUrl
            };
            callback(event, payload);
          });
          break;

        case 'volume':
          player.on('volume', e => {
            const { contentId, contentUrl } = this.mediaState;
            const payload = {
              divId,
              type: 'volume',
              volumePercentage: e.volume,
              contentId,
              contentUrl
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
              encodedVideoHeight: level.height
            };
            callback(event, payload);
          });
          break;
          /*
videoFramerate (Required)
           */

        case 'fullscreen':
          player.on('fullscreen', e => {
            const { contentId, contentUrl } = this.mediaState;
            const payload = {
              divId,
              type: 'fullscreen',
              fullscreen: e.fullscreen
              contentId,
              contentUrl
            };
            callback(event, payload);
          });
          break;

        case 'playerResize':
          player.on('resize', e => {
            const { contentId, contentUrl } = this.mediaState;
            const payload = {
              divId,
              type: 'playerResize',
              height: e.height,
              width: e.width,
              contentId,
              contentUrl
            };
            callback(event, payload);
          });
          break;

        case 'viewable':
          player.on('viewable', e => {
            const { contentId, contentUrl } = this.mediaState;
            const payload = {
              divId,
              type: 'viewable',
              viewable: e.viewable,
              viewabilityPercentage: jwplayer().getPercentViewable() * 100,
              contentId,
              contentUrl
            };
            callback(event, payload);
          });
          break;
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
    init: this.init,
    getId: this.getId,
    getVideoParams: this.getVideoParams,
    renderAd: this.renderAd,
    onEvents: this.onEvents,
    offEvents: this.offEvents,
    destroy: this.destroy
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

function Payload() {
  this.state = null;

  this.setInitialState = function (state) {
    this.state = state;
  }

  this.updateState = function(update) {
    Object.assign(this.state, update);
  }

  this.clearState = function () {
    this.state = null;
  }

  this.getState = function () {
    return this.state;
  }
}

window.jwplayerVideoFactory = jwplayerVideoFactory;

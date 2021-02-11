import {
  DEFAULT_PRICE_BUCKET_INCREMENT,
  DEFAULT_TIMEOUT,
  MEDIA_TYPES,
  OPENRTB_API_FRAMEWORKS as API_FRAMEWORKS,
  OPENRTB_PROTOCOLS as PROTOCOLS,
  PLACEMENT_INSTREAM,
  TIMEOUT_FLOOR,
  VPB_CACHE
} from "../../jwplayer-ads-header-bidding/src/constants";
import {filterCanPlay, getBuckets, getPlaybackMethod, getStartDelay} from "../../jwplayer-ads-header-bidding/src/utils";
// import Bids from "../../jwplayer-ads-header-bidding/src/Bids";

export function jwplayerVideoModule(playerInstance) {
  return {
    getVideoParams: function () {
      const video = {
        context: 'instream',
        playerSize: [ player.getWidth(), player.getHeight() ],

        // required for DistrictM and MediaNet
        mimes: filterCanPlay(MEDIA_TYPES),
        protocols: [ // Supported video protocols.
          PROTOCOLS.VAST_2_0,
          PROTOCOLS.VAST_3_0,
          PROTOCOLS.VAST_4_0,
          PROTOCOLS.VAST_2_0_WRAPPER,
          PROTOCOLS.VAST_3_0_WRAPPER,
          PROTOCOLS.VAST_4_0_WRAPPER
        ],

        playbackmethod: [ getPlaybackMethod(player.getConfig()) ],
        api: [ // Required for VPAIDs; list of supported API frameworks.
          API_FRAMEWORKS.VPAID_2_0
        ],
        // startdelay: getStartDelay(params.offset), // 0 = pre-roll, -1 = generic mid-roll, -2 = post-roll, >0 = mid-roll.
        // placement: params.placement, // 1 = instream, 3 = outstream.

        // Undocumented in prebid but part of oRTB
        linearity: 1, // 1 = linear, 2 = non-linear.
        minduration: 3,
        maxduration: 300
      };

      if (player.getFullscreen()) {
        // only specify ad position when in Fullscreen since computational cost is low
        // ad position options are listed in oRTB 2.5 section 5.4
        // https://www.iab.com/wp-content/uploads/2016/03/OpenRTB-API-Specification-Version-2-5-FINAL.pdf
        video.pos = 7;
      }

      // const skipoffset = params.skipoffset;
      // if (skipoffset !== undefined) {
      //   const skippable = skipoffset >= 0;
      //   video.skip = skippable ? 1 : 0;
      //   if (skippable) {
      //     video.skipmin = skipoffset + 2;
      //     video.skipafter = skipoffset;
      //   }
      // }

      return video;
    }
  }

}

export const pluginClass = function(player, config = {} /* , div */) {
  // The config argument is the `advertising.bids` block.

  // Determine price granularity.
  let { buckets, bidTimeout } = config.settings || {};
  buckets = Array.isArray(buckets) && buckets.length ? buckets : [{ increment: DEFAULT_PRICE_BUCKET_INCREMENT }];
  bidTimeout = bidTimeout === undefined ? DEFAULT_TIMEOUT : Math.max(bidTimeout, TIMEOUT_FLOOR);

  // Configure Prebid.js.
  // @see http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.setConfig
  prebid.setConfig({
    bidderTimeout: bidTimeout,
    cache: { url: VPB_CACHE },
    debug: __DEBUG__ && !!config.debug, // Allow debug messages in development.
    priceGranularity: { buckets: getBuckets(buckets) },

    // http://prebid.org/dev-docs/modules/consentManagement.html
    consentManagement: {
      gdpr: {
        allowAuctionWithoutConsent: true,
        cmpApi: 'iab',
        timeout: 1000
      }
    },

    userSync: {
      filterSettings: {
        all: {
          bidders: '*',
          filter: 'include'
        }
      },
      syncDelay: 1000
    }
  });

  // Allow external Prebid hooks to execute.
  prebid.processQueue();

  // Return public API.
  const bids = {}; // Keep track of all bids.
  return {
    createNewBid: (params, utils) => {
      console.log('bid requested');
      // const bid = new Bids(player, prebid, config, params, utils);
      // bids[bid.id] = bid;
      // return bid;
    },
    getBid: (id) => bids[id],
    // getEngine: () => prebid,
    // version: __VERSION__
  };
};

// Plug entrypoint into player plugin architecture.
const registerPlugin = window.jwplayerPluginJsonp || window.jwplayer().registerPlugin;
registerPlugin('bidding', '8.1', pluginClass);

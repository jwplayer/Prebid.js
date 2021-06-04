export const jwplayerVideoFactory = function (config) {

  this.player;
  const playerConfig = config.playerConfig;
  const divId = config.divId;

  this.init = function() {
    if(!jwplayer) {
      //error ?
      return;
    }
    this.player = jwplayer(divId);
    // if no player, instantiate.
  }

  this.getVideoParams = function() {
    const video = {
      mimes: [],

    };

    const content = {

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

  }

  this.offEvents = function(events, callback) {

  }

  return {
    init,
    getVideoParams,
    renderAd,
    onEvents,
    offEvents
  };
};

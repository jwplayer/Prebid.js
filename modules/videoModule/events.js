/**
 * events.js
 */
var utils = require('../../src/utils.js');
var slice = Array.prototype.slice;
var push = Array.prototype.push;

// keep a record of all events fired
var eventsFired = [];

module.exports = function (allEvents) {
  var _handlers = {};
  var _public = {};

  /**
   *
   * @param {String} eventString  The name of the event.
   * @param {Array} args  The payload emitted with the event.
   * @private
   */
  function _dispatch(eventString, args) {
    utils.logMessage('Emitting event for: ' + eventString);

    var eventPayload = args[0] || {};
    var event = _handlers[eventString] || { que: [] };

    var callbacks = [];

    // record the event:
    eventsFired.push({
      eventType: eventString,
      args: eventPayload,
      elapsedTime: utils.getPerformanceNow(),
    });

    /** Push each general callback to the `callbacks` array. */
    push.apply(callbacks, event.que);

    /** call each of the callbacks */
    callbacks.forEach(callback => {
      if (!callback) return;
      try {
        callback.apply(null, args);
      } catch (e) {
        utils.logError('Error executing handler:', 'events.js', e);
      }
    });
  }

  function _checkAvailableEvent(event) {
    return utils.contains(allEvents, event);
  }

  _public.on = function (eventString, handler, id) {
    // check whether available event or not
    if (_checkAvailableEvent(eventString)) {
      var event = _handlers[eventString] || { que: [] };
      event.que.push(handler);
      _handlers[eventString] = event;
    } else {
      utils.logError('Wrong event name : ' + eventString + ' Valid event names :' + allEvents);
    }
  };

  _public.emit = function (event) {
    var args = slice.call(arguments, 1);
    _dispatch(event, args);
  };

  _public.off = function (eventString, handler, id) {
    var event = _handlers[eventString];

    if (utils.isEmpty(event) || utils.isEmpty(event.que)) {
      return;
    }

    var que = event.que;
    event.que.forEach(callback => {
      if (callback === handler) {
        que.splice(que.indexOf(callback), 1);
        que = event.que;
      }
    });

    _handlers[eventString] = event;
  };

  _public.get = function () {
    return _handlers;
  };

  /**
   * This method can return a copy of all the events fired
   * @return {Array} array of events fired
   */
  _public.getEvents = function () {
    var eventsCopy = [];
    eventsFired.forEach(event => {
      var eventCopy = Object.assign({}, event);
      eventsCopy.push(eventCopy);
    });

    return eventsCopy;
  };

  return _public;
};

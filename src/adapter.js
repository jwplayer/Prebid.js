export default function Adapter(code, adapterName) {
  var bidderCode = code;
  var adapter = adapterName

  function setBidderCode(code) {
    bidderCode = code;
  }

  function getBidderCode() {
    return bidderCode;
  }

  function setAdapterName(adapterName) {
    adapter = adapterName;
  }

  function getAdapterName() {
    return adapter;
  }

  function callBids() {
  }

  return {
    callBids: callBids,
    setBidderCode: setBidderCode,
    getBidderCode: getBidderCode,
    setAdapterName: setAdapterName,
    getAdapterName: getAdapterName,
  };
}

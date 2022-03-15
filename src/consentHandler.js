import {isStr, timestamp} from './utils.js';

export class ConsentHandler {
  constructor() {
    this.reset();
  }

  /**
   * reset this handler (mainly for tests)
   */
  reset() {
    const promise = new Promise((resolve) => {
      this.resolve = (data) => {
        this.setReady(true);
        this.data = data;
        resolve(data);
      };
    });
    this.setPromise(promise);
    this.setEnabled(false);
    this.data = null;
    this.setReady(false);
    this.generatedTime = null;
  }

  /**
   * Enable this consent handler. This should be called by the relevant consent management module
   * on initialization.
   */
  enable() {
    this.enabled = true;
  }

  /**
   * @returns {boolean} true if the related consent management module is enabled.
   */
  get enabled() {
    return this.enabled;
  }

  setEnabled(flag) {
    this.enabled = flag;
  }

  /**
   * @returns {boolean} true if consent data has been resolved (it may be `null` if the resolution failed).
   */
  get ready() {
    return this.ready;
  }

  setReady(flag) {
    this.ready = flag;
  }

  /**
   * @returns a promise than resolves to the consent data, or null if no consent data is available
   */
  get promise() {
    if (!this.enabled) {
      this.resolve(null);
    }
    return this.promise;
  }

  setPromise(prom) {
    this.promise = prom;
  }

  setConsentData(data, time = timestamp()) {
    this.generatedTime = time;
    this.resolve(data);
  }

  getConsentData() {
    return this.data;
  }
}

export class UspConsentHandler extends ConsentHandler {
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && this.generatedTime) {
      return {
        usp: consentData,
        generatedAt: this.generatedTime
      };
    }
  }
}

export class GdprConsentHandler extends ConsentHandler {
  getConsentMeta() {
    const consentData = this.getConsentData();
    if (consentData && consentData.vendorData && this.generatedTime) {
      return {
        gdprApplies: consentData.gdprApplies,
        consentStringSize: (isStr(consentData.vendorData.tcString)) ? consentData.vendorData.tcString.length : 0,
        generatedAt: this.generatedTime,
        apiVersion: consentData.apiVersion
      }
    }
  }
}

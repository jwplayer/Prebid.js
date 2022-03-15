import {isStr, timestamp} from './utils.js';
import {defer, GreedyPromise} from './utils/promise.js';

export class ConsentHandler {
  constructor() {
    this.enabled = false;
    this.ready = false;
    this.reset();
  }

  #resolve(data) {
    this.#ready = true;
    this.#data = data;
    this.#defer.resolve(data);
  }

  /**
   * reset this handler (mainly for tests)
   */
  reset() {
    this.promise = new Promise((resolve) => {
      this.resolve = (data) => {
        this.ready = true;
        this.data = data;
        resolve(data);
      };
    });
    this.enabled = false;
    this.data = null;
    this.ready = false;
    this.generatedTime = null;
  }

  /**
   * @returns a promise than resolves to the consent data, or null if no consent data is available
   */
  get promise() {
    if (this.ready) {
      return Promise.resolve(this.data);
    }

    if (!this.enabled) {
      this.resolve(null);
    }
    return this.promise;
  }

  set promise(prom) {
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

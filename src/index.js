import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";

import { Amplify } from "aws-amplify";
import config from "./aws-exports";

Amplify.Logger.LOG_LEVEL = "DEBUG";

// custom storage
const MYSTORAGE_KEY_PREFIX = "CustomStorage-";
// const MYSTORAGE_KEY_PREFIX = "@MyStorage:";
// let dataMemory = {};
class MyStorage {
  // set item with the key
  static setItem(key, value) {
    this.getStorage(key).setItem(this.getInternalKey(key), value);
  }
  // get item with the key
  static getItem(key) {
    return this.getStorage(key).getItem(this.getInternalKey(key));
  }
  // remove item with the key
  static removeItem(key) {
    console.log("removeItem", key);
    this.getStorage(key).removeItem(this.getInternalKey(key));
  }
  // get internal key for storage
  static getInternalKey(key) {
    return `${MYSTORAGE_KEY_PREFIX}${key}`;
  }
  // get the storage object
  static getStorage(key) {
    const volatileKeysRegEx =
      /(idToken|accessToken|refreshToken|LastAuthUser)$/;
    return key.search(volatileKeysRegEx) !== -1 ? sessionStorage : localStorage;
  }
  // clear out the storage
  static clear() {
    this.clearStorage(sessionStorage);
    this.clearStorage(localStorage);
  }
  // clear out the storage
  static clearStorage(storage) {
    const keysToRemove = [];
    for (let _i = 0; _i < storage.length; _i++) {
      const key = storage.key(_i);
      if (key !== null && key.startsWith(MYSTORAGE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key in keysToRemove) {
      storage.removeItem(key);
    }
  }
}

Amplify.configure({
  ...config,
  Auth: {
    storage: MyStorage,
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

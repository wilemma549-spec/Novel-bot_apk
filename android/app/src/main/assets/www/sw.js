/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "6603e69af6c6b9408c51786f4d402ae4"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6603e69af6c6b9408c51786f4d402ae4"
  }, {
    "url": "pwa-192x192.png",
    "revision": "8010e1b08174990766b5db831cd5c76c"
  }, {
    "url": "index.html",
    "revision": "78a0d77b54e08c1a102cc83406686755"
  }, {
    "url": "icon.svg",
    "revision": "beb5bc4fdad3c111ad6739c3b4d67271"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "afd1e693a2bcb20f156eb9dd84c84358"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-BlVzZvHJ.js",
    "revision": null
  }, {
    "url": "assets/index-BChtQySJ.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "afd1e693a2bcb20f156eb9dd84c84358"
  }, {
    "url": "icon.svg",
    "revision": "beb5bc4fdad3c111ad6739c3b4d67271"
  }, {
    "url": "pwa-192x192.png",
    "revision": "8010e1b08174990766b5db831cd5c76c"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6603e69af6c6b9408c51786f4d402ae4"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "6603e69af6c6b9408c51786f4d402ae4"
  }, {
    "url": "manifest.webmanifest",
    "revision": "578e7bd92f6a46a1ea2f1c37b36169af"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));

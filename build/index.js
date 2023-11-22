"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeGoogleMapsAndPlacesAppDelegateInit = exports.addGoogleMapsAppDelegateInit = exports.removeGoogleMapsAndPlacesAppDelegateImport = exports.addGoogleMapsAndPlacesAppDelegateImport = exports.setGoogleMapsAndPlacesApiKey = exports.getGooglePlacesClientKey = exports.getGoogleMapsApiKey = exports.withPlaces = exports.MATCH_INIT = void 0;
const path_1 = __importDefault(require("path"));
const resolve_from_1 = __importDefault(require("resolve-from"));
const config_plugins_1 = require("@expo/config-plugins");
const ios_plugins_1 = require("@expo/config-plugins/build/plugins/ios-plugins");
const generateCode_1 = require("@expo/config-plugins/build/utils/generateCode");
const debug = require('debug')('google-places-plugin');
exports.MATCH_INIT = /-\s*\(BOOL\)\s*application:\s*\(UIApplication\s*\*\s*\)\s*\w+\s+didFinishLaunchingWithOptions:/g;
const withGoogleMapsAndPlacesKey = (0, ios_plugins_1.createInfoPlistPlugin)(setGoogleMapsAndPlacesApiKey, 'withGoogleMapsAndPlacesKey');
const withPlaces = (config) => {
    config = withGoogleMapsAndPlacesKey(config);
    const apiKey = getGoogleMapsApiKey(config);
    const clientKey = getGooglePlacesClientKey(config);
    debug('Google Maps API Key:', apiKey);
    debug('Google Places Client Key:', clientKey);
    // Adds/Removes AppDelegate setup for Google Maps API on iOS
    config = withGooglePlacesAppDelegate(config, { apiKey, clientKey });
    return config;
};
exports.withPlaces = withPlaces;
function getGoogleMapsApiKey(config) {
    return config.ios?.config?.googleMapsApiKey ?? undefined;
}
exports.getGoogleMapsApiKey = getGoogleMapsApiKey;
function getGooglePlacesClientKey(config) {
    return config.extra?.ios?.googlePlacesClientKey ?? undefined;
}
exports.getGooglePlacesClientKey = getGooglePlacesClientKey;
function setGoogleMapsAndPlacesApiKey(config, { GMSApiKey, GMSPlacesClientKey, ...infoPlist }) {
    const apiKey = getGoogleMapsApiKey(config);
    const clientKey = getGooglePlacesClientKey(config);
    if (apiKey === null && clientKey === null) {
        return infoPlist;
    }
    return {
        ...infoPlist,
        GMSApiKey: apiKey,
        GMSPlacesClientKey: clientKey,
    };
}
exports.setGoogleMapsAndPlacesApiKey = setGoogleMapsAndPlacesApiKey;
function addGoogleMapsAndPlacesAppDelegateImport(src) {
    const newSrc = [];
    newSrc.push('#if __has_include(<GoogleMaps/GoogleMaps.h>)', '#import <GoogleMaps/GoogleMaps.h>', '#endif', '#if __has_include(<GooglePlaces/GooglePlaces.h>)', '#import <GooglePlaces/GooglePlaces.h>', '#endif');
    return (0, generateCode_1.mergeContents)({
        tag: 'react-native-google-places-import',
        src,
        newSrc: newSrc.join('\n'),
        anchor: /#import "AppDelegate\.h"/,
        offset: 1,
        comment: '//',
    });
}
exports.addGoogleMapsAndPlacesAppDelegateImport = addGoogleMapsAndPlacesAppDelegateImport;
function removeGoogleMapsAndPlacesAppDelegateImport(src) {
    return (0, generateCode_1.removeContents)({
        tag: 'react-native-google-places-import',
        src,
    });
}
exports.removeGoogleMapsAndPlacesAppDelegateImport = removeGoogleMapsAndPlacesAppDelegateImport;
function addGoogleMapsAppDelegateInit(src, apiKey, clientKey) {
    const newSrc = [];
    newSrc.push('#if __has_include(<GoogleMaps/GoogleMaps.h>)', `  [GMSServices provideAPIKey:@"${apiKey}"];`, '#endif', '#if __has_include(<GooglePlaces/GooglePlaces.h>)', `  [GMSPlacesClient provideAPIKey:@"${clientKey}"];`, '#endif');
    return (0, generateCode_1.mergeContents)({
        tag: 'react-native-google-places-init',
        src,
        newSrc: newSrc.join('\n'),
        anchor: exports.MATCH_INIT,
        offset: 2,
        comment: '//',
    });
}
exports.addGoogleMapsAppDelegateInit = addGoogleMapsAppDelegateInit;
function removeGoogleMapsAndPlacesAppDelegateInit(src) {
    return (0, generateCode_1.removeContents)({
        tag: 'react-native-google-places-init',
        src,
    });
}
exports.removeGoogleMapsAndPlacesAppDelegateInit = removeGoogleMapsAndPlacesAppDelegateInit;
function isReactNativeGooglePlacesInstalled(projectRoot) {
    const resolved = resolve_from_1.default.silent(projectRoot, 'react-native-google-places/package.json');
    return resolved ? path_1.default.dirname(resolved) : null;
}
const withGooglePlacesAppDelegate = (config, { apiKey, clientKey }) => {
    return (0, config_plugins_1.withAppDelegate)(config, (config) => {
        if (['objc', 'objcpp'].includes(config.modResults.language)) {
            if (apiKey &&
                isReactNativeGooglePlacesInstalled(config.modRequest.projectRoot)) {
                try {
                    config.modResults.contents = addGoogleMapsAndPlacesAppDelegateImport(config.modResults.contents).contents;
                    config.modResults.contents = addGoogleMapsAppDelegateInit(config.modResults.contents, apiKey, clientKey).contents;
                }
                catch (error) {
                    if (error.code === 'ERR_NO_MATCH') {
                        throw new Error(`Cannot add Google Places to the project's AppDelegate because it's malformed. Please report this with a copy of your project AppDelegate.`);
                    }
                    throw error;
                }
            }
            else {
                config.modResults.contents = removeGoogleMapsAndPlacesAppDelegateImport(config.modResults.contents).contents;
                config.modResults.contents = removeGoogleMapsAndPlacesAppDelegateInit(config.modResults.contents).contents;
            }
        }
        else {
            throw new Error(`Cannot setup Google Places because the project AppDelegate is not a supported language: ${config.modResults.language}`);
        }
        return config;
    });
};
module.exports = exports.withPlaces;

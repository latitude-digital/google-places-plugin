import { ExpoConfig } from '@expo/config-types';
import fs from 'fs';
import path from 'path';
import resolveFrom from 'resolve-from';

import { ConfigPlugin, InfoPlist, withAppDelegate, withDangerousMod } from '@expo/config-plugins';
import { createInfoPlistPlugin } from '@expo/config-plugins/build/plugins/ios-plugins';
import { mergeContents, MergeResults, removeContents } from '@expo/config-plugins/build/utils/generateCode';

const debug = require('debug')('google-places-plugin') as typeof console.log;

export const MATCH_INIT =
  /-\s*\(BOOL\)\s*application:\s*\(UIApplication\s*\*\s*\)\s*\w+\s+didFinishLaunchingWithOptions:/g;

const withGoogleMapsAndPlacesKey = createInfoPlistPlugin(setGoogleMapsAndPlacesApiKey, 'withGoogleMapsAndPlacesKey');

export const withPlaces: ConfigPlugin = (config) => {
  config = withGoogleMapsAndPlacesKey(config);

  const apiKey = getGoogleMapsApiKey(config);
  const clientKey = getGooglePlacesClientKey(config);

  debug('Google Maps API Key:', apiKey);
  debug('Google Places Client Key:', clientKey);

  // Adds/Removes AppDelegate setup for Google Maps API on iOS
  config = withGooglePlacesAppDelegate(config, { apiKey, clientKey });

  return config;
};

export function getGoogleMapsApiKey(config: ExpoConfig) {
  return config.ios?.config?.googleMapsApiKey ?? undefined;
}

export function getGooglePlacesClientKey(config: ExpoConfig) {
  return config.extra?.ios?.googlePlacesClientKey ?? undefined;
}

export function setGoogleMapsAndPlacesApiKey(
  config: ExpoConfig,
  { GMSApiKey, GMSPlacesClientKey, ...infoPlist }: InfoPlist
): InfoPlist {
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

export function addGoogleMapsAndPlacesAppDelegateImport(src: string): MergeResults {
  const newSrc = [];
  newSrc.push(
    '#if __has_include(<GoogleMaps/GoogleMaps.h>)',
    '#import <GoogleMaps/GoogleMaps.h>',
    '#endif',
    '#if __has_include(<GooglePlaces/GooglePlaces.h>)',
    '#import <GooglePlaces/GooglePlaces.h>',
    '#endif'
  );

  return mergeContents({
    tag: 'react-native-google-places-import',
    src,
    newSrc: newSrc.join('\n'),
    anchor: /#import "AppDelegate\.h"/,
    offset: 1,
    comment: '//',
  });
}

export function removeGoogleMapsAndPlacesAppDelegateImport(src: string): MergeResults {
  return removeContents({
    tag: 'react-native-google-places-import',
    src,
  });
}

export function addGoogleMapsAppDelegateInit(src: string, apiKey?: string, clientKey?: string): MergeResults {
  const newSrc = [];
  newSrc.push(
    '#if __has_include(<GoogleMaps/GoogleMaps.h>)',
    `  [GMSServices provideAPIKey:@"${apiKey}"];`,
    '#endif',
    '#if __has_include(<GooglePlaces/GooglePlaces.h>)',
    `  [GMSPlacesClient provideAPIKey:@"${clientKey}"];`,
    '#endif'
  );

  return mergeContents({
    tag: 'react-native-google-places-init',
    src,
    newSrc: newSrc.join('\n'),
    anchor: MATCH_INIT,
    offset: 2,
    comment: '//',
  });
}

export function removeGoogleMapsAndPlacesAppDelegateInit(src: string): MergeResults {
  return removeContents({
    tag: 'react-native-google-places-init',
    src,
  });
}

function isReactNativeGooglePlacesInstalled(projectRoot: string): string | null {
  const resolved = resolveFrom.silent(projectRoot, 'react-native-google-places/package.json');
  return resolved ? path.dirname(resolved) : null;
}

const withGooglePlacesAppDelegate: ConfigPlugin<{ apiKey?: string, clientKey?: string }> = (config, { apiKey, clientKey }) => {
  return withAppDelegate(config, (config) => {
    if (['objc', 'objcpp'].includes(config.modResults.language)) {
      if (
        apiKey &&
        isReactNativeGooglePlacesInstalled(config.modRequest.projectRoot)
      ) {
        try {
          config.modResults.contents = addGoogleMapsAndPlacesAppDelegateImport(
            config.modResults.contents
          ).contents;
          config.modResults.contents = addGoogleMapsAppDelegateInit(
            config.modResults.contents,
            apiKey,
            clientKey,
          ).contents;
        } catch (error: any) {
          if (error.code === 'ERR_NO_MATCH') {
            throw new Error(
              `Cannot add Google Places to the project's AppDelegate because it's malformed. Please report this with a copy of your project AppDelegate.`
            );
          }
          throw error;
        }
      } else {
        config.modResults.contents = removeGoogleMapsAndPlacesAppDelegateImport(
          config.modResults.contents
        ).contents;
        config.modResults.contents = removeGoogleMapsAndPlacesAppDelegateInit(
          config.modResults.contents
        ).contents;
      }
    } else {
      throw new Error(
        `Cannot setup Google Places because the project AppDelegate is not a supported language: ${config.modResults.language}`
      );
    }
    return config;
  });
};

module.exports = withPlaces;
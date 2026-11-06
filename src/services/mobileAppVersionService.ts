/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * NewsPress Phase 13 — Mobile App Version Management
 * Validates running mobile client against server-enforced minimum required version
 * and handles update prompts.
 */

import { AppVersionInfo } from '../types/mobile';

export class MobileAppVersionService {
  private static versionConfig: AppVersionInfo = {
    currentVersion: '13.0.0',
    minimumRequiredVersion: '12.0.0',
    latestAvailableVersion: '13.1.0',
    updateUrl: 'https://newspress.cloud/mobile/download',
    forceUpdateRequired: false,
    releaseNotes: 'Phase 13: Offline reporting, audio field recorder, and push notification sync.',
  };

  public static getVersionInfo(): AppVersionInfo {
    return { ...this.versionConfig };
  }

  public static setMinimumVersion(minVersion: string): void {
    this.versionConfig.minimumRequiredVersion = minVersion;
    this.versionConfig.forceUpdateRequired = this.isVersionOutdated(
      this.versionConfig.currentVersion,
      minVersion
    );
  }

  public static isVersionOutdated(clientVersion: string, minRequiredVersion: string): boolean {
    const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
    const [cMajor, cMinor, cPatch] = parse(clientVersion);
    const [mMajor, mMinor, mPatch] = parse(minRequiredVersion);

    if (cMajor < mMajor) return true;
    if (cMajor === mMajor && cMinor < mMinor) return true;
    if (cMajor === mMajor && cMinor === mMinor && cPatch < mPatch) return true;
    return false;
  }

  public static checkClientVersion(clientVersion: string): {
    supported: boolean;
    updateAvailable: boolean;
    forceUpdate: boolean;
    latestVersion: string;
  } {
    const forceUpdate = this.isVersionOutdated(clientVersion, this.versionConfig.minimumRequiredVersion);
    const updateAvailable = this.isVersionOutdated(clientVersion, this.versionConfig.latestAvailableVersion);

    return {
      supported: !forceUpdate,
      updateAvailable,
      forceUpdate,
      latestVersion: this.versionConfig.latestAvailableVersion,
    };
  }

  public static reset(): void {
    this.versionConfig = {
      currentVersion: '13.0.0',
      minimumRequiredVersion: '12.0.0',
      latestAvailableVersion: '13.1.0',
      updateUrl: 'https://newspress.cloud/mobile/download',
      forceUpdateRequired: false,
      releaseNotes: 'Phase 13: Offline reporting, audio field recorder, and push notification sync.',
    };
  }
}

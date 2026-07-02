import {registerIcons} from '@astryxdesign/core/Icon';
import {neutralTheme, neutralIconRegistry} from '@astryxdesign/theme-neutral';
import {astryxTheme} from './astryxTheme.js';
import {butterTheme, butterIconRegistry} from '@astryxdesign/theme-butter';
import {chocolateTheme, chocolateIconRegistry} from '@astryxdesign/theme-chocolate';
import {gothicTheme, gothicIconRegistry} from '@astryxdesign/theme-gothic';
import {matchaTheme, matchaIconRegistry} from '@astryxdesign/theme-matcha';
import {stoneTheme, stoneIconRegistry} from '@astryxdesign/theme-stone';
import {y2kTheme, y2kIconRegistry} from '@astryxdesign/theme-y2k';

export const THEMES = {
  astryx: {label: 'Astryx', theme: astryxTheme, icons: neutralIconRegistry},
  neutral: {label: 'Neutral', theme: neutralTheme, icons: neutralIconRegistry},
  butter: {label: 'Butter', theme: butterTheme, icons: butterIconRegistry},
  chocolate: {label: 'Chocolate', theme: chocolateTheme, icons: chocolateIconRegistry},
  gothic: {label: 'Gothic', theme: gothicTheme, icons: gothicIconRegistry, forceDark: true},
  matcha: {label: 'Matcha', theme: matchaTheme, icons: matchaIconRegistry},
  stone: {label: 'Stone', theme: stoneTheme, icons: stoneIconRegistry},
  y2k: {label: 'Y2K', theme: y2kTheme, icons: y2kIconRegistry},
};

export const THEME_OPTIONS = Object.entries(THEMES).map(([value, theme]) => ({value, label: theme.label}));

export function getTheme(themeName = 'astryx') {
  return THEMES[themeName] || THEMES.astryx;
}

export function registerThemeIcons(themeName = 'astryx') {
  registerIcons(getTheme(themeName).icons);
}

registerThemeIcons('astryx');

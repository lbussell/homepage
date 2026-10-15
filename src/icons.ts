import add16Regular from '@fluentui/svg-icons/icons/add_16_regular.svg?raw';
import arrowCounterclockwise16Regular from '@fluentui/svg-icons/icons/arrow_counterclockwise_16_regular.svg?raw';
import arrowDown16Regular from '@fluentui/svg-icons/icons/arrow_down_16_regular.svg?raw';
import arrowDownload16Regular from '@fluentui/svg-icons/icons/arrow_download_16_regular.svg?raw';
import arrowUp16Regular from '@fluentui/svg-icons/icons/arrow_up_16_regular.svg?raw';
import arrowUpload16Regular from '@fluentui/svg-icons/icons/arrow_upload_16_regular.svg?raw';
import board16Regular from '@fluentui/svg-icons/icons/board_16_regular.svg?raw';
import book16Regular from '@fluentui/svg-icons/icons/book_16_regular.svg?raw';
import box16Regular from '@fluentui/svg-icons/icons/box_16_regular.svg?raw';
import branchRequest16Regular from '@fluentui/svg-icons/icons/branch_request_16_regular.svg?raw';
import chat16Regular from '@fluentui/svg-icons/icons/chat_16_regular.svg?raw';
import checkmark16Regular from '@fluentui/svg-icons/icons/checkmark_16_regular.svg?raw';
import chevronDown12Regular from '@fluentui/svg-icons/icons/chevron_down_12_regular.svg?raw';
import chevronRight12Regular from '@fluentui/svg-icons/icons/chevron_right_12_regular.svg?raw';
import copy16Regular from '@fluentui/svg-icons/icons/copy_16_regular.svg?raw';
import delete16Regular from '@fluentui/svg-icons/icons/delete_16_regular.svg?raw';
import dismiss16Regular from '@fluentui/svg-icons/icons/dismiss_16_regular.svg?raw';
import documentText16Regular from '@fluentui/svg-icons/icons/document_text_16_regular.svg?raw';
import edit16Regular from '@fluentui/svg-icons/icons/edit_16_regular.svg?raw';
import errorCircle16Regular from '@fluentui/svg-icons/icons/error_circle_16_regular.svg?raw';
import folder16Regular from '@fluentui/svg-icons/icons/folder_16_regular.svg?raw';
import globe16Regular from '@fluentui/svg-icons/icons/globe_16_regular.svg?raw';
import grid16Regular from '@fluentui/svg-icons/icons/grid_16_regular.svg?raw';
import link16Regular from '@fluentui/svg-icons/icons/link_16_regular.svg?raw';
import moreHorizontal16Regular from '@fluentui/svg-icons/icons/more_horizontal_16_regular.svg?raw';
import open12Regular from '@fluentui/svg-icons/icons/open_12_regular.svg?raw';
import panelLeftContract16Regular from '@fluentui/svg-icons/icons/panel_left_contract_16_regular.svg?raw';
import panelLeftExpand16Regular from '@fluentui/svg-icons/icons/panel_left_expand_16_regular.svg?raw';
import reOrderDotsVertical16Regular from '@fluentui/svg-icons/icons/re_order_dots_vertical_16_regular.svg?raw';
import rocket16Regular from '@fluentui/svg-icons/icons/rocket_16_regular.svg?raw';
import search16Regular from '@fluentui/svg-icons/icons/search_16_regular.svg?raw';
import shieldCheckmark16Regular from '@fluentui/svg-icons/icons/shield_checkmark_16_regular.svg?raw';
import table16Regular from '@fluentui/svg-icons/icons/table_16_regular.svg?raw';
import tag16Regular from '@fluentui/svg-icons/icons/tag_16_regular.svg?raw';
import weatherMoon16Regular from '@fluentui/svg-icons/icons/weather_moon_16_regular.svg?raw';
import { LinkCategory, LinkProvider } from './types';

function fluentSvg(rawSvg: string, className = 'icon'): string {
  return rawSvg.replace(
    '<svg ',
    `<svg class="${className}" fill="currentColor" aria-hidden="true" `,
  );
}

export const ICONS = {
  github: `<svg class="icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`,
  azdo: fluentSvg(box16Regular),
  repo: fluentSvg(book16Regular),
  pullRequest: fluentSvg(branchRequest16Regular),
  issue: fluentSvg(errorCircle16Regular),
  discussion: fluentSvg(chat16Regular),
  pipeline: fluentSvg(rocket16Regular),
  security: fluentSvg(shieldCheckmark16Regular),
  board: fluentSvg(board16Regular),
  docs: fluentSvg(documentText16Regular),
  release: fluentSvg(tag16Regular),
  link: fluentSvg(link16Regular),
  externalLink: fluentSvg(open12Regular, 'icon icon-external'),
  folder: fluentSvg(folder16Regular),
  bookmark: fluentSvg(globe16Regular),
  chevronRight: fluentSvg(chevronRight12Regular, 'icon icon-xs'),
  chevronDown: fluentSvg(chevronDown12Regular, 'icon icon-xs'),
  search: fluentSvg(search16Regular),
  plus: fluentSvg(add16Regular),
  contrast: fluentSvg(weatherMoon16Regular),
  collapseLeft: fluentSvg(panelLeftContract16Regular),
  expandRight: fluentSvg(panelLeftExpand16Regular),
  table: fluentSvg(table16Regular),
  grid: fluentSvg(grid16Regular),
  edit: fluentSvg(edit16Regular),
  trash: fluentSvg(delete16Regular),
  drag: fluentSvg(reOrderDotsVertical16Regular),
  arrowUp: fluentSvg(arrowUp16Regular),
  arrowDown: fluentSvg(arrowDown16Regular),
  download: fluentSvg(arrowDownload16Regular),
  upload: fluentSvg(arrowUpload16Regular),
  copy: fluentSvg(copy16Regular),
  check: fluentSvg(checkmark16Regular),
  moreHorizontal: fluentSvg(moreHorizontal16Regular),
  reset: fluentSvg(arrowCounterclockwise16Regular),
  close: fluentSvg(dismiss16Regular),
};

export function getLinkIcon(category: LinkCategory, provider?: LinkProvider): string {
  if (category === 'repo') {
    if (provider === 'github') return ICONS.github;
    if (provider === 'azdo') return ICONS.azdo;
    return ICONS.repo;
  }
  switch (category) {
    case 'pulls':
      return ICONS.pullRequest;
    case 'issues':
      return ICONS.issue;
    case 'discussions':
      return ICONS.discussion;
    case 'pipelines':
      return ICONS.pipeline;
    case 'security':
      return ICONS.security;
    case 'boards':
      return ICONS.board;
    case 'docs':
      return ICONS.docs;
    case 'releases':
      return ICONS.release;
    default:
      if (provider === 'github') return ICONS.github;
      if (provider === 'azdo') return ICONS.azdo;
      return ICONS.link;
  }
}

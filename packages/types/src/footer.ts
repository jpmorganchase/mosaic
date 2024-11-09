import { HelpLinks } from './helpLinks.js';

/**
 *  [[`FooterSlice`]] specifies the footer props
 */
export type FooterSlice = {
  /** Footer description/message */
  description: string;
  /** Footer title */
  title: string;
  /** Sign-up URL */
  href: string;
  /** Support channels */
  helpLinks: HelpLinks;
  /** Sign-up label */
  label: string;
};

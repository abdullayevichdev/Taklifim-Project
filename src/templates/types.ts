import React from 'react';
import { InvitationData, Template, Language, GuestRSVP } from '../types';

export interface TemplateRenderProps {
  invitation: InvitationData;
  template: Template;
  language: Language;
  isDarkTheme?: boolean;
  isPreview?: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  headingFont: string;
  onRSVPSubmit?: (rsvp: Partial<GuestRSVP>) => Promise<boolean>;
  onWishSubmit?: (wish: { name: string; message: string }) => Promise<boolean>;
  wishesList?: Array<{ id: string; name: string; message: string; date: string }>;
  interactiveMap?: React.ReactNode;
  musicPlayer?: React.ReactNode;
}

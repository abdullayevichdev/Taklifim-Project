import type * as React from 'react';

export interface LgOpticsAttributes {
  refraction?: number | string;
  bezel?: number | string;
  curvature?: number | string;
  ior?: number | string;
  chroma?: number | string;
  blur?: number | string;
  specular?: number | string;
  'specular-width'?: number | string;
  'light-angle'?: number | string;
}

export type LgTone = 'clear' | 'tinted' | 'light';

export interface LgSwitchElement extends HTMLElement {
  checked: boolean;
  disabled: boolean;
}

export interface LgSliderElement extends HTMLElement {
  value: number;
  disabled: boolean;
}

export interface LgSegmentedElement extends HTMLElement {
  value: string;
  refresh: () => void;
  select: (index: number, options?: { emit?: boolean; focus?: boolean; immediate?: boolean }) => void;
}

export interface LgButtonElement extends HTMLElement {
  disabled: boolean;
}

export interface LgNavbarElement extends HTMLElement {
  refresh: () => void;
  setCurrent: (index: number) => void;
}

export interface LgPanelElement extends HTMLElement {}
export interface LgToastElement extends HTMLElement {}

export interface ToastOptions {
  icon?: 'check' | 'info' | 'alert' | 'bell' | string | null;
  duration?: number;
  container?: HTMLElement;
  tone?: 'dark' | 'light';
  backdrop?: string;
}

export interface ToastHandle {
  close: () => void;
  element: LgToastElement;
}

type LgElementProps<E extends HTMLElement, Extra = Record<string, unknown>> =
  React.DetailedHTMLProps<React.HTMLAttributes<E>, E> & LgOpticsAttributes & Extra;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'lg-switch': LgElementProps<
        LgSwitchElement,
        {
          checked?: boolean;
          disabled?: boolean;
          name?: string;
          value?: string;
          'aria-label'?: string;
        }
      >;
      'lg-slider': LgElementProps<
        LgSliderElement,
        {
          min?: number | string;
          max?: number | string;
          step?: number | string;
          name?: string;
          value?: number | string;
          disabled?: boolean;
          label?: string;
          'aria-label'?: string;
        }
      >;
      'lg-segmented': LgElementProps<
        LgSegmentedElement,
        {
          value?: string;
          label?: string;
          'aria-label'?: string;
        }
      >;
      'lg-button': LgElementProps<
        LgButtonElement,
        {
          tone?: LgTone;
          href?: string;
          target?: string;
          type?: 'button' | 'submit' | 'reset';
          disabled?: boolean;
          radius?: number | 'capsule' | string;
          backdrop?: string;
          'aria-label'?: string;
        }
      >;
      'lg-panel': LgElementProps<
        LgPanelElement,
        {
          tone?: 'light';
          radius?: number | 'capsule' | string;
          backdrop?: string;
        }
      >;
      'lg-navbar': LgElementProps<
        LgNavbarElement,
        {
          tone?: 'light';
          radius?: number | 'capsule' | string;
          backdrop?: string;
        }
      >;
      'lg-menubar': LgElementProps<HTMLElement>;
      'lg-menu': LgElementProps<HTMLElement, { label?: string }>;
      'lg-toast': LgElementProps<
        LgToastElement,
        {
          icon?: string;
          tone?: 'dark' | 'light';
          backdrop?: string;
        }
      >;
      'lg-dock': LgElementProps<HTMLElement>;
      'lg-lens': LgElementProps<
        HTMLElement,
        {
          width?: number | string;
          height?: number | string;
          size?: number | string;
          radius?: number | string;
          x?: number | string;
          y?: number | string;
        }
      >;
    }
  }
}

export {};

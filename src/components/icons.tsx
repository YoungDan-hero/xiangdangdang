import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps): IconProps => ({
  width: 23,
  height: 23,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props,
});

export const IconHome = (props: IconProps): JSX.Element => (
  <svg {...base(props)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </svg>
);

export const IconBottle = (props: IconProps): JSX.Element => (
  <svg {...base(props)}>
    <path d="M10 6.5V4.8c0-1.2.9-2.3 2-2.3s2 1.1 2 2.3v1.7" />
    <rect x="8" y="6.5" width="8" height="15" rx="3" />
    <path d="M8 12h3M8 15.5h3" />
  </svg>
);

export const IconChart = (props: IconProps): JSX.Element => (
  <svg {...base(props)}>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M7 14.5 11 10l3 3 5.5-6.5" />
  </svg>
);

export const IconSpark = (props: IconProps): JSX.Element => (
  <svg {...base(props)}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
  </svg>
);

export const IconGear = (props: IconProps): JSX.Element => (
  <svg {...base(props)}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.4" />
    <circle cx="8" cy="17" r="2.4" />
  </svg>
);

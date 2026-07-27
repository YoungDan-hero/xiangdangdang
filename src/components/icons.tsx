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

/* ---------- 底部导航 ---------- */

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

/* ---------- 通用 ---------- */

export const IconPerson = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 18, height: 18, ...props })}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.2-3.4 4-5 7.5-5s6.3 1.6 7.5 5" />
  </svg>
);

export const IconPlus = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 28, height: 28, strokeWidth: 2.2, ...props })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconChevronRight = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 16, height: 16, strokeWidth: 2.2, ...props })}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const IconSend = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 18, height: 18, ...props })}>
    <path d="M21.5 2.5 10.4 13.6" />
    <path d="M21.5 2.5 14.5 21.5l-4.1-7.9-7.9-4.1z" />
  </svg>
);

export const IconStop = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 16, height: 16, fill: "currentColor", stroke: "none", ...props })}>
    <rect x="5" y="5" width="14" height="14" rx="3" />
  </svg>
);

export const IconTrash = (props: IconProps): JSX.Element => (
  <svg {...base(props)}>
    <path d="M4 7h16M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
    <path d="M6 7l1 13a1.5 1.5 0 0 0 1.5 1.3h7A1.5 1.5 0 0 0 17 20l1-13" />
    <path d="M10 11.5v5.5M14 11.5v5.5" />
  </svg>
);

export const IconCheckCircle = (props: IconProps): JSX.Element => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.4 2.4 4.8-5.4" />
  </svg>
);

export const IconDownload = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 20, height: 20, ...props })}>
    <path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5" />
    <path d="M4.5 17.5v2a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-2" />
  </svg>
);

export const IconShield = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 17, height: 17, ...props })}>
    <path d="M12 3 5 6v5c0 4.5 3 8.3 7 9.5 4-1.2 7-5 7-9.5V6z" />
    <path d="m9 11.5 2.2 2.2 3.8-4.2" />
  </svg>
);

export const IconArchive = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 17, height: 17, ...props })}>
    <rect x="4" y="4" width="16" height="5" rx="1.5" />
    <path d="M5.5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V9" />
    <path d="M10 13h4" />
  </svg>
);

export const IconEye = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 20, height: 20, ...props })}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 20, height: 20, ...props })}>
    <path d="M4 4l16 16" />
    <path d="M9.9 5.9A9.4 9.4 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.1 8.3A16 16 0 0 0 2.5 12S6 18.5 12 18.5c1.1 0 2.1-.2 3-.5" />
    <path d="M10 10.3a3 3 0 0 0 4 4.2" />
  </svg>
);

export const IconExternal = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 14, height: 14, ...props })}>
    <path d="M14 4h6v6M20 4 11 13" />
    <path d="M19 14v5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V6.5A1.5 1.5 0 0 1 5.5 5H10" />
  </svg>
);

export const IconClock = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 20, height: 20, ...props })}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const IconDrop = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 20, height: 20, ...props })}>
    <path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z" />
  </svg>
);

export const IconTimer = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 22, height: 22, ...props })}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 10v4M9.5 2.5h5M12 2.5V6" />
  </svg>
);

export const IconScale = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 22, height: 22, ...props })}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M8.5 9.5a5 5 0 0 1 7 0l-2 2.3a2 2 0 0 0-3 0z" />
  </svg>
);

export const IconRuler = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 22, height: 22, ...props })}>
    <rect x="2.5" y="9" width="19" height="6" rx="1.5" />
    <path d="M7 9v3M11 9v2.2M15 9v3M19 9v2.2" />
  </svg>
);

export const IconCalendar = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 22, height: 22, ...props })}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 10h17M8 2.5V6M16 2.5V6" />
  </svg>
);

export const IconNote = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 20, height: 20, ...props })}>
    <path d="M5 4.5h14a1 1 0 0 1 1 1V15l-5 5H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1z" />
    <path d="M15 20v-5h5M8 9.5h8M8 13h4" />
  </svg>
);

export const IconAddCircle = (props: IconProps): JSX.Element => (
  <svg {...base({ width: 20, height: 20, ...props })}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8.5v7M8.5 12h7" />
  </svg>
);

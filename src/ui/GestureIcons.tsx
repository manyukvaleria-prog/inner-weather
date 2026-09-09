type IconProps = { className?: string };

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function GestureThumb({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path {...stroke} d="M20 21.5V13.2a2.4 2.4 0 0 1 4.8 0V21" />
      <path
        {...stroke}
        d="M20 21.6h9.4c1.6 0 2.8 1.2 2.8 2.7 0 .9-.5 1.7-1.2 2.2.8.5 1.3 1.4 1.3 2.4 0 1.1-.7 2-1.7 2.4.7.5 1.1 1.3 1.1 2.2 0 2.4-1.8 4-4.8 4H23.6C19 37.5 16 32.6 16 27.6c0-3.2 2.1-5.7 4-6z"
      />
    </svg>
  );
}

export function GestureTwoFingers({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path {...stroke} d="M19.6 24V12.8a2.3 2.3 0 1 1 4.6 0V24" />
      <path {...stroke} d="M24.6 23.6V13.6a2.3 2.3 0 1 1 4.6 0V24" />
      <path
        {...stroke}
        d="M19.6 24.2h10.2c1.5 0 2.7 1.2 2.7 2.7 0 .9-.5 1.7-1.3 2.1.8.5 1.3 1.3 1.3 2.3 0 2.3-1.7 3.9-4.6 3.9H23.4C19.2 35.2 16.4 31 16.4 27c0-1.8 1.4-2.8 3.2-2.8z"
      />
    </svg>
  );
}

export function GesturePinch({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <ellipse
        {...stroke}
        cx="16.4"
        cy="12.6"
        rx="4.8"
        ry="3.3"
        transform="rotate(-30 16.4 12.6)"
      />
      <path {...stroke} d="M20.6 11.2V4.6" />
      <path {...stroke} d="M20.6 4.6c4.6.4 7 3.2 6.4 7.2" />
      <path {...stroke} d="M20.4 31.2V20.4a2.2 2.2 0 0 1 4.3-.1" />
      <path {...stroke} d="M29.4 32C29.4 26.2 26.8 22.2 23.2 19.8" />
      <path
        {...stroke}
        d="M20.4 31.4h11.2c1.5 0 2.7 1.2 2.7 2.7 0 2.5-1.9 4.3-5.2 4.3h-4.8c-3.8 0-6.6-2.8-6.6-6.3 0-1.4 1.2-2.7 2.7-2.7z"
      />
    </svg>
  );
}

export function GestureHeadTilt({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle {...stroke} cx="24" cy="18.6" r="6.4" />
      <path {...stroke} d="M24 25v2.4" />
      <path {...stroke} d="M17.2 32.8c1.7-2.6 3.9-3.6 6.8-3.6s5.1 1 6.8 3.6" />
      <path {...stroke} d="M16.6 16.4 11.8 24.8" />
      <path {...stroke} d="M10.2 22.6 11.8 24.8 14.4 23.4" />
      <path {...stroke} d="M31.4 16.4 36.2 24.8" />
      <path {...stroke} d="M37.8 22.6 36.2 24.8 33.6 23.4" />
    </svg>
  );
}

export function GestureTwist({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path {...stroke} d="M19.8 22.6V15.2a2.1 2.1 0 0 1 4.2 0v7.2" />
      <path {...stroke} d="M24 22.4V14.2a2.1 2.1 0 1 1 4.2 0v8.2" />
      <path {...stroke} d="M28.2 22.2V16.4a2 2 0 1 1 4 0v6.4" />
      <path
        {...stroke}
        d="M19.8 22.8h10.2c1.4 0 2.5 1.1 2.5 2.5 0 .8-.4 1.5-1.1 1.9.7.4 1.1 1.2 1.1 2 0 2.1-1.6 3.5-4.2 3.5h-4.2c-3.6 0-6.2-3.2-6.2-7 0-1.6 1.1-2.9 1.9-2.9z"
      />
      <path {...stroke} d="M11.4 16.2a7.4 7.4 0 0 0-2.6 5.6" />
      <path {...stroke} d="M9.4 15.2h3.2v3.1" />
      <path {...stroke} d="M36.6 31.8a7.4 7.4 0 0 0 2.6-5.6" />
      <path {...stroke} d="M38.6 32.8h-3.2v-3.1" />
    </svg>
  );
}

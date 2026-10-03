export default function NavIcon({ name, size = 22 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3.5 10.5 12 3l8.5 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 9.8V21h13V9.8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.5 21v-6h5v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "jobs") {
    return (
      <svg {...common}>
        <rect x="3" y="6.5" width="18" height="13.5" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 6.5v-2h7v2M3 11.5h18M10 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }


  if (name === "freelance") {
    return (
      <svg {...common}>
        <path d="M5 7.5h14v11H5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 7.5V5h6v2.5M8.5 12h7M12 9.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }


  if (name === "employer") {
    return (
      <svg {...common}>
        <rect x="4" y="7" width="16" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 7V4.5h8V7M8 11h2M14 11h2M8 15h2M14 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "admin") {
    return (
      <svg {...common}>
        <path d="M12 3.5 19 6v5.2c0 4.5-2.7 7.5-7 9.3-4.3-1.8-7-4.8-7-9.3V6l7-2.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m9.2 12.1 1.8 1.8 3.9-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 8.5h18C21 16 18 16 18 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9.5 20.5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5.5 20c.55-4.1 2.7-6.15 6.5-6.15S17.95 15.9 18.5 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "internships") {
    return (
      <svg {...common}>
        <path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M7 11.5V16c2.9 2 7.1 2 10 0v-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

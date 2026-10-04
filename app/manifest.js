export default function manifest() {
  return {
    name: "Daraja Jobs",
    short_name: "Daraja",
    description: "Find current jobs and career opportunities across Tanzania.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8fa",
    theme_color: "#1b2a3f",
    icons: [
      {
        src: "/daraja-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}

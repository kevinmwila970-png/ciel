export type Theme = {
  id: string;
  name: string;
  mode: "dark" | "light";
  sidebarBg: string;
  primary: string;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
};

export const THEMES: Theme[] = [
  { id: "sage-night", name: "Sage Night", mode: "dark", sidebarBg: "#141615", primary: "#3dbe86", bg: "#0f0f0f", card: "#1a1c1b", text: "#f3f5f4", muted: "#9aa39c", border: "#2a2d2b" },
  { id: "midnight-ink", name: "Midnight Ink", mode: "dark", sidebarBg: "#10141c", primary: "#7aa2ff", bg: "#0b0d12", card: "#161b26", text: "#eef2ff", muted: "#9aa6c2", border: "#2a3144" },
  { id: "forest-canopy", name: "Forest Canopy", mode: "dark", sidebarBg: "#101610", primary: "#7dce6a", bg: "#0c120c", card: "#172117", text: "#eef6ee", muted: "#9aaf9a", border: "#2a3a2a" },
  { id: "deep-ocean", name: "Deep Ocean", mode: "dark", sidebarBg: "#0e161c", primary: "#3ec6d6", bg: "#0b1216", card: "#152028", text: "#e7f6f8", muted: "#93aeb6", border: "#243840" },
  { id: "obsidian-gold", name: "Obsidian Gold", mode: "dark", sidebarBg: "#16140f", primary: "#e2b15a", bg: "#100e0b", card: "#1e1a14", text: "#f8f1e4", muted: "#b3a68f", border: "#3a3224" },
  { id: "plum-noir", name: "Plum Noir", mode: "dark", sidebarBg: "#160f18", primary: "#d07adf", bg: "#100b12", card: "#211828", text: "#f8eefb", muted: "#b59ab8", border: "#3a2a40" },
  { id: "graphite", name: "Graphite", mode: "dark", sidebarBg: "#161616", primary: "#c8c8c8", bg: "#101010", card: "#1c1c1c", text: "#f5f5f5", muted: "#a0a0a0", border: "#2e2e2e" },
  { id: "ember-dark", name: "Ember", mode: "dark", sidebarBg: "#1a100e", primary: "#ff7a59", bg: "#120c0b", card: "#241614", text: "#fff1ec", muted: "#c4a197", border: "#3e2822" },
  { id: "arctic-night", name: "Arctic Night", mode: "dark", sidebarBg: "#101418", primary: "#9fd7ff", bg: "#0c1014", card: "#171d24", text: "#eef6ff", muted: "#9aafc0", border: "#2a3642" },
  { id: "wine-cellar", name: "Wine Cellar", mode: "dark", sidebarBg: "#180f12", primary: "#e06b86", bg: "#110b0d", card: "#24161b", text: "#ffeef2", muted: "#c4a0a8", border: "#3e2830" },
  { id: "slate-moss", name: "Slate Moss", mode: "dark", sidebarBg: "#121614", primary: "#8fbfa3", bg: "#0e1210", card: "#1a201c", text: "#eef5f1", muted: "#9aafa4", border: "#2c3832" },
  { id: "carbon-blue", name: "Carbon Blue", mode: "dark", sidebarBg: "#0f131a", primary: "#5b8cff", bg: "#0b0e14", card: "#151a24", text: "#eef2ff", muted: "#96a0b8", border: "#283044" },
  { id: "night-market", name: "Night Market", mode: "dark", sidebarBg: "#14110f", primary: "#f0a35e", bg: "#0f0d0c", card: "#211c18", text: "#fff6ee", muted: "#c2b0a0", border: "#3a322c" },
  { id: "pine-shadow", name: "Pine Shadow", mode: "dark", sidebarBg: "#101513", primary: "#4ec98a", bg: "#0c110f", card: "#17201c", text: "#eef8f3", muted: "#96aea3", border: "#26362e" },
  { id: "charcoal-rose", name: "Charcoal Rose", mode: "dark", sidebarBg: "#161214", primary: "#f08ab0", bg: "#100e10", card: "#221c20", text: "#fff0f5", muted: "#c0a8b0", border: "#3a2e34" },
  { id: "black-amber", name: "Black Amber", mode: "dark", sidebarBg: "#14120e", primary: "#f0c14d", bg: "#0e0d0b", card: "#1e1b14", text: "#fff8e8", muted: "#c2b48e", border: "#3a3424" },
  { id: "eclipse", name: "Eclipse", mode: "dark", sidebarBg: "#121216", primary: "#b9a6ff", bg: "#0c0c10", card: "#1a1a22", text: "#f4f2ff", muted: "#a8a4be", border: "#2e2e3c" },
  { id: "abyss-teal", name: "Abyss Teal", mode: "dark", sidebarBg: "#0e1516", primary: "#2fd3c5", bg: "#0a1112", card: "#142022", text: "#e8fffc", muted: "#90b4b0", border: "#234044" },
  { id: "ink-copper", name: "Ink Copper", mode: "dark", sidebarBg: "#151210", primary: "#e09262", bg: "#100e0c", card: "#221c18", text: "#fff4ee", muted: "#c2aa9c", border: "#3a3028" },
  { id: "noir-lilac", name: "Noir Lilac", mode: "dark", sidebarBg: "#14121a", primary: "#c4a4ff", bg: "#0e0c14", card: "#1e1a28", text: "#f6f2ff", muted: "#b0a4c4", border: "#342e44" },
  { id: "paper-sage", name: "Paper Sage", mode: "light", sidebarBg: "#e7f0ea", primary: "#1f8a5b", bg: "#f6f7f4", card: "#ffffff", text: "#17211b", muted: "#5d6b63", border: "#d5e0d8" },
  { id: "warm-parchment", name: "Warm Parchment", mode: "light", sidebarBg: "#f3eadc", primary: "#a15c2a", bg: "#fbf6ee", card: "#fffdf9", text: "#2a2118", muted: "#7a6a58", border: "#eadfce" },
  { id: "morning-fog", name: "Morning Fog", mode: "light", sidebarBg: "#e8eef2", primary: "#2f6f8f", bg: "#f5f7f8", card: "#ffffff", text: "#1a242b", muted: "#5e6e78", border: "#d7e1e7" },
  { id: "library-cream", name: "Library Cream", mode: "light", sidebarBg: "#efe8d8", primary: "#8a5a2b", bg: "#faf6ee", card: "#fffdf8", text: "#2b2418", muted: "#74685a", border: "#e6dcc8" },
  { id: "soft-moss", name: "Soft Moss", mode: "light", sidebarBg: "#e5efe4", primary: "#3d7a45", bg: "#f4f8f3", card: "#ffffff", text: "#1a281c", muted: "#5c6e5e", border: "#d4e2d4" },
  { id: "sky-study", name: "Sky Study", mode: "light", sidebarBg: "#e5f0f8", primary: "#1d6fbf", bg: "#f4f8fc", card: "#ffffff", text: "#152433", muted: "#5a7084", border: "#d3e2ee" },
  { id: "blush-paper", name: "Blush Paper", mode: "light", sidebarBg: "#f8e8ee", primary: "#c44770", bg: "#fff7f9", card: "#ffffff", text: "#2c1820", muted: "#80616c", border: "#f0d5df" },
  { id: "sandstone", name: "Sandstone", mode: "light", sidebarBg: "#f1ebe3", primary: "#b06a3c", bg: "#faf7f3", card: "#ffffff", text: "#2a221c", muted: "#74685e", border: "#e6ddd2" },
  { id: "mint-page", name: "Mint Page", mode: "light", sidebarBg: "#e5f6f1", primary: "#0f8f74", bg: "#f4fbf8", card: "#ffffff", text: "#143028", muted: "#5a756c", border: "#d2ebe3" },
  { id: "lavender-note", name: "Lavender Note", mode: "light", sidebarBg: "#eeeaf8", primary: "#6d4ad4", bg: "#f7f5fc", card: "#ffffff", text: "#221c33", muted: "#6d6580", border: "#ddd6f0" },
  { id: "cloud", name: "Cloud", mode: "light", sidebarBg: "#eef1f4", primary: "#3d4f63", bg: "#f7f8fa", card: "#ffffff", text: "#1c2430", muted: "#667384", border: "#dbe1e8" },
  { id: "birch", name: "Birch", mode: "light", sidebarBg: "#eef2ea", primary: "#5c7a3a", bg: "#f8faf6", card: "#ffffff", text: "#1e2618", muted: "#66705c", border: "#dde5d4" },
  { id: "sea-glass", name: "Sea Glass", mode: "light", sidebarBg: "#e4f3f4", primary: "#1a8a96", bg: "#f3fbfb", card: "#ffffff", text: "#143034", muted: "#5a7478", border: "#d0e6e8" },
  { id: "honey-light", name: "Honey Light", mode: "light", sidebarBg: "#f8f0dc", primary: "#c4841d", bg: "#fffaf0", card: "#ffffff", text: "#2c2414", muted: "#7a6c50", border: "#efe2c4" },
  { id: "porcelain", name: "Porcelain", mode: "light", sidebarBg: "#f2f2f4", primary: "#5b5bd6", bg: "#fafafa", card: "#ffffff", text: "#1c1c22", muted: "#6c6c78", border: "#e4e4ea" },
  { id: "olive-paper", name: "Olive Paper", mode: "light", sidebarBg: "#eceadf", primary: "#6d7428", bg: "#f8f7f1", card: "#ffffff", text: "#242418", muted: "#6e705c", border: "#e0dece" },
  { id: "ice-blue", name: "Ice Blue", mode: "light", sidebarBg: "#e7f1f8", primary: "#2a6f9a", bg: "#f5f9fc", card: "#ffffff", text: "#152634", muted: "#5c7282", border: "#d4e3ee" },
  { id: "peach-scholar", name: "Peach Scholar", mode: "light", sidebarBg: "#fbeee6", primary: "#d2653a", bg: "#fff8f4", card: "#ffffff", text: "#2e1c16", muted: "#80645a", border: "#f0ddd4" },
  { id: "pearl", name: "Pearl", mode: "light", sidebarBg: "#f3f1ee", primary: "#8a6a4a", bg: "#fbfaf8", card: "#ffffff", text: "#241e1a", muted: "#746c66", border: "#e7e2dc" },
  { id: "system-canvas", name: "System Canvas", mode: "light", sidebarBg: "#f0f2f1", primary: "#1f7a52", bg: "#ffffff", card: "#f7f8f7", text: "#141816", muted: "#5c6762", border: "#e2e6e4" },
];

export const DEFAULT_THEME_ID = "sage-night";

export function themeById(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function themeVars(theme: Theme): Record<string, string> {
  return {
    "--sidebar-bg": theme.sidebarBg,
    "--primary": theme.primary,
    "--bg": theme.bg,
    "--card": theme.card,
    "--text": theme.text,
    "--muted": theme.muted,
    "--border": theme.border,
    "--mustard": "#EAB54D",
    "--danger": "#e85d6c",
    "--good": theme.primary,
  };
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const vars = themeVars(theme);
  const style = document.documentElement.style;
  for (const [key, value] of Object.entries(vars)) style.setProperty(key, value);
  document.documentElement.setAttribute("data-theme", theme.id);
  document.documentElement.setAttribute("data-mode", theme.mode);
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", theme.bg);
  localStorage.setItem("sage_theme", theme.id);
  localStorage.setItem("sage_theme_vars", JSON.stringify(vars));
}

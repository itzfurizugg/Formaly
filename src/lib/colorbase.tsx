export const colors = {
  base: "#F7F7F7",
  second: "#EEEEEE",
  tinted: "#929AAB",
  darks: "#393E46",
  done: "#007DCC",
  pass: "#2FA084",
  wrong: "#D90000",
  transparent: "transparent",
} as const;

export type ColorKey = keyof typeof colors;

/** Palet warna cepat untuk latar header form; hex tema Formaly + pelengkap. */
export const PRESET_HEADER_COLORS = [
  "#007DCC", // biru (done)
  "#2FA084", // hijau (pass)
  "#393E46", // abu gelap (darks)
  "#4F46E5", // indigo
  "#7C3AED", // violet
  "#DB2777", // pink
  "#D90000", // merah (wrong)
  "#EA580C", // oranye
  "#CA8A04", // amber
  "#0F766E", // teal
] as const;
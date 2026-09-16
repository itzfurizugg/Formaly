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

/**
 * Varian dark mode dari palet utama. Hue tiap warna dipertahankan sama
 * dengan `colors` supaya identitas brand konsisten. `base` jadi latar
 * halaman (abu gelap #222831), `second` jadi permukaan card (abu sedikit
 * lebih terang #44444E) supaya card tetap kelihatan beda dari latar
 * belakangnya. `darks` dicerahkan jadi teks terang, dan warna aksen
 * (done/pass/wrong) dinaikkan lightness-nya secukupnya agar tetap kontras
 * di atas latar gelap.
 */
export const colorsDark = {
  base: "#222831",
  second: "rgb(47, 47, 54)",
  tinted: "#9AA3B5",
  darks: "#F1F2F4",
  done: "#3B9EFF",
  pass: "#34D399",
  wrong: "#F87171",
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

/**
 * Versi dark mode dari PRESET_HEADER_COLORS — tiap warna dicerahkan agar
 * kontras di atas kanvas gelap. Hue tetap senada dengan versi terang, jadi
 * pilihan warna header form tetap konsisten walau tema berpindah.
 */
export const PRESET_HEADER_COLORS_DARK = [
  "#3B9EFF", // biru (done dark)
  "#34D399", // hijau (pass dark)
  "#9CA3AF", // abu terang (pengganti darks di header gelap)
  "#818CF8", // indigo terang
  "#A78BFA", // violet terang
  "#F472B6", // pink terang
  "#F87171", // merah (wrong dark)
  "#FB923C", // oranye terang
  "#FACC15", // amber terang
  "#2DD4BF", // teal terang
] as const;

/** Ambil palet warna dasar sesuai tema aktif. */
export function getColors(theme: "light" | "dark") {
  return theme === "dark" ? colorsDark : colors;
}

/** Ambil palet preset warna header form sesuai tema aktif. */
export function getPresetHeaderColors(theme: "light" | "dark") {
  return theme === "dark" ? PRESET_HEADER_COLORS_DARK : PRESET_HEADER_COLORS;
}
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
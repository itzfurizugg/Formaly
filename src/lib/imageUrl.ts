// Validasi URL gambar eksternal: wajib http/https dan tanpa spasi.
export const isValidImageUrl = (url: string) => /^https?:\/\/\S+$/i.test(url.trim())

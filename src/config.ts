// Archivo de configuración centralizado
// Aquí puedes colocar tus API Keys para que Vercel las tome al desplegar.

export const APP_CONFIG = {
  // Reemplaza "TU_API_KEY_DE_IMGBB_AQUI" con tu clave real de ImgBB.
  // Ejemplo: imgbbApiKey: "1234567890abcdef1234567890abcdef"
  imgbbApiKey: import.meta.env.VITE_IMGBB_API_KEY || "6f15b2a580787a4d0dc08a609e8f9e2e",
};

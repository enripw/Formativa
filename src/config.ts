// Archivo de configuración centralizado
// Aquí puedes colocar tus API Keys para que Vercel las tome al desplegar.

export const APP_CONFIG = {
  // Reemplaza "TU_API_KEY_DE_IMGBB_AQUI" con tu clave real de ImgBB.
  // Ejemplo: imgbbApiKey: "1234567890abcdef1234567890abcdef"
  imgbbApiKey: import.meta.env.VITE_IMGBB_API_KEY || "TU_API_KEY_DE_IMGBB_AQUI",
};

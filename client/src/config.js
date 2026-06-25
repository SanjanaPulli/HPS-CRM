const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.endsWith(".local") ||
  window.location.hostname.startsWith("192.168.") ||
  window.location.hostname.startsWith("10.") ||
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(window.location.hostname);

const BASE_URL = isLocal
  ? `http://${window.location.hostname}:5000`
  : "https://hps-crm-backend.onrender.com";

export default BASE_URL;
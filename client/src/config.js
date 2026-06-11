const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'http://192.168.1.42:5000'

export default BASE_URL
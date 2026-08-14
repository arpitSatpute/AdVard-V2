// Custom no-op sign script for electron-builder to bypass Windows signtool hang
export default async function sign() {
  return true;
}

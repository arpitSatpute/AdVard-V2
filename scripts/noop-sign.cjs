/**
 * Custom no-op sign script for electron-builder to bypass signtool.exe
 */
module.exports = async function sign() {
  return true;
};

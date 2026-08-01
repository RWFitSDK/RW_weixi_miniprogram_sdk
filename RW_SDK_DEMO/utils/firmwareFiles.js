const STORAGE_KEY = "rw_demo_firmware_files_v1";
const DIRECTORY_NAME = "rw-firmware";
const MAX_FILE_COUNT = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function getDirectoryPath() {
  return `${wx.env.USER_DATA_PATH}/${DIRECTORY_NAME}`;
}

function ensureDirectory() {
  const directoryPath = getDirectoryPath();
  const fileSystem = wx.getFileSystemManager();
  try {
    fileSystem.accessSync(directoryPath);
  } catch (_) {
    fileSystem.mkdirSync(directoryPath, true);
  }
  return directoryPath;
}

function saveFiles(files) {
  wx.setStorageSync(STORAGE_KEY, files);
}

function fileExists(filePath) {
  try {
    wx.getFileSystemManager().accessSync(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

function getFiles() {
  const cached = wx.getStorageSync(STORAGE_KEY);
  const files = Array.isArray(cached) ? cached : [];
  const available = files.filter((file) => file && file.filePath && fileExists(file.filePath));
  if (available.length !== files.length) saveFiles(available);
  return available.sort((first, second) => (second.importedAt || 0) - (first.importedAt || 0));
}

function copyFile(sourcePath, destinationPath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().copyFile({
      srcPath: sourcePath,
      destPath: destinationPath,
      success: resolve,
      fail: reject,
    });
  });
}

async function importFile(source) {
  if (!source || !source.path) throw new Error("没有可导入的固件文件");
  if (!source.size) throw new Error("固件文件为空");
  if (source.size > MAX_FILE_SIZE) throw new Error("固件文件不能超过 20MB");
  const files = getFiles();
  if (files.length >= MAX_FILE_COUNT) throw new Error(`最多保存 ${MAX_FILE_COUNT} 个固件文件，请先删除旧文件`);

  const directoryPath = ensureDirectory();
  const importedAt = Date.now();
  const destinationPath = `${directoryPath}/${importedAt}_${Math.floor(Math.random() * 100000)}`;
  await copyFile(source.path, destinationPath);
  const file = {
    id: `${importedAt}-${Math.random().toString(16).slice(2)}`,
    fileName: source.name || "firmware.bin",
    filePath: destinationPath,
    fileSize: source.size,
    importedAt,
  };
  files.unshift(file);
  saveFiles(files);
  return file;
}

function removeFile(id) {
  const files = getFiles();
  const target = files.find((file) => file.id === id);
  if (!target) return files;
  try {
    wx.getFileSystemManager().unlinkSync(target.filePath);
  } catch (_) {
    // 文件可能已被系统清理，仍移除缓存记录。
  }
  const remaining = files.filter((file) => file.id !== id);
  saveFiles(remaining);
  return remaining;
}

function readFile(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      success: ({ data }) => resolve(new Uint8Array(data)),
      fail: reject,
    });
  });
}

function fileNameMatchesModel(fileName, deviceModel) {
  const name = String(fileName || "").trim();
  const model = String(deviceModel || "").trim();
  if (!name || !model) return false;
  if (name.toLowerCase().includes(model.toLowerCase())) return true;
  const normalize = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const normalizedName = normalize(name);
  const normalizedModel = normalize(model);
  return !!normalizedModel && normalizedName.includes(normalizedModel);
}

module.exports = {
  MAX_FILE_SIZE,
  getFiles,
  importFile,
  removeFile,
  readFile,
  fileNameMatchesModel,
};

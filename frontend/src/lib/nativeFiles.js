// Saving generated files from the Android (Capacitor) build.
//
// `<a download>` is a no-op inside an Android WebView, so on native we write the
// file to the app cache and hand it to the system share sheet, which is where
// "Save to Files" / "Save to Photos" live. On the web the anchor works fine.

import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNative } from "./nativeAuth";

/**
 * Save a `data:` URL as a file. Returns true once the file has been handed off.
 * Throws on native failure so callers can surface a toast.
 */
export async function saveDataUrl(dataUrl, filename, dialogTitle = "Save file") {
  if (!isNative()) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
    return true;
  }

  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });
  await Share.share({ title: filename, url: uri, dialogTitle });
  return true;
}

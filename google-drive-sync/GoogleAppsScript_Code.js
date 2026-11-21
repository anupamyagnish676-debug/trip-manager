/**
 * ==============================================================================
 * ODISHA GHUMMING 2026 - GOOGLE DRIVE AUTOMATED PHOTO & VIDEO UPLOADER
 * ==============================================================================
 * Account: triphisab@gmail.com
 *
 * HOW TO DEPLOY IN 60 SECONDS:
 * 1. Open https://script.google.com while signed in as triphisab@gmail.com.
 * 2. Click "+ New project".
 * 3. Delete any default code in Code.gs and paste this ENTIRE file.
 * 4. At the top-right, click "Deploy" -> "New deployment".
 * 5. Click the gear icon (⚙️) next to "Select type" -> choose "Web app".
 * 6. Set Description: "Odisha Ghumming Drive Uploader".
 * 7. Set "Execute as": "Me (triphisab@gmail.com)".
 * 8. Set "Who has access": "Anyone" (allows friends to upload from portal without login).
 * 9. Click "Deploy" -> Authorize access (Advanced -> Go to Untitled project (unsafe) -> Allow).
 * 10. Copy the "Web app URL" (starts with https://script.google.com/macros/s/...) and paste it
 *     into the portal's Trip Settings (or as GOOGLE_APPS_SCRIPT_URL in .env.local).
 * ==============================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No POST body received."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    
    // 1. Identify Main Shared Trip Folder
    var mainFolder;
    if (data.folderId && data.folderId.toString().trim().length > 0) {
      try {
        mainFolder = DriveApp.getFolderById(data.folderId.toString().trim());
      } catch (err) {
        // Fallback to searching by title
      }
    }
    
    if (!mainFolder) {
      var searchName = "ODISHA GHUMMING 2026 - All Memories";
      var folders = DriveApp.getFoldersByName(searchName);
      if (folders.hasNext()) {
        mainFolder = folders.next();
      } else {
        // Create main folder if it doesn't exist yet!
        mainFolder = DriveApp.createFolder(searchName);
      }
    }

    // 2. Locate or Automatically Create the Member's Subfolder
    var targetFolder = mainFolder;
    var subfolderName = (data.subfolderName || data.memberName || "General").toString().trim();
    
    if (subfolderName.length > 0) {
      var subIter = mainFolder.getFoldersByName(subfolderName);
      if (subIter.hasNext()) {
        targetFolder = subIter.next();
      } else {
        // Check if folder exists without numeric prefix (e.g. "Shubham Swaroop Barik" vs "5. Shubham Swaroop Barik")
        var strippedName = subfolderName.replace(/^[0-9]+\.\s*/, '').trim();
        var strippedIter = mainFolder.getFoldersByName(strippedName);
        if (strippedIter.hasNext()) {
          targetFolder = strippedIter.next();
        } else {
          // Automatically create member subfolder!
          targetFolder = mainFolder.createFolder(subfolderName);
        }
      }
    }

    // 3. Decode base64 payload and save file
    var base64Str = data.fileBase64.toString();
    if (base64Str.indexOf('base64,') > -1) {
      base64Str = base64Str.split('base64,')[1];
    }

    var decodedBytes = Utilities.base64Decode(base64Str);
    var mimeType = data.mimeType || "image/jpeg";
    var fileName = data.fileName || ("photo_" + new Date().getTime() + ".jpg");

    var blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
    var savedFile = targetFolder.createFile(blob);

    // Make file viewable by anyone with link
    try {
      savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (ignore) {}

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: savedFile.getId(),
      fileName: savedFile.getName(),
      fileUrl: savedFile.getUrl(),
      downloadUrl: savedFile.getDownloadUrl(),
      subfolder: targetFolder.getName(),
      uploadedBy: data.memberName || "Friend",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    system: "Odisha Ghumming 2026 Google Drive Photo Sync",
    account: "triphisab@gmail.com",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

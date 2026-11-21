import { NextRequest, NextResponse } from 'next/server';

function extractFolderId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  // Check for drive.google.com/drive/folders/ID or /drive/u/0/folders/ID
  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If it's already an ID (alphanumeric, dashes, underscores)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileBase64,
      fileName,
      mimeType = 'image/jpeg',
      memberName,
      memberId,
      folderUrl,
      subfolderName,
      webhookUrl: clientWebhookUrl,
    } = body;

    if (!fileBase64 || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Missing file data or file name' },
        { status: 400 }
      );
    }

    const targetFolderId = extractFolderId(folderUrl);
    const targetSubfolderName = subfolderName || memberName || 'General';

    // Check for Google Apps Script Web App URL
    const webhookUrl =
      clientWebhookUrl ||
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      process.env.DRIVE_UPLOAD_WEBHOOK;

    if (!webhookUrl || webhookUrl.trim().length === 0) {
      return NextResponse.json({
        success: false,
        code: 'WEBHOOK_NOT_CONFIGURED',
        message:
          'Google Apps Script webhook is not configured yet. Set up the 1-minute script under triphisab@gmail.com or use direct Drive folder upload.',
        subfolderName: targetSubfolderName,
        folderId: targetFolderId,
      });
    }

    // Prepare payload for Google Apps Script
    const payload = {
      folderId: targetFolderId,
      subfolderName: targetSubfolderName,
      memberName: memberName || 'Friend',
      memberId: memberId || '',
      fileName: fileName,
      mimeType: mimeType,
      fileBase64: fileBase64,
    };

    // Forward to Google Apps Script Web App (follows 302 redirects automatically)
    const scriptResponse = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: AbortSignal.timeout(45000), // 45s timeout for large images/videos
    });

    const responseText = await scriptResponse.text();
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch {
      // Non-JSON response
      if (scriptResponse.ok) {
        return NextResponse.json({
          success: true,
          message: 'Uploaded to Google Drive successfully',
          raw: responseText.slice(0, 200),
          subfolder: targetSubfolderName,
        });
      }
      return NextResponse.json(
        { success: false, error: 'Invalid response from Google Apps Script', raw: responseText.slice(0, 200) },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/upload-drive:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to upload photo to Google Drive',
      },
      { status: 500 }
    );
  }
}

import * as admin from 'firebase-admin';

// Initialize Firebase
const serviceAccount = require('../../../firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://exchange-box-c7a36.appspot.com',
});

const bucket = admin.storage().bucket();

/**
 * Uploads a file to Firebase Storage and returns the signed URL of the uploaded file.
 * @param file - The file to be uploaded, as received from a Multer request.
 * @param fileName - The name of the file to be used when storing in Firebase.
 * @param folderName - The folder in Firebase Storage where the file will be stored.
 * @returns A promise that resolves to the signed URL of the uploaded file.
 * @throws If the file input is invalid or if the file already exists in Firebase Storage.
 */
export async function uploadFileToFirebase(
  file: Express.Multer.File,
  fileName: string,
  folderName: string,
): Promise<string> {
  if (!file || !file.buffer) {
    throw new Error('Invalid file input');
  }

  let buffer: any = file.buffer;
  if (!Buffer.isBuffer(buffer)) {
    if (buffer.data && Array.isArray(buffer.data)) {
      buffer = Buffer.from(buffer.data);
    } else {
      throw new Error('File buffer is not valid');
    }
  }

  const filename = `${folderName}/${fileName}`;
  const fileRef = bucket.file(filename);

  // Check if the file already exists
  const [exists] = await fileRef.exists();
  if (exists) {
    throw new Error('File already exists');
  }

  return new Promise((resolve, reject) => {
    const blobStream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('error', (error) => reject(error));

    blobStream.on('finish', () => {
      // Construct the direct URL to the uploaded file
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }/o/${encodeURIComponent(folderName)}%2F${encodeURIComponent(
        fileName,
      )}?alt=media`;
      resolve(publicUrl);
    });

    // Write the buffer to the stream
    blobStream.end(buffer);
  });
}

/**
 * Retrieves a signed URL for a file stored in Firebase Storage.
 *
 * @param fileName - The name of the file.
 * @param folderName - The folder in Firebase Storage where the file is stored.
 * @returns A promise that resolves to the signed URL of the file.
 */
export async function getImageUrlFromFirebase(
  fileName: string,
  folderName: string,
): Promise<string> {
  const filename = `${folderName}/${fileName}`;
  const fileRef = bucket.file(filename);

  const signedUrl = await fileRef.getSignedUrl({
    action: 'read',
    expires: '03-09-2491',
  });

  return signedUrl[0];
}

/**
 * Deletes a file from Firebase Storage.
 *
 * @param fileName - The name of the file to be deleted.
 * @param folderName - The folder in Firebase Storage where the file is stored.
 * @returns A promise that resolves when the file is successfully deleted.
 */
export async function deleteFileFromFirebase(
  fileName: string,
  folderName: string,
): Promise<void> {
  const filename = `${folderName}/${fileName}`;
  const fileRef = bucket.file(filename);

  await fileRef.delete();
}

/**
 * Updates a file in Firebase Storage. If the file exists, it's replaced with the new file.
 * @param file - The new file to be uploaded, as received from a Multer request.
 * @param fileName - The name of the file to be used when storing in Firebase.
 * @param folderName - The folder in Firebase Storage where the file will be stored.
 * @returns A promise that resolves to the direct URL of the uploaded file.
 * @throws If the file input is invalid.
 */
export async function updateFileInFirebase(
  file: Express.Multer.File,
  fileName: string,
  folderName: string,
): Promise<string> {
  if (!file || !file.buffer) {
    throw new Error('Invalid file input');
  }

  let buffer: any = file.buffer;
  if (!Buffer.isBuffer(buffer)) {
    if (buffer.data && Array.isArray(buffer.data)) {
      buffer = Buffer.from(buffer.data);
    } else {
      throw new Error('File buffer is not valid');
    }
  }

  const filename = `${folderName}/${fileName}`;
  const fileRef = bucket.file(filename);

  // Delete the existing file if it exists
  const [exists] = await fileRef.exists();
  if (exists) {
    await fileRef.delete();
  }

  return new Promise((resolve, reject) => {
    const blobStream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    blobStream.on('error', (error) => reject(error));

    blobStream.on('finish', () => {
      // Construct the direct URL to the uploaded file
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }/o/${encodeURIComponent(folderName)}%2F${encodeURIComponent(
        fileName,
      )}?alt=media`;
      resolve(publicUrl);
    });

    blobStream.end(buffer);
  });
}

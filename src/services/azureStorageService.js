import {
    BlobSASPermissions,
    generateBlobSASQueryParameters,
    StorageSharedKeyCredential
} from "@azure/storage-blob";
import dotenv from "dotenv";

dotenv.config();

import { blobServiceClient } from "../config/azureStorageConfig.js";

import { v4 as uuid } from "uuid";

const credential = new StorageSharedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT_NAME,
    process.env.AZURE_STORAGE_ACCOUNT_KEY
);

class AzureStorageService {

    async upload(file, containerName) {
       try {
        const containerClient =
            blobServiceClient.getContainerClient(containerName);
        const extension = file.originalname.split(".").pop();
        const blobName = `${uuid()}.${extension}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(
            file.buffer,
            {
                blobHTTPHeaders: {
                    blobContentType: file.mimetype
                }
            }
        );

        return blobName;
       }
       catch(error){
        console.error('Error uploading file to Azure Blob Storage:', error);
        throw new Error('Failed to upload file to Azure Blob Storage');
       }
    }

    generateReadUrl(blobName, containerName) {

        const expiresOn = new Date(
            Date.now() + 15 * 60 * 1000
        );

        const sas =
            generateBlobSASQueryParameters(
                {
                    containerName,
                    blobName,
                    permissions:
                        BlobSASPermissions.parse("r"),
                    expiresOn
                },
                credential
            ).toString();

        return `https://${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${containerName}/${blobName}?${sas}`;
    }

    async delete(blobName, containerName) {

        const containerClient =
            blobServiceClient.getContainerClient(containerName);

        const blockBlobClient =
            containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.deleteIfExists();
    }

    async replace(oldBlob, newFile, containerName) {

        if (oldBlob) {
            await this.delete(oldBlob, containerName);
        }

        return await this.upload(
            newFile,
            containerName
        );
    }
}

export default new AzureStorageService();
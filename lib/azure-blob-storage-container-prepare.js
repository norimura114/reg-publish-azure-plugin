"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureBlobStorageContainerPreparer = void 0;
const uuid_1 = require("uuid");
const config_1 = require("./config");
const storage_blob_1 = require("@azure/storage-blob");
const CONTAINER_PREFIX = "reg-publish-container";
class AzureBlobStorageContainerPreparer {
    inquire() {
        return [
            {
                name: "createContainer",
                type: "confirm",
                message: "Create new Azure Blob Storage container",
                default: true,
            },
            {
                name: "containerName",
                type: "input",
                message: "Existing container name",
                when: (ctx) => !ctx.createContainer,
            },
        ];
    }
    prepare(option) {
        this._logger = option.logger;
        const ir = option.options;
        if (!ir.createContainer) {
            return Promise.resolve({
                containerName: ir.containerName,
            });
        }
        else {
            const id = (0, uuid_1.v4)();
            const containerName = `${CONTAINER_PREFIX}-${id}`;
            if (!config_1.AZURE_STORAGE_CONNECTION_STRING) {
                this._logger.warn("Failed to read connection string.");
                this._logger.warn(`Export ${this._logger.colors.green("$AZURE_STORAGE_CONNECTION_STRING")}.`);
                return Promise.resolve({
                    containerName: "your_azure_blob_storage_container_name",
                });
            }
            if (option.noEmit) {
                this._logger.info(`Skip to create Azure Blob Storage container ${containerName} because noEmit option.`);
                return Promise.resolve({ containerName });
            }
            this._logger.info(`Create new Azure Blob Storage container: ${this._logger.colors.magenta(containerName)}`);
            const spinner = this._logger.getSpinner("creating container...");
            spinner.start();
            return this._createContainer(containerName).then((containerName) => {
                spinner.stop();
                return { containerName };
            });
        }
    }
    _createContainer(containerName) {
        return new Promise((resolve, reject) => {
            const absClient = storage_blob_1.BlobServiceClient.fromConnectionString(config_1.AZURE_STORAGE_CONNECTION_STRING || "");
            const containerClient = absClient.getContainerClient(containerName);
            containerClient
                .create()
                .then(() => {
                resolve(containerName);
            })
                .catch((err) => {
                return reject(err);
            });
        });
    }
}
exports.AzureBlobStorageContainerPreparer = AzureBlobStorageContainerPreparer;
//# sourceMappingURL=azure-blob-storage-container-prepare.js.map
import { v4 as uuid } from "uuid";
import {
  PluginPreparer,
  PluginCreateOptions,
  PluginLogger,
  PreparerQuestions,
} from "reg-suit-interface";
import { PluginConfig } from "./azure-publisher-plugin";
import { AZURE_STORAGE_CONNECTION_STRING } from "./config";
import { BlobServiceClient } from "@azure/storage-blob";

export interface SetupInquireResult {
  createContainer: boolean;
  containerName?: string;
}

const CONTAINER_PREFIX = "reg-publish-container";

export class AzureBlobStorageContainerPreparer
  implements PluginPreparer<SetupInquireResult, PluginConfig>
{
  _logger!: PluginLogger;

  inquire(): PreparerQuestions {
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
        when: (ctx: any) =>
          !(ctx as { createContainer: boolean }).createContainer,
      },
    ];
  }
  prepare(
    option: PluginCreateOptions<SetupInquireResult>
  ): Promise<PluginConfig> {
    this._logger = option.logger;
    const ir = option.options;

    if (!ir.createContainer) {
      return Promise.resolve({
        containerName: ir.containerName as string,
      });
    } else {
      const id = uuid();
      const containerName = `${CONTAINER_PREFIX}-${id}`;

      if (!AZURE_STORAGE_CONNECTION_STRING) {
        this._logger.warn("Failed to read connection string.");
        this._logger.warn(
          `Export ${this._logger.colors.green(
            "$AZURE_STORAGE_CONNECTION_STRING"
          )}.`
        );

        return Promise.resolve({
          containerName: "your_azure_blob_storage_container_name",
        });
      }

      if (option.noEmit) {
        this._logger.info(
          `Skip to create Azure Blob Storage container ${containerName} because noEmit option.`
        );
        return Promise.resolve({ containerName });
      }

      this._logger.info(
        `Create new Azure Blob Storage container: ${this._logger.colors.magenta(
          containerName
        )}`
      );

      const spinner = this._logger.getSpinner("creating container...");
      spinner.start();

      return this._createContainer(containerName).then((containerName) => {
        spinner.stop();
        return { containerName };
      });
    }
  }

  _createContainer(containerName: string) {
    return new Promise<string>((resolve, reject) => {
      const absClient = BlobServiceClient.fromConnectionString(
        AZURE_STORAGE_CONNECTION_STRING || ""
      );
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

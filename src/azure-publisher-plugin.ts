import fs from "fs";
import path from "path";
import zlib from "zlib";
import {
  BlobDownloadResponseParsed,
  BlobItem,
  BlobServiceClient,
  ContainerClient,
} from "@azure/storage-blob";
import mkdirp from "mkdirp";

import {
  PublisherPlugin,
  PluginCreateOptions,
  WorkingDirectoryInfo,
  PublishResult,
} from "reg-suit-interface";
import {
  FileItem,
  RemoteFileItem,
  ObjectListResult,
  AbstractPublisher,
} from "reg-suit-util";
import { AZURE_STORAGE_CONNECTION_STRING } from "./config";

export interface PluginConfig {
  containerName: string;
}

export class AzurePublisherPlugin
  extends AbstractPublisher
  implements PublisherPlugin<PluginConfig>
{
  name = "reg-publish-abs-plugin";

  private _options!: PluginCreateOptions<any>;
  private _pluginConfig!: PluginConfig;
  private _absClient!: BlobServiceClient;
  private _containerClient!: ContainerClient;

  constructor() {
    super();
  }

  init(config: PluginCreateOptions<PluginConfig>): void {
    this.noEmit = config.noEmit;
    this.logger = config.logger;
    this._options = config;
    this._pluginConfig = {
      ...config.options,
    };

    if (!AZURE_STORAGE_CONNECTION_STRING) {
      this.logger.warn("Failed to read connection string.");
      this.logger.warn(
        `Export ${this.logger.colors.green(
          "$AZURE_STORAGE_CONNECTION_STRING"
        )}.`
      );
    }

    this._absClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING || ""
    );
    this._containerClient = this._absClient.getContainerClient(
      this._pluginConfig.containerName
    );
  }

  publish(key: string): Promise<PublishResult> {
    return this.publishInternal(key).then(({ indexFile }) => {
      const reportUrl = indexFile && ``;
      return { reportUrl };
    });
  }

  fetch(key: string): Promise<any> {
    return this.fetchInternal(key);
  }

  protected getContainerDomain() {
    const url = new URL(this._absClient.url);
    return url.hostname;
  }

  protected getBucketRootDir(): string | undefined {
    return undefined;
  }

  protected getBucketName(): string {
    return this._pluginConfig.containerName;
  }

  protected getLocalGlobPattern(): string | undefined {
    return undefined;
  }

  protected getWorkingDirs(): WorkingDirectoryInfo {
    return this._options.workingDirs;
  }

  protected uploadItem(key: string, item: FileItem): Promise<FileItem> {
    return new Promise((resolve, reject) => {
      fs.readFile(item.absPath, (err, content) => {
        if (err) {
          return reject(err);
        }

        zlib.gzip(content, (err, data) => {
          if (err) {
            return reject(err);
          }

          const blobName = `${key}/${item.path}`;
          const blockBlobClient =
            this._containerClient.getBlockBlobClient(blobName);
          blockBlobClient
            .upload(data, data.length, {
              blobHTTPHeaders: {
                blobContentType: item.mimeType,
                blobContentEncoding: "gzip",
              },
            })
            .then((response) => {
              this.logger.verbose(
                `Uploaded from ${item.absPath} to ${key}/${item.path} (requestId=${response.requestId})`
              );
              return resolve(item);
            })
            .catch((err) => {
              reject(err);
            });
        });
      });
    });
  }

  protected downloadItem(
    remoteItem: RemoteFileItem,
    item: FileItem
  ): Promise<FileItem> {
    const blobName = remoteItem.remotePath;
    const blockBlobClient = this._containerClient.getBlockBlobClient(blobName);
    return new Promise((resolve, reject) => {
      blockBlobClient
        .download(0)
        .then((response) => {
          mkdirp.sync(path.dirname(item.absPath));
          this._gunzipIfNeed(response, (_err, content) => {
            fs.writeFile(item.absPath, content, (err) => {
              if (err) {
                return reject(err);
              }
              this.logger.verbose(
                `Downloaded from ${blobName} to ${item.absPath}`
              );
              resolve(item);
            });
          });
        })
        .catch((err) => {
          return reject(err);
        });
    });
  }

  protected listItems(
    _lastKey: string,
    prefix: string
  ): Promise<ObjectListResult> {
    return new Promise<ObjectListResult>(async (resolve, reject) => {
      let limit = 1000;
      const blobItems: BlobItem[] = [];

      try {
        for await (const blob of this._containerClient.listBlobsFlat()) {
          blobItems.push(blob);

          if (--limit < 0) {
            break;
          }
        }
      } catch (err) {
        reject(err);
      }

      resolve({
        isTruncated: false,
        nextMarker: "",
        contents: blobItems
          .filter((x) => !prefix || x.name.startsWith(prefix))
          .map((x) => ({
            key: x.name,
          })),
      });
    });
  }

  private _gunzipIfNeed(
    output: BlobDownloadResponseParsed,
    cb: (err: any, data: Buffer) => any
  ) {
    this._streamToBuffer(output.readableStreamBody).then((buffer) => {
      if (output.contentEncoding === "gzip") {
        zlib.gunzip(buffer, (err, content) => {
          cb(err, content);
        });
      } else {
        cb(null, buffer);
      }
    });
  }

  private _streamToBuffer(stream: NodeJS.ReadableStream | undefined) {
    return new Promise<Buffer>((resolve, reject) => {
      if (!stream) {
        return reject();
      }

      const chunks: Uint8Array[] = [];
      stream.on("data", (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      stream.on("error", reject);
    });
  }
}

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzurePublisherPlugin = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const storage_blob_1 = require("@azure/storage-blob");
const mkdirp_1 = __importDefault(require("mkdirp"));
const reg_suit_util_1 = require("reg-suit-util");
const config_1 = require("./config");
class AzurePublisherPlugin extends reg_suit_util_1.AbstractPublisher {
    constructor() {
        super();
        this.name = "reg-publish-abs-plugin";
    }
    init(config) {
        this.noEmit = config.noEmit;
        this.logger = config.logger;
        this._options = config;
        this._pluginConfig = Object.assign({}, config.options);
        if (!config_1.AZURE_STORAGE_CONNECTION_STRING) {
            this.logger.warn("Failed to read connection string.");
            this.logger.warn(`Export ${this.logger.colors.green("$AZURE_STORAGE_CONNECTION_STRING")}.`);
        }
        this._absClient = storage_blob_1.BlobServiceClient.fromConnectionString(config_1.AZURE_STORAGE_CONNECTION_STRING || "");
        this._containerClient = this._absClient.getContainerClient(this._pluginConfig.containerName);
    }
    publish(key) {
        return this.publishInternal(key).then(({ indexFile }) => {
            const reportUrl = indexFile && ``;
            return { reportUrl };
        });
    }
    fetch(key) {
        return this.fetchInternal(key);
    }
    getContainerDomain() {
        if (this._pluginConfig.customDomain) {
            return this._pluginConfig.customDomain;
        }
        const url = new URL(this._absClient.url);
        return url.hostname;
    }
    getBucketRootDir() {
        return this._pluginConfig.pathPrefix;
    }
    getBucketName() {
        return this._pluginConfig.containerName;
    }
    getLocalGlobPattern() {
        return this._pluginConfig.pattern;
    }
    getWorkingDirs() {
        return this._options.workingDirs;
    }
    uploadItem(key, item) {
        return new Promise((resolve, reject) => {
            fs_1.default.readFile(item.absPath, (err, content) => {
                if (err) {
                    return reject(err);
                }
                zlib_1.default.gzip(content, (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    const blobName = `${key}/${item.path}`;
                    const blockBlobClient = this._containerClient.getBlockBlobClient(blobName);
                    blockBlobClient
                        .upload(data, data.length, {
                        blobHTTPHeaders: {
                            blobContentType: item.mimeType,
                            blobContentEncoding: "gzip",
                        },
                    })
                        .then((response) => {
                        this.logger.verbose(`Uploaded from ${item.absPath} to ${key}/${item.path} (requestId=${response.requestId})`);
                        return resolve(item);
                    })
                        .catch((err) => {
                        reject(err);
                    });
                });
            });
        });
    }
    downloadItem(remoteItem, item) {
        const blobName = remoteItem.remotePath;
        const blockBlobClient = this._containerClient.getBlockBlobClient(blobName);
        return new Promise((resolve, reject) => {
            blockBlobClient
                .download(0)
                .then((response) => {
                mkdirp_1.default.sync(path_1.default.dirname(item.absPath));
                this._gunzipIfNeed(response, (_err, content) => {
                    fs_1.default.writeFile(item.absPath, content, (err) => {
                        if (err) {
                            return reject(err);
                        }
                        this.logger.verbose(`Downloaded from ${blobName} to ${item.absPath}`);
                        resolve(item);
                    });
                });
            })
                .catch((err) => {
                return reject(err);
            });
        });
    }
    listItems(_lastKey, prefix) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            var e_1, _a;
            let limit = 1000;
            const blobItems = [];
            try {
                try {
                    for (var _b = __asyncValues(this._containerClient.listBlobsFlat()), _c; _c = yield _b.next(), !_c.done;) {
                        const blob = _c.value;
                        blobItems.push(blob);
                        if (--limit < 0) {
                            break;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
            catch (err) {
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
        }));
    }
    _gunzipIfNeed(output, cb) {
        this._streamToBuffer(output.readableStreamBody).then((buffer) => {
            if (output.contentEncoding === "gzip") {
                zlib_1.default.gunzip(buffer, (err, content) => {
                    cb(err, content);
                });
            }
            else {
                cb(null, buffer);
            }
        });
    }
    _streamToBuffer(stream) {
        return new Promise((resolve, reject) => {
            if (!stream) {
                return reject();
            }
            const chunks = [];
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
exports.AzurePublisherPlugin = AzurePublisherPlugin;
//# sourceMappingURL=azure-publisher-plugin.js.map
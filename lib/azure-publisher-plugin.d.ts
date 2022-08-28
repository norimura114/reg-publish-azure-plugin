import { PublisherPlugin, PluginCreateOptions, WorkingDirectoryInfo, PublishResult } from "reg-suit-interface";
import { FileItem, RemoteFileItem, ObjectListResult, AbstractPublisher } from "reg-suit-util";
export interface PluginConfig {
    containerName: string;
    pattern?: string;
    pathPrefix?: string;
    customDomain?: string;
}
export declare class AzurePublisherPlugin extends AbstractPublisher implements PublisherPlugin<PluginConfig> {
    name: string;
    private _options;
    private _pluginConfig;
    private _absClient;
    private _containerClient;
    constructor();
    init(config: PluginCreateOptions<PluginConfig>): void;
    publish(key: string): Promise<PublishResult>;
    fetch(key: string): Promise<any>;
    protected getContainerDomain(): string;
    protected getBucketRootDir(): string | undefined;
    protected getBucketName(): string;
    protected getLocalGlobPattern(): string | undefined;
    protected getWorkingDirs(): WorkingDirectoryInfo;
    protected uploadItem(key: string, item: FileItem): Promise<FileItem>;
    protected downloadItem(remoteItem: RemoteFileItem, item: FileItem): Promise<FileItem>;
    protected listItems(_lastKey: string, prefix: string): Promise<ObjectListResult>;
    private _gunzipIfNeed;
    private _streamToBuffer;
}

import { PluginPreparer, PluginCreateOptions, PluginLogger, PreparerQuestions } from "reg-suit-interface";
import { PluginConfig } from "./azure-publisher-plugin";
export interface SetupInquireResult {
    createContainer: boolean;
    containerName?: string;
}
export declare class AzureBlobStorageContainerPreparer implements PluginPreparer<SetupInquireResult, PluginConfig> {
    _logger: PluginLogger;
    inquire(): PreparerQuestions;
    prepare(option: PluginCreateOptions<SetupInquireResult>): Promise<PluginConfig>;
    _createContainer(containerName: string): Promise<string>;
}

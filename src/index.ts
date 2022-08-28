import { PublisherPluginFactory } from "reg-suit-interface";
import { AzureBlobStorageContainerPreparer } from "./azure-blob-storage-container-prepare";
import { AzurePublisherPlugin } from "./azure-publisher-plugin";

const pluginFactory: PublisherPluginFactory = () => {
  return {
    preparer: new AzureBlobStorageContainerPreparer(),
    publisher: new AzurePublisherPlugin(),
  };
};

export = pluginFactory;

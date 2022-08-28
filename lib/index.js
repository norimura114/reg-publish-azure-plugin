"use strict";
const azure_blob_storage_container_prepare_1 = require("./azure-blob-storage-container-prepare");
const azure_publisher_plugin_1 = require("./azure-publisher-plugin");
const pluginFactory = () => {
    return {
        preparer: new azure_blob_storage_container_prepare_1.AzureBlobStorageContainerPreparer(),
        publisher: new azure_publisher_plugin_1.AzurePublisherPlugin(),
    };
};
module.exports = pluginFactory;
//# sourceMappingURL=index.js.map
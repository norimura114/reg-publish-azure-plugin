# reg-publish-azure-plugin

reg-suit plugin to fetch and publish snapshot image to Azure Blob Storage.

## Install

```sh
npm i reg-publish-azure-plugin -D
reg-suit prepare -p publish-azure
```

### Connection string

This plugin needs a connection string to access your Azure Blob Storage. To provide the connection string, create the following environment variable.

```sh
export AZURE_STORAGE_CONNECTION_STRING=<your-connection-string>
```

## Configure

```ts
{
  containerName: string;
}
```

- `containerName` - _Required_ - Azure Blob Storage container name to publish the snapshot images to.

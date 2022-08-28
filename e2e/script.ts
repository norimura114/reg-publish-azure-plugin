import { createLogger } from "reg-suit-util";
import { AzurePublisherPlugin } from "../lib/azure-publisher-plugin";
import { AzureBlobStorageContainerPreparer } from "../lib/azure-blob-storage-container-prepare";
import glob from "glob";
import assert from "assert";
import { BlobServiceClient } from "@azure/storage-blob";
import { AZURE_STORAGE_CONNECTION_STRING } from "../lib/config";

const preparer = new AzureBlobStorageContainerPreparer();

const logger = createLogger();
logger.setLevel("verbose");

const baseConf = {
  coreConfig: { actualDir: "", workingDir: "" },
  logger,
  noEmit: false,
};

const dirsA = {
  base: __dirname + "/../e2e/report-fixture",
  actualDir: __dirname + "/../e2e/report-fixture/dir_a",
  expectedDir: __dirname + "/../e2e/report-fixture/dir_b",
  diffDir: "",
};

const dirsB = {
  base: __dirname + "/../e2e/report-fixture-expected",
  actualDir: __dirname + "/../e2e/report-fixture-expected/dir_a",
  expectedDir: __dirname + "/../e2e/report-fixture-expected/dir_b",
  diffDir: "",
};

async function after(containerName: string) {
  const absClient = BlobServiceClient.fromConnectionString(
    AZURE_STORAGE_CONNECTION_STRING || ""
  );

  const containerClient = absClient.getContainerClient(containerName);

  for await (const blob of containerClient.listBlobsFlat()) {
    const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
    await blockBlobClient.delete();
  }
}

async function case1() {
  const { containerName } = await preparer.prepare({
    ...baseConf,
    options: { createContainer: true },
    workingDirs: dirsA,
  });
  const plugin = new AzurePublisherPlugin();

  plugin.init({
    ...baseConf,
    options: {
      containerName,
    },
    workingDirs: dirsA,
  });

  await plugin.publish("abcdef12345");

  plugin.init({
    ...baseConf,
    options: {
      containerName,
    },
    workingDirs: dirsB,
  });

  await plugin.fetch("abcdef12345");

  const list = glob.sync("dir_b/sample01.png", { cwd: dirsB.base });
  assert.equal(list[0], "dir_b/sample01.png");

  await after(containerName);
}

async function main() {
  try {
    await case1();
    console.log(" 🌟  Test was ended successfully! 🌟 ");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

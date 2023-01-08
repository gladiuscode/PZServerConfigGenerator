import dotenv from "dotenv";
dotenv.config();

import { getCollectionsDetails, getModsDetails } from "./api";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import {
  ModUsefullDetails,
  ModsInGameIds,
  RawModsInGameIds,
} from "./types/index.types";
import { existsSync } from "fs";

const collectionsIds = [
  process.env.QOL_COLLECTION_ID,
  process.env.VEHICLES_COLLECTION_ID,
  process.env.WEAPONS_COLLECTION_ID,
  process.env.MAPS_COLLECTION_ID,
  process.env.MISC_COLLECTION_ID,
] as string[];

const buildGetCollectionsDetailsRequestData = (modsIds: string[]) =>
  modsIds.reduce<GetCollectionsDetailsRequestSchema>(
    (requestData, currentModId, index) => {
      const key = `publishedfileids[${index}]`;
      const value = currentModId;
      return {
        ...requestData,
        [key]: value,
      };
    },
    { collectioncount: String(modsIds.length) }
  );

const cleanCollectionResponse = (
  collectionResponse: GetCollectionResponseSchema
) =>
  collectionResponse.response.collectiondetails.flatMap((collectionDetails) =>
    collectionDetails.children.map((item) => item.publishedfileid)
  );

const buildGetModsDetailsRequestData = (modsIds: string[]) =>
  modsIds.reduce<GetModsDetailsRequestSchema>(
    (requestData, currentModId, index) => {
      const key = `publishedfileids[${index}]`;
      const value = currentModId;
      return {
        ...requestData,
        [key]: value,
      };
    },
    { itemcount: String(modsIds.length) }
  );

const cleanModsResponse = (modsResponse: GetModsDetailResponseSchema) =>
  modsResponse.response.publishedfiledetails.reduce<ModUsefullDetails[]>(
    (modsDescriptions, modDetail) => {
      const description = modDetail.description;
      const id = modDetail.publishedfileid;

      if (!description) {
        console.log("Mod has no description: ", id);
        return modsDescriptions;
      }

      const modDescription = {
        id,
        description,
      };

      return [...modsDescriptions, modDescription];
    },
    []
  );

const getRawModsInGameIds = (modUsefullDetails: ModUsefullDetails[]) => {
  const matchWorkshopIdRegex = new RegExp(/(?:Workshop ID).*(\d)/, "g");
  const matchModIdRegex = new RegExp(/(?:Mod ID).*(\w)/, "g");
  const matchMapIdRegex = new RegExp(/(?:Map Folder).*(\w)/, "g");

  return modUsefullDetails.reduce<RawModsInGameIds[]>(
    (modsInGameIds, modUsefullDetails) => {
      const workshopIdsMatches =
        modUsefullDetails.description.match(matchWorkshopIdRegex);
      const modIdsMatches =
        modUsefullDetails.description.match(matchModIdRegex);
      const mapIdsMatches =
        modUsefullDetails.description.match(matchMapIdRegex);

      const modWorkshopId = {
        ...modUsefullDetails,
        workshopIds: workshopIdsMatches ?? [],
        modIds: modIdsMatches ?? [],
        mapIds: mapIdsMatches ?? [],
      };

      return [...modsInGameIds, modWorkshopId];
    },
    []
  );
};

const getModsInGameIds = (rawModsInGameIds: RawModsInGameIds[]) => {
  const cleanId = (id: string) => {
    const separatorIndex = id.indexOf(":");
    return id.slice(separatorIndex + 1).trim();
  };

  const extractUniqueFrom = (array: string[]) => Array.from(new Set(array));

  return rawModsInGameIds.map<ModsInGameIds>((modInGameIds) => {
    const rawWorkshopIds = modInGameIds.workshopIds.map(cleanId);
    const rawModIds = modInGameIds.modIds.map(cleanId);
    const rawMapIds = modInGameIds.mapIds.map(cleanId);

    const workshopIds = extractUniqueFrom(rawWorkshopIds);
    const modIds = extractUniqueFrom(rawModIds);
    const mapIds = extractUniqueFrom(rawMapIds);

    return {
      id: modInGameIds.id,
      workshopIds,
      modIds,
      mapIds,
    };
  });
};

const createOutput = (modsInGameIds: ModsInGameIds[]) => {
  const sanitizeEntry = (entry: string) =>
    entry.endsWith(";") ? entry : `${entry};`;

  const initialValue = {
    "WorkshopItems:": "",
    "Mods:": "",
    "Maps:": "",
  };

  const configs = modsInGameIds.reduce((configEntry, modInGameIds, index) => {
    const workshopItems = `${
      configEntry["WorkshopItems:"]
    }${modInGameIds.workshopIds.join(";")}`;
    const mods = `${configEntry["Mods:"]}${modInGameIds.modIds.join(";")}`;
    const maps = `${configEntry["Maps:"]}${modInGameIds.mapIds.join(";")}`;

    const baseConfigEntry = {
      "WorkshopItems:": sanitizeEntry(workshopItems),
      "Mods:": sanitizeEntry(mods),
    };

    if (index === modsInGameIds.length - 1) {
      return {
        ...baseConfigEntry,
        "Maps:": sanitizeEntry(`${maps}Muldraugh, KY`),
      };
    }

    return {
      ...baseConfigEntry,
      "Maps:": sanitizeEntry(maps),
    };
  }, initialValue);

  const configKeys = Object.keys(configs) as Array<keyof typeof configs>;
  return configKeys.reduce((config, key, index) => {
    const entry = `${key}${configs[key]}`;
    if (!index) {
      return `${config}${entry}`;
    }
    return `${config}\n${entry}`;
  }, "");
};

const writeOutput = async (output: string) => {
  const filePath = path.join(process.cwd(), "data", "config.txt");

  const dataFolder = path.dirname(filePath);

  const doesExist = existsSync(dataFolder);
  if (!doesExist) {
    await mkdir(dataFolder);
  }

  await writeFile(filePath, output, {
    encoding: "utf-8",
  });
};

const main = async () => {
  const getCollectionsDetailsRequestData =
    buildGetCollectionsDetailsRequestData(collectionsIds);

  const collectionsResponses = await getCollectionsDetails(
    getCollectionsDetailsRequestData
  );

  const modsIds = cleanCollectionResponse(collectionsResponses);

  const getModsDetailsRequestData = buildGetModsDetailsRequestData(modsIds);

  const modsResponse = await getModsDetails(getModsDetailsRequestData);

  const modUsefullDetails = cleanModsResponse(modsResponse);

  const rawModsInGameIds = getRawModsInGameIds(modUsefullDetails);

  const modsInGameIds = getModsInGameIds(rawModsInGameIds);

  const output = createOutput(modsInGameIds);

  writeOutput(output);
};

main();

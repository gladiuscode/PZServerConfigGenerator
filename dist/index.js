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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const api_1 = require("./api");
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const collectionsIds = [
    process.env.QOL_COLLECTION_ID,
    process.env.VEHICLES_COLLECTION_ID,
    process.env.WEAPONS_COLLECTION_ID,
    process.env.MAPS_COLLECTION_ID,
    process.env.MISC_COLLECTION_ID,
];
const buildGetCollectionsDetailsRequestData = (modsIds) => modsIds.reduce((requestData, currentModId, index) => {
    const key = `publishedfileids[${index}]`;
    const value = currentModId;
    return Object.assign(Object.assign({}, requestData), { [key]: value });
}, { collectioncount: String(modsIds.length) });
const cleanCollectionResponse = (collectionResponse) => collectionResponse.response.collectiondetails.flatMap((collectionDetails) => collectionDetails.children.map((item) => item.publishedfileid));
const buildGetModsDetailsRequestData = (modsIds) => modsIds.reduce((requestData, currentModId, index) => {
    const key = `publishedfileids[${index}]`;
    const value = currentModId;
    return Object.assign(Object.assign({}, requestData), { [key]: value });
}, { itemcount: String(modsIds.length) });
const cleanModsResponse = (modsResponse) => modsResponse.response.publishedfiledetails.reduce((modsDescriptions, modDetail) => {
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
}, []);
const getRawModsInGameIds = (modUsefullDetails) => {
    const matchWorkshopIdRegex = new RegExp(/(?:Workshop ID).*(\d)/, "g");
    const matchModIdRegex = new RegExp(/(?:Mod ID).*(\w)/, "g");
    const matchMapIdRegex = new RegExp(/(?:Map Folder).*(\w)/, "g");
    return modUsefullDetails.reduce((modsInGameIds, modUsefullDetails) => {
        const workshopIdsMatches = modUsefullDetails.description.match(matchWorkshopIdRegex);
        const modIdsMatches = modUsefullDetails.description.match(matchModIdRegex);
        const mapIdsMatches = modUsefullDetails.description.match(matchMapIdRegex);
        const modWorkshopId = Object.assign(Object.assign({}, modUsefullDetails), { workshopIds: workshopIdsMatches !== null && workshopIdsMatches !== void 0 ? workshopIdsMatches : [], modIds: modIdsMatches !== null && modIdsMatches !== void 0 ? modIdsMatches : [], mapIds: mapIdsMatches !== null && mapIdsMatches !== void 0 ? mapIdsMatches : [] });
        return [...modsInGameIds, modWorkshopId];
    }, []);
};
const getModsInGameIds = (rawModsInGameIds) => {
    const cleanId = (id) => {
        const separatorIndex = id.indexOf(":");
        return id.slice(separatorIndex + 1).trim();
    };
    const extractUniqueFrom = (array) => Array.from(new Set(array));
    return rawModsInGameIds.map((modInGameIds) => {
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
const createOutput = (modsInGameIds) => {
    const sanitizeEntry = (entry) => entry.endsWith(";") ? entry : `${entry};`;
    const initialValue = {
        "WorkshopItems:": "",
        "Mods:": "",
        "Maps:": "",
    };
    const configs = modsInGameIds.reduce((configEntry, modInGameIds, index) => {
        const workshopItems = `${configEntry["WorkshopItems:"]}${modInGameIds.workshopIds.join(";")}`;
        const mods = `${configEntry["Mods:"]}${modInGameIds.modIds.join(";")}`;
        const maps = `${configEntry["Maps:"]}${modInGameIds.mapIds.join(";")}`;
        const baseConfigEntry = {
            "WorkshopItems:": sanitizeEntry(workshopItems),
            "Mods:": sanitizeEntry(mods),
        };
        if (index === modsInGameIds.length - 1) {
            return Object.assign(Object.assign({}, baseConfigEntry), { "Maps:": sanitizeEntry(`${maps}Muldraugh, KY`) });
        }
        return Object.assign(Object.assign({}, baseConfigEntry), { "Maps:": sanitizeEntry(maps) });
    }, initialValue);
    const configKeys = Object.keys(configs);
    return configKeys.reduce((config, key, index) => {
        const entry = `${key}${configs[key]}`;
        if (!index) {
            return `${config}${entry}`;
        }
        return `${config}\n${entry}`;
    }, "");
};
const writeOutput = (output) => __awaiter(void 0, void 0, void 0, function* () {
    const filePath = path_1.default.join(process.cwd(), "data", "config.txt");
    const dataFolder = path_1.default.dirname(filePath);
    const doesExist = (0, fs_1.existsSync)(dataFolder);
    if (!doesExist) {
        yield (0, promises_1.mkdir)(dataFolder);
    }
    yield (0, promises_1.writeFile)(filePath, output, {
        encoding: "utf-8",
    });
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const getCollectionsDetailsRequestData = buildGetCollectionsDetailsRequestData(collectionsIds);
    const collectionsResponses = yield (0, api_1.getCollectionsDetails)(getCollectionsDetailsRequestData);
    const modsIds = cleanCollectionResponse(collectionsResponses);
    const getModsDetailsRequestData = buildGetModsDetailsRequestData(modsIds);
    const modsResponse = yield (0, api_1.getModsDetails)(getModsDetailsRequestData);
    const modUsefullDetails = cleanModsResponse(modsResponse);
    const rawModsInGameIds = getRawModsInGameIds(modUsefullDetails);
    const modsInGameIds = getModsInGameIds(rawModsInGameIds);
    const output = createOutput(modsInGameIds);
    writeOutput(output);
});
main();

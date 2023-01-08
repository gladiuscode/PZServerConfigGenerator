import axios from "axios";

export const getModsDetails = async (data: GetModsDetailsRequestSchema) => {
  const response = await axios<GetModsDetailResponseSchema>({
    url: "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data,
  });
  return response.data;
};

export const getCollectionsDetails = async (
  data: GetCollectionsDetailsRequestSchema
) => {
  const response = await axios<GetCollectionResponseSchema>({
    url: "https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data,
  });
  return response.data;
};

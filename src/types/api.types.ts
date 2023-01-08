// ** REQUESTS ** //
interface GetCollectionsDetailsRequestSchema {
  readonly collectioncount: string;
  readonly [key: string]: string;
}

interface GetModsDetailsRequestSchema {
  readonly itemcount: string;
  readonly [key: string]: string;
}

// ** RESPONSES ** //
interface GetCollectionResponseSchema {
  readonly response: {
    readonly collectiondetails: {
      readonly children: [
        {
          readonly publishedfileid: string;
        }
      ];
    }[];
  };
}

interface GetModsDetailResponseSchema {
  readonly response: {
    readonly publishedfiledetails: {
      readonly description?: string;
      readonly publishedfileid: string;
    }[];
  };
}

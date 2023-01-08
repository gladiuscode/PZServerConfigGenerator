export interface ModUsefullDetails {
  readonly id: string;
  readonly description: string;
}

export interface RawModsInGameIds extends ModUsefullDetails {
  readonly workshopIds: string[];
  readonly modIds: string[];
  readonly mapIds: string[];
}

export type ModsInGameIds = Omit<RawModsInGameIds, "description">;

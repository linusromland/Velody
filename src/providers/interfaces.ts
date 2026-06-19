import type { ExtractionResult, Track } from "../core/types";

export interface SearchProvider {
    search(query: string): Promise<Track[]>;
    getByUrl(url: string): Promise<Track | null>;
    getPlaylistByUrl(url: string, maxItems: number): Promise<Track[] | null>;
}

export interface AudioExtractionProvider {
    extract(track: Track): Promise<ExtractionResult>;
    downloadToCache(track: Track, cacheDir: string): Promise<string>;
}

export interface MusicProviders {
    searchProvider: SearchProvider;
    extractionProvider: AudioExtractionProvider;
}

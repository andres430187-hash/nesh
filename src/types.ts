export type NeshContentType = 'live' | 'vod' | 'series';

export interface NeshUser {
  username: string;
  password?: string;
  serverUrl?: string;
  status: string;
  expiryDate?: string;
  isTrial?: boolean;
  maxConnections?: string | number;
  activeCons?: string | number;
  createdAt?: string;
  serverTime?: string;
  timezone?: string;
  isDemo?: boolean;
  role?: 'admin' | 'user';
  token?: string;
  name?: string;
}

export interface ManagedUser {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  expiryDate: string;
  createdAt?: string;
  notes?: string;
}

export interface UpstreamSettings {
  serverUrl: string;
  username: string;
  password: string;
}

export interface NeshCategory {
  category_id: string;
  category_name: string;
  parent_id?: number | string;
  type: NeshContentType;
}

export interface NeshLiveStream {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: string | number;
  stream_icon?: string;
  epg_channel_id?: string;
  category_id?: string;
  custom_sid?: string;
  direct_source?: string;
}

export interface NeshVodStream {
  num?: number;
  name: string;
  stream_type?: string;
  stream_id: string | number;
  stream_icon?: string;
  rating?: string | number;
  rating_5based?: number;
  added?: string;
  category_id?: string;
  container_extension?: string;
  custom_sid?: string;
  direct_source?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  release_date?: string;
  duration_secs?: number;
  duration?: string;
  backdrop_path?: string[];
}

export interface NeshSeries {
  num?: number;
  name: string;
  series_id: string | number;
  cover?: string;
  plot?: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  last_modified?: string;
  rating?: string | number;
  category_id?: string;
  backdrop_path?: string[];
}

export interface NeshEpisode {
  id: string | number;
  episode_num: number;
  season?: number;
  title: string;
  container_extension?: string;
  info?: {
    plot?: string;
    duration_secs?: number;
    duration?: string;
    movie_image?: string;
    releasedate?: string;
    bitrate?: number;
  };
}

export interface NeshSeriesDetails {
  info: {
    name?: string;
    cover?: string;
    plot?: string;
    cast?: string;
    director?: string;
    genre?: string;
    releaseDate?: string;
    rating?: string | number;
    backdrop_path?: string[];
  };
  episodes: Record<string, NeshEpisode[]>; // season key "1", "2" -> list of episodes
}

export interface NeshActiveStream {
  id: string | number;
  type: NeshContentType;
  title: string;
  subTitle?: string;
  streamUrl: string;
  proxyStreamUrl?: string;
  icon?: string;
  categoryName?: string;
  extension?: string;
  rawItem?: any;
}

export interface SavedAccount {
  id: string;
  serverUrl: string;
  username: string;
  label?: string;
  lastUsed: number;
}

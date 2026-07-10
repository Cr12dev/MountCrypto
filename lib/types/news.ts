export type NewsThumbnail = {
  url: string;
  width: number;
  height: number;
  tag: string;
};

export type NewsArticle = {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: string;
  type: string;
  thumbnail: NewsThumbnail | null;
  relatedTickers: string[];
};
